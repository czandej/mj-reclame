import tls from "node:tls";

const DEFAULT_SITE_URL = "https://www.reclamemj.nl";
const LOGO_PATH = "/assets/logo-mj-reclame.png";
const MAX_ATTACHMENTS = 5;
const MAX_TOTAL_ATTACHMENT_BYTES = 7 * 1024 * 1024;

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(value = "") {
  return esc(value).replace(/\r?\n/g, "<br>");
}

function pick(data, names) {
  for (const name of names) {
    if (data && data[name] !== undefined && data[name] !== null && String(data[name]).trim() !== "") {
      return String(data[name]).trim();
    }
  }
  return "";
}

function isDutch(data) {
  const lang = pick(data, ["language", "lang", "taal"]).toLowerCase();
  const msg = pick(data, ["message", "wiadomosc", "bericht"]).toLowerCase();
  return lang === "nl" || msg.includes("graag ontvang ik") || msg.includes("offerte");
}

function parseEmailAddress(value = "") {
  const match = String(value).match(/<([^>]+)>/);
  const email = (match ? match[1] : value).trim();
  return email || "";
}

function isEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function formatHeaderValue(value = "") {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value = "") {
  return `=?UTF-8?B?${Buffer.from(String(value), "utf8").toString("base64")}?=`;
}

function dotStuff(value = "") {
  return String(value).replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function wrapBase64(value = "") {
  return String(value).replace(/.{1,76}/g, "$&\r\n").trim();
}

function sanitizeFilename(value = "plik") {
  const clean = String(value || "plik").replace(/[\r\n\\/<>:"|?*]+/g, "_").slice(0, 120);
  return clean || "plik";
}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || `MJ Reclame <${user || ""}>`;
  const defaultReplyTo = process.env.MAIL_REPLY_TO || user || "info@reclamemj.nl";

  if (!host || !user || !pass) {
    throw new Error("Brak SMTP_HOST, SMTP_USER lub SMTP_PASS w Netlify Environment variables.");
  }

  return {
    host,
    port,
    user,
    pass,
    from,
    fromEmail: parseEmailAddress(from) || user,
    defaultReplyTo,
  };
}

function smtpRead(socket, expectedCodes = []) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`SMTP timeout. Ostatnia odpowiedź: ${buffer}`));
    }, 20000);

    function cleanup() {
      clearTimeout(timeout);
      socket.off("data", onData);
      socket.off("error", onError);
    }

    function onError(err) {
      cleanup();
      reject(err);
    }

    function onData(chunk) {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || "";
      if (/^\d{3} /.test(last)) {
        cleanup();
        const code = Number(last.slice(0, 3));
        if (expectedCodes.length && !expectedCodes.includes(code)) {
          reject(new Error(`SMTP odpowiedział kodem ${code}: ${buffer}`));
        } else {
          resolve(buffer);
        }
      }
    }

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

function buildMimeMessage({ from, to, replyTo, subject, html, text, attachments = [] }) {
  const now = new Date().toUTCString();
  const mixed = `mj-mixed-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const alt = `mj-alt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const headers = [
    `From: ${formatHeaderValue(from)}`,
    `To: ${formatHeaderValue(to)}`,
    `Reply-To: ${formatHeaderValue(replyTo)}`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${now}`,
    `MIME-Version: 1.0`,
  ];

  if (!attachments.length) {
    return [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${alt}"`,
      "",
      `--${alt}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      "",
      text,
      "",
      `--${alt}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      "",
      html,
      "",
      `--${alt}--`,
    ].join("\r\n");
  }

  const parts = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    "",
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    "",
    `--${alt}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    "",
    text,
    "",
    `--${alt}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    "",
    html,
    "",
    `--${alt}--`,
  ];

  attachments.forEach((file) => {
    const filename = sanitizeFilename(file.filename || file.name || "plik");
    const type = file.contentType || "application/octet-stream";
    parts.push(
      "",
      `--${mixed}`,
      `Content-Type: ${type}; name="${filename}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      wrapBase64(file.content.toString("base64"))
    );
  });

  parts.push("", `--${mixed}--`);
  return parts.join("\r\n");
}

async function smtpSendRawMail({ to, replyTo, subject, html, text, attachments = [] }) {
  const cfg = smtpConfig();
  if (!isEmail(to)) throw new Error(`Nieprawidłowy adres odbiorcy: ${to}`);

  const socket = tls.connect({
    host: cfg.host,
    port: cfg.port,
    servername: cfg.host,
    rejectUnauthorized: String(process.env.SMTP_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false",
  });

  function write(line) { socket.write(line + "\r\n"); }

  await smtpRead(socket, [220]);
  write(`EHLO ${process.env.SMTP_EHLO || "reclamemj.nl"}`);
  await smtpRead(socket, [250]);

  write("AUTH LOGIN");
  await smtpRead(socket, [334]);
  write(Buffer.from(cfg.user, "utf8").toString("base64"));
  await smtpRead(socket, [334]);
  write(Buffer.from(cfg.pass, "utf8").toString("base64"));
  await smtpRead(socket, [235]);

  write(`MAIL FROM:<${cfg.fromEmail}>`);
  await smtpRead(socket, [250]);
  write(`RCPT TO:<${to}>`);
  await smtpRead(socket, [250, 251]);
  write("DATA");
  await smtpRead(socket, [354]);

  const message = buildMimeMessage({
    from: cfg.from,
    to,
    replyTo: replyTo || cfg.defaultReplyTo,
    subject,
    html,
    text,
    attachments,
  });

  socket.write(dotStuff(message) + "\r\n.\r\n");
  await smtpRead(socket, [250]);

  write("QUIT");
  try { await smtpRead(socket, [221]); } catch (_) {}
  socket.end();
}

function splitBuffer(buffer, separator) {
  const parts = [];
  let start = 0;
  let index;
  while ((index = buffer.indexOf(separator, start)) !== -1) {
    parts.push(buffer.slice(start, index));
    start = index + separator.length;
  }
  parts.push(buffer.slice(start));
  return parts;
}

function parseContentDisposition(value = "") {
  const out = {};
  for (const part of String(value).split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rest.length) continue;
    const key = rawKey.toLowerCase();
    let val = rest.join("=").trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

function parseUrlEncoded(bodyBuffer) {
  const params = new URLSearchParams(bodyBuffer.toString("utf8"));
  const fields = {};
  for (const [key, value] of params.entries()) fields[key] = value;
  return { fields, files: [] };
}

function parseMultipart(bodyBuffer, contentType = "") {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) throw new Error("Brak boundary w multipart/form-data.");
  const boundary = Buffer.from("--" + (match[1] || match[2]));
  const rawParts = splitBuffer(bodyBuffer, boundary).slice(1, -1);
  const fields = {};
  const files = [];

  rawParts.forEach((raw) => {
    let part = raw;
    if (part.slice(0, 2).toString() === "\r\n") part = part.slice(2);
    if (part.slice(-2).toString() === "\r\n") part = part.slice(0, -2);

    const sep = Buffer.from("\r\n\r\n");
    const headerEnd = part.indexOf(sep);
    if (headerEnd === -1) return;

    const headerText = part.slice(0, headerEnd).toString("utf8");
    const content = part.slice(headerEnd + sep.length);
    const headers = {};
    headerText.split(/\r\n/).forEach((line) => {
      const i = line.indexOf(":");
      if (i === -1) return;
      headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    });

    const disposition = parseContentDisposition(headers["content-disposition"] || "");
    const name = disposition.name;
    if (!name) return;

    if (disposition.filename) {
      if (content.length > 0) {
        files.push({
          fieldName: name,
          filename: sanitizeFilename(disposition.filename),
          contentType: headers["content-type"] || "application/octet-stream",
          content,
        });
      }
    } else {
      fields[name] = content.toString("utf8");
    }
  });

  return { fields, files };
}

function parseRequest(event) {
  const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
  const bodyBuffer = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
  if (contentType.toLowerCase().includes("multipart/form-data")) return parseMultipart(bodyBuffer, contentType);
  if (contentType.toLowerCase().includes("application/x-www-form-urlencoded")) return parseUrlEncoded(bodyBuffer);
  try {
    const parsed = JSON.parse(bodyBuffer.toString("utf8") || "{}");
    return { fields: parsed, files: [] };
  } catch (_) {
    return parseUrlEncoded(bodyBuffer);
  }
}

function buildSummaryText(data) {
  const lines = [];
  const keys = [
    ["Imię / firma", pick(data, ["name", "naam"])],
    ["E-mail", pick(data, ["email"])],
    ["Telefon", pick(data, ["phone"])],
    ["Usługa", pick(data, ["service"])],
    ["Ilość / nakład", pick(data, ["quantity"])],
    ["Termin", pick(data, ["deadline"])],
    ["Kod produktu", pick(data, ["product_code"])],
    ["Rozmiar", pick(data, ["product_size"])],
    ["Kolor", pick(data, ["product_color"])],
    ["Ilość produktu", pick(data, ["product_quantity"])],
  ];
  keys.forEach(([k, v]) => { if (v) lines.push(`${k}: ${v}`); });
  const msg = pick(data, ["message", "wiadomosc", "bericht"]);
  if (msg) lines.push("", "Wiadomość:", msg);
  return lines.join("\n");
}

function makeCustomerHtml(data) {
  const lang = isDutch(data) ? "nl" : "pl";
  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
  const logoUrl = `${siteUrl}${LOGO_PATH}`;
  const name = pick(data, ["name", "naam"]) || "Kliencie";
  const summary = buildSummaryText(data);
  const title = lang === "nl" ? "Bedankt voor je aanvraag" : "Dziękujemy za zapytanie";
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title>
  <style>body{margin:0;background:#0b100d;font-family:Arial,Helvetica,sans-serif;color:#dce6df}.wrapper{background:radial-gradient(circle at 15% 0%,rgba(71,223,0,.22),transparent 32%),#0b100d;padding:28px 0}.mail{max-width:720px;margin:auto;background:#111815;border:1px solid rgba(71,223,0,.34);border-radius:24px;overflow:hidden}.header{padding:28px 30px;background:linear-gradient(135deg,#071009,#15211a);border-bottom:4px solid #47df00}.logo{max-width:190px;height:auto;margin-bottom:20px}.kicker{color:#47df00;text-transform:uppercase;font-weight:900;letter-spacing:.14em;font-size:12px}h1{margin:0;color:#fff;font-size:34px;text-transform:uppercase}.content{padding:28px 30px}.lead{font-size:17px;line-height:1.6;color:#eaf2ee}.box{margin:22px 0;padding:20px;border-radius:18px;background:#0d130f;border:1px solid rgba(255,255,255,.12)}.box h2{margin:0 0 14px;color:#47df00;font-size:18px;text-transform:uppercase}.summary{white-space:pre-wrap;line-height:1.6}.pill{display:inline-block;margin-top:8px;padding:9px 13px;border-radius:999px;background:rgba(71,223,0,.13);border:1px solid rgba(71,223,0,.32);color:#dff5d7;font-weight:700}.footer{padding:20px 30px;background:#090d0b;color:#aebbb5;font-size:13px}</style></head><body><div class="wrapper"><div class="mail"><div class="header"><img class="logo" src="${esc(logoUrl)}" alt="MJ Reclame"><p class="kicker">MJ Reclame / DTF</p><h1>${esc(title)}</h1></div><div class="content"><p class="lead">Dzień dobry, ${esc(name)}.</p><p class="lead">Otrzymaliśmy Twoje zapytanie dotyczące odzieży z nadrukiem DTF. Przygotujemy wycenę po sprawdzeniu modelu, ilości, kolorów, rozmiarów oraz przesłanej grafiki.</p><div class="box"><h2>Podsumowanie zapytania</h2><div class="summary">${esc(summary)}</div></div><div class="box"><h2>Grafika do druku DTF</h2><p class="lead" style="font-size:15px">Jeśli do formularza dodano logo, projekt lub plik graficzny, uwzględnimy go przy wycenie DTF.</p><span class="pill">DTF / Direct To Film</span></div><p class="lead">W razie potrzeby skontaktujemy się, aby doprecyzować plik, format grafiki, umiejscowienie nadruku albo termin realizacji.</p></div><div class="footer"><strong>MJ Reclame</strong><br>Ta wiadomość została wysłana automatycznie jako potwierdzenie otrzymania formularza.<br>${esc(siteUrl)}</div></div></div></body></html>`;
}

function makeCustomerText(data) {
  const name = pick(data, ["name", "naam"]) || "Kliencie";
  return [`Dzień dobry, ${name}.`, "", "Dziękujemy za zapytanie dotyczące odzieży z nadrukiem DTF.", "Przygotujemy wycenę po sprawdzeniu produktu, rozmiarów, kolorów, ilości oraz przesłanej grafiki.", "", "Podsumowanie zapytania:", "", buildSummaryText(data), "", "MJ Reclame"].join("\n");
}

function makeOwnerHtml(data, files) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif"><h2>Nowe zapytanie DTF — MJ Reclame</h2><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${esc(buildSummaryText(data))}</pre><p>Załączniki: ${files.length}</p></body></html>`;
}

function makeOwnerText(data, files) {
  return [`Nowe zapytanie DTF — MJ Reclame`, "", buildSummaryText(data), "", `Załączniki: ${files.length}`].join("\n");
}

function response(statusCode, body, headers = {}) {
  return { statusCode, headers: { "Content-Type": "text/plain; charset=utf-8", ...headers }, body };
}

function redirect(location) {
  return { statusCode: 303, headers: { Location: location, "Cache-Control": "no-store" }, body: "" };
}

export const handler = async (event) => {
  if (event.httpMethod === "GET") return response(200, "MJ Reclame contact function is active.");
  if (event.httpMethod !== "POST") return response(405, "Method not allowed", { Allow: "POST" });

  try {
    const { fields, files } = parseRequest(event);
    const lang = pick(fields, ["language"]) || (event.queryStringParameters?.lang || "pl");
    const success = lang === "nl" ? "/nl/dziekujemy" : "/pl/dziekujemy";

    if (pick(fields, ["bot-field"])) {
      console.log("MJ contact-dtf: honeypot filled, silently redirecting.");
      return redirect(success);
    }

    const email = pick(fields, ["email"]);
    if (!isEmail(email)) return response(400, "Brak prawidłowego adresu e-mail.");

    const totalBytes = files.reduce((sum, f) => sum + f.content.length, 0);
    if (files.length > MAX_ATTACHMENTS) return response(400, "Zbyt wiele załączników.");
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) return response(413, "Załączniki są zbyt duże. Wklej link do plików w wiadomości.");

    const owner = process.env.OWNER_EMAIL || process.env.MAIL_REPLY_TO || process.env.SMTP_USER;
    console.log(`MJ contact-dtf: received email=${email} files=${files.length} bytes=${totalBytes}`);

    await smtpSendRawMail({
      to: owner,
      replyTo: email,
      subject: "MJ Reclame — nowe zapytanie DTF",
      html: makeOwnerHtml(fields, files),
      text: makeOwnerText(fields, files),
      attachments: files,
    });

    await smtpSendRawMail({
      to: email,
      replyTo: process.env.MAIL_REPLY_TO || process.env.SMTP_USER,
      subject: "MJ Reclame — potwierdzenie zapytania DTF",
      html: makeCustomerHtml(fields),
      text: makeCustomerText(fields),
      attachments: [],
    });

    console.log(`MJ contact-dtf: sent owner and customer emails for ${email}`);
    return redirect(success);
  } catch (err) {
    console.error("MJ contact-dtf error:", err);
    return response(500, `Nie udało się wysłać formularza: ${err.message || err}`);
  }
};
