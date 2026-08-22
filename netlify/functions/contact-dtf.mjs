import tls from "node:tls";
import crypto from "node:crypto";

const COMPANY = "MJ Reclame";
const DEFAULT_TO = "info@reclamemj.nl";

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sanitizeHeader(value = "") {
  return String(value)
    .replace(/[\r\n]+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 180);
}

function sanitizeText(value = "") {
  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .slice(0, 12000);
}

function parseMultipart(body, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return { fields: {}, files: [] };

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const rawParts = body.split(`--${boundary}`);
  const fields = {};
  const files = [];

  for (const raw of rawParts) {
    if (!raw || raw === "--\r\n" || raw === "--") continue;
    const cleaned = raw.replace(/^\r?\n/, "").replace(/\r?\n--$/, "");
    const splitIndex = cleaned.indexOf("\r\n\r\n");
    if (splitIndex === -1) continue;

    const headerText = cleaned.slice(0, splitIndex);
    let value = cleaned.slice(splitIndex + 4);
    value = value.replace(/\r?\n$/, "");

    const nameMatch = headerText.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    const filenameMatch = headerText.match(/filename="([^"]*)"/i);
    const contentTypeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);

    if (filenameMatch && filenameMatch[1]) {
      files.push({
        field: name,
        filename: sanitizeHeader(filenameMatch[1]),
        contentType: sanitizeHeader(contentTypeMatch ? contentTypeMatch[1] : "application/octet-stream"),
        content: Buffer.from(value, "binary"),
      });
    } else {
      fields[name] = value;
    }
  }

  return { fields, files };
}

function parseUrlEncoded(body) {
  const params = new URLSearchParams(body);
  const fields = {};
  for (const [key, value] of params.entries()) fields[key] = value;
  return { fields, files: [] };
}

function parseRequest(event) {
  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("binary")
    : (event.body || "");

  if (contentType.includes("multipart/form-data")) {
    return parseMultipart(rawBody, contentType);
  }

  return parseUrlEncoded(rawBody);
}

function getField(fields, names, fallback = "") {
  for (const name of names) {
    if (fields[name] !== undefined && fields[name] !== null && String(fields[name]).trim() !== "") {
      return String(fields[name]).trim();
    }
  }
  return fallback;
}

function textToHtml(text) {
  return esc(text).replace(/\n/g, "<br>");
}

function buildClientPlain(fields) {
  const name = getField(fields, ["name", "naam", "imie"], "Kliencie");
  const message = sanitizeText(getField(fields, ["message", "wiadomosc", "bericht"]));

  const lines = [];
  lines.push(`Dzień dobry, ${name}.`);
  lines.push("");
  lines.push("Dziękujemy za przesłanie zapytania do MJ Reclame.");
  lines.push("Otrzymaliśmy zapytanie dotyczące odzieży z nadrukiem DTF.");
  lines.push("");
  lines.push("Podsumowanie zapytania:");
  lines.push("");
  if (message) {
    lines.push(message);
  } else {
    lines.push("Zapytanie zostało przyjęte do wyceny.");
  }
  lines.push("");
  lines.push("Jeżeli do formularza dołączono pliki graficzne, uwzględnimy je przy przygotowaniu wyceny.");
  lines.push("");
  lines.push("MJ Reclame");
  lines.push("info@reclamemj.nl");

  return sanitizeText(lines.join("\n"));
}

function buildClientHtml(fields) {
  const text = buildClientPlain(fields);
  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Potwierdzenie zapytania MJ Reclame</title>
</head>
<body style="margin:0;padding:0;background:#0b100d;font-family:Arial,Helvetica,sans-serif;color:#eaf2ee;">
  <div style="width:100%;background:#0b100d;padding:24px 0;">
    <div style="max-width:680px;margin:0 auto;background:#111815;border:1px solid #2a6d19;border-radius:18px;overflow:hidden;">
      <div style="padding:24px 26px;background:#071009;border-bottom:4px solid #47df00;">
        <div style="font-size:13px;font-weight:700;color:#47df00;letter-spacing:.08em;text-transform:uppercase;">MJ Reclame / DTF</div>
        <h1 style="margin:8px 0 0;font-size:28px;line-height:1.1;color:#ffffff;">Dziękujemy za zapytanie</h1>
      </div>
      <div style="padding:24px 26px;font-size:16px;line-height:1.6;">
        ${textToHtml(text)}
      </div>
      <div style="padding:16px 26px;background:#090d0b;color:#b9c8bf;font-size:13px;line-height:1.5;">
        Ta wiadomość została wysłana automatycznie jako potwierdzenie otrzymania formularza.<br>
        MJ Reclame — info@reclamemj.nl
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildOwnerPlain(fields, files) {
  const lines = [];
  lines.push("Nowe zapytanie z formularza MJ Reclame");
  lines.push("");
  lines.push(`Imię/nazwa: ${getField(fields, ["name", "naam"], "-")}`);
  lines.push(`Email: ${getField(fields, ["email"], "-")}`);
  lines.push(`Telefon: ${getField(fields, ["phone"], "-")}`);
  lines.push(`Usługa: ${getField(fields, ["service"], "-")}`);
  lines.push(`Ilość/nakład: ${getField(fields, ["quantity"], "-")}`);
  lines.push(`Termin: ${getField(fields, ["deadline"], "-")}`);
  lines.push("");
  lines.push("Wiadomość:");
  lines.push(sanitizeText(getField(fields, ["message"], "-")));
  lines.push("");
  lines.push(`Liczba załączników: ${files.length}`);
  for (const file of files) {
    lines.push(`- ${file.filename} (${file.contentType}, ${file.content.length} B)`);
  }
  lines.push("");
  lines.push("Źródło: formularz kontaktowy MJ Reclame");
  return sanitizeText(lines.join("\n"));
}

function quotedPrintable(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function formatAddress(label, email) {
  const safeLabel = sanitizeHeader(label || "");
  const safeEmail = sanitizeHeader(email || "");
  return safeLabel ? `"${safeLabel}" <${safeEmail}>` : `<${safeEmail}>`;
}

function buildMime({ from, to, replyTo, subject, text, html, attachments = [] }) {
  const boundaryMixed = "mj_mixed_" + crypto.randomBytes(12).toString("hex");
  const boundaryAlt = "mj_alt_" + crypto.randomBytes(12).toString("hex");
  const messageIdDomain = (process.env.MAIL_DOMAIN || "reclamemj.nl").replace(/[^a-z0-9.-]/gi, "") || "reclamemj.nl";
  const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString("hex")}@${messageIdDomain}>`;

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : "",
    `Subject: ${sanitizeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    `MIME-Version: 1.0`,
    `X-Mailer: MJ Reclame Website`,
    `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`,
  ].filter(Boolean).join("\r\n");

  let mime = headers + "\r\n\r\n";
  mime += `--${boundaryMixed}\r\n`;
  mime += `Content-Type: multipart/alternative; boundary="${boundaryAlt}"\r\n\r\n`;

  mime += `--${boundaryAlt}\r\n`;
  mime += `Content-Type: text/plain; charset="UTF-8"\r\n`;
  mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
  mime += quotedPrintable(text) + "\r\n\r\n";

  if (html) {
    mime += `--${boundaryAlt}\r\n`;
    mime += `Content-Type: text/html; charset="UTF-8"\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
    mime += quotedPrintable(html) + "\r\n\r\n";
  }

  mime += `--${boundaryAlt}--\r\n`;

  for (const file of attachments) {
    if (!file.content || file.content.length === 0) continue;
    // Limit pojedynczego załącznika w funkcji, żeby nie prowokować odrzucenia SMTP.
    if (file.content.length > 7 * 1024 * 1024) continue;
    mime += `--${boundaryMixed}\r\n`;
    mime += `Content-Type: ${file.contentType || "application/octet-stream"}; name="${sanitizeHeader(file.filename || "plik")}"\r\n`;
    mime += `Content-Disposition: attachment; filename="${sanitizeHeader(file.filename || "plik")}"\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
    mime += file.content.toString("base64").replace(/(.{76})/g, "$1\r\n") + "\r\n\r\n";
  }

  mime += `--${boundaryMixed}--\r\n`;
  return mime;
}

function smtpCommand(socket, command, expected = [250]) {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || "";
      if (/^\d{3}\s/.test(last)) {
        socket.off("data", onData);
        const code = Number(last.slice(0, 3));
        if (expected.includes(code)) resolve(buffer);
        else reject(new Error(`SMTP odpowiedział kodem ${code}: ${buffer.trim()}`));
      }
    };

    socket.on("data", onData);
    if (command !== null) socket.write(command + "\r\n");
  });
}

async function sendMail({ to, replyTo, subject, text, html, attachments }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const mailFromEmail = process.env.MAIL_ENVELOPE_FROM || user;
  const fromHeader = process.env.MAIL_FROM || formatAddress("MJ Reclame", user);

  if (!host || !user || !pass) {
    throw new Error("Brak konfiguracji SMTP.");
  }

  const socket = tls.connect({ host, port, servername: host });

  await new Promise((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
  });

  try {
    await smtpCommand(socket, null, [220]);
    await smtpCommand(socket, `EHLO ${process.env.MAIL_DOMAIN || "reclamemj.nl"}`, [250]);
    await smtpCommand(socket, "AUTH LOGIN", [334]);
    await smtpCommand(socket, Buffer.from(user).toString("base64"), [334]);
    await smtpCommand(socket, Buffer.from(pass).toString("base64"), [235]);

    await smtpCommand(socket, `MAIL FROM:<${sanitizeHeader(mailFromEmail)}>`, [250]);
    await smtpCommand(socket, `RCPT TO:<${sanitizeHeader(to)}>`, [250, 251]);
    await smtpCommand(socket, "DATA", [354]);

    const mime = buildMime({
      from: fromHeader,
      to: `<${sanitizeHeader(to)}>`,
      replyTo,
      subject,
      text,
      html,
      attachments,
    });

    await smtpCommand(socket, mime + "\r\n.", [250]);
    await smtpCommand(socket, "QUIT", [221]);
  } finally {
    socket.end();
  }
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Allow": "POST" }, body: "Method not allowed" };
  }

  try {
    const { fields, files } = parseRequest(event);
    const customerEmail = sanitizeHeader(getField(fields, ["email"]));
    const customerName = sanitizeHeader(getField(fields, ["name", "naam"], "Klient"));
    const ownerTo = sanitizeHeader(process.env.CONTACT_TO || DEFAULT_TO);

    if (!customerEmail || !customerEmail.includes("@")) {
      return { statusCode: 400, body: "Brak poprawnego adresu e-mail." };
    }

    const ownerText = buildOwnerPlain(fields, files);
    const clientText = buildClientPlain(fields);
    const clientHtml = buildClientHtml(fields);

    // 1. Mail do firmy: From jest zawsze z domeny firmowej, Reply-To = klient.
    await sendMail({
      to: ownerTo,
      replyTo: formatAddress(customerName, customerEmail),
      subject: "Nowe zapytanie z formularza MJ Reclame",
      text: ownerText,
      html: "",
      attachments: files,
    });

    // 2. Mail do klienta: bez załączników, prosty i mniej spamowy.
    await sendMail({
      to: customerEmail,
      replyTo: process.env.MAIL_REPLY_TO || DEFAULT_TO,
      subject: "Potwierdzenie zapytania MJ Reclame",
      text: clientText,
      html: clientHtml,
      attachments: [],
    });

    return {
      statusCode: 302,
      headers: { "Location": "/pl/dziekujemy" },
      body: "",
    };
  } catch (error) {
    console.error("MJ contact-dtf error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "Nie udało się wysłać formularza: " + error.message,
    };
  }
}
