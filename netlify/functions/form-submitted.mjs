import tls from "node:tls";

const DEFAULT_SITE_URL = "https://www.reclamemj.nl";
const LOGO_PATH = "/assets/logo-mj-reclame.png";

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

function encodeSubject(value = "") {
  return `=?UTF-8?B?${Buffer.from(String(value), "utf8").toString("base64")}?=`;
}

function dotStuff(value = "") {
  return String(value).replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || "true").toLowerCase() !== "false";
  const from = process.env.MAIL_FROM || `MJ Reclame <${user || ""}>`;
  const replyTo = process.env.MAIL_REPLY_TO || user || "info@reclamemj.nl";

  if (!host || !user || !pass) {
    throw new Error("Brak SMTP_HOST, SMTP_USER lub SMTP_PASS w Netlify Environment variables.");
  }

  return {
    host,
    port,
    user,
    pass,
    secure,
    from,
    fromEmail: parseEmailAddress(from) || user,
    replyTo,
  };
}

function smtpRead(socket, expectedCodes = []) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`SMTP timeout. Ostatnia odpowiedź: ${buffer}`));
    }, 15000);

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

async function smtpSendRawMail({ to, subject, html, text }) {
  const cfg = smtpConfig();

  if (!isEmail(to)) {
    throw new Error(`Nieprawidłowy adres odbiorcy: ${to}`);
  }

  const socket = tls.connect({
    host: cfg.host,
    port: cfg.port,
    servername: cfg.host,
    rejectUnauthorized: String(process.env.SMTP_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false",
  });

  function write(line) {
    socket.write(line + "\r\n");
  }

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

  const boundary = `mjreclame-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now = new Date().toUTCString();

  const message = [
    `From: ${formatHeaderValue(cfg.from)}`,
    `To: ${formatHeaderValue(to)}`,
    `Reply-To: ${formatHeaderValue(cfg.replyTo)}`,
    `Subject: ${encodeSubject(subject)}`,
    `Date: ${now}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    "",
    text,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  socket.write(dotStuff(message) + "\r\n.\r\n");
  await smtpRead(socket, [250]);

  write("QUIT");
  try { await smtpRead(socket, [221]); } catch (_) {}
  socket.end();
}

function orderSummaryHtml(data) {
  const message = pick(data, ["message", "wiadomosc", "bericht"]);
  const productCode = pick(data, ["product_code", "produkt"]);
  const productSize = pick(data, ["product_size", "rozmiar"]);
  const productColor = pick(data, ["product_color", "kolor"]);
  const productQty = pick(data, ["product_quantity", "ilosc", "ilość"]);

  if (message) return `<div class="summary-message">${textToHtml(message)}</div>`;

  const rows = [];
  if (productCode) rows.push(["Produkt / kod", productCode]);
  if (productSize) rows.push(["Rozmiar", productSize]);
  if (productColor) rows.push(["Kolor", productColor]);
  if (productQty) rows.push(["Ilość", productQty]);

  if (!rows.length) return `<p>Zapytanie zostało przyjęte do wyceny.</p>`;

  return `<table class="summary-table">${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>`;
}

function makeHtmlEmail(data) {
  const lang = isDutch(data) ? "nl" : "pl";
  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
  const logoUrl = `${siteUrl}${LOGO_PATH}`;
  const name = pick(data, ["name", "naam", "imie", "imię", "full_name"]) || "Kliencie";

  const copy = lang === "nl"
    ? {
        title: "Bedankt voor je aanvraag",
        hello: "Dzień dobry",
        subtitle: "Otrzymaliśmy Twoje zapytanie dotyczące odzieży z nadrukiem DTF.",
        intro: "Przygotujemy wycenę po sprawdzeniu modelu, ilości, kolorów, rozmiarów oraz przesłanej grafiki.",
        summary: "Podsumowanie zapytania",
        graphicsTitle: "Grafika do druku DTF",
        graphicsText: "Jeśli do formularza dodano logo, projekt lub plik graficzny, uwzględnimy go przy wycenie DTF.",
        next: "W razie potrzeby skontaktujemy się, aby doprecyzować plik, format grafiki, umiejscowienie nadruku albo termin realizacji.",
        footer: "Ta wiadomość została wysłana automatycznie jako potwierdzenie otrzymania formularza."
      }
    : {
        title: "Dziękujemy za zapytanie",
        hello: "Dzień dobry",
        subtitle: "Otrzymaliśmy Twoje zapytanie dotyczące odzieży z nadrukiem DTF.",
        intro: "Przygotujemy wycenę po sprawdzeniu modelu, ilości, kolorów, rozmiarów oraz przesłanej grafiki.",
        summary: "Podsumowanie zapytania",
        graphicsTitle: "Grafika do druku DTF",
        graphicsText: "Jeśli do formularza dodano logo, projekt lub plik graficzny, uwzględnimy go przy wycenie DTF.",
        next: "W razie potrzeby skontaktujemy się, aby doprecyzować plik, format grafiki, umiejscowienie nadruku albo termin realizacji.",
        footer: "Ta wiadomość została wysłana automatycznie jako potwierdzenie otrzymania formularza."
      };

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>${esc(copy.title)}</title>
  <style>
    body{margin:0;padding:0;background:#0b100d;font-family:Arial,Helvetica,sans-serif;color:#dce6df;}
    .wrapper{width:100%;background:radial-gradient(circle at 15% 0%,rgba(71,223,0,.22),transparent 32%),#0b100d;padding:28px 0;}
    .mail{max-width:720px;margin:0 auto;background:#111815;border:1px solid rgba(71,223,0,.34);border-radius:24px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35);}
    .header{padding:28px 30px;background:linear-gradient(135deg,#071009,#15211a);border-bottom:4px solid #47df00;}
    .logo{display:block;max-width:190px;height:auto;margin:0 0 22px;}
    .kicker{margin:0 0 8px;color:#47df00;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;}
    h1{margin:0;color:#fff;font-size:34px;line-height:1.05;text-transform:uppercase;letter-spacing:.02em;}
    .content{padding:28px 30px;}
    .lead{font-size:17px;line-height:1.6;margin:0 0 16px;color:#eaf2ee;}
    .box{margin:22px 0;padding:20px;border-radius:18px;background:#0d130f;border:1px solid rgba(255,255,255,.12);}
    .box h2{margin:0 0 14px;color:#47df00;font-size:18px;text-transform:uppercase;letter-spacing:.08em;}
    .summary-message{line-height:1.62;color:#edf5f1;font-size:15px;white-space:normal;}
    .summary-table{width:100%;border-collapse:collapse;}
    .summary-table th,.summary-table td{padding:10px;border-bottom:1px solid rgba(255,255,255,.12);text-align:left;vertical-align:top;}
    .summary-table th{width:170px;color:#47df00;text-transform:uppercase;font-size:12px;letter-spacing:.08em;}
    .pill{display:inline-block;margin-top:8px;padding:9px 13px;border-radius:999px;background:rgba(71,223,0,.13);border:1px solid rgba(71,223,0,.32);color:#dff5d7;font-weight:700;}
    .footer{padding:20px 30px;background:#090d0b;color:#aebbb5;font-size:13px;line-height:1.5;border-top:1px solid rgba(255,255,255,.08);}
    a{color:#47df00;}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="mail">
      <div class="header">
        <img class="logo" src="${esc(logoUrl)}" alt="MJ Reclame">
        <p class="kicker">MJ Reclame / DTF</p>
        <h1>${esc(copy.title)}</h1>
      </div>
      <div class="content">
        <p class="lead">${esc(copy.hello)}, ${esc(name)}.</p>
        <p class="lead">${esc(copy.subtitle)}</p>
        <p class="lead">${esc(copy.intro)}</p>
        <div class="box">
          <h2>${esc(copy.summary)}</h2>
          ${orderSummaryHtml(data)}
        </div>
        <div class="box">
          <h2>${esc(copy.graphicsTitle)}</h2>
          <p class="lead" style="font-size:15px;margin-bottom:6px">${esc(copy.graphicsText)}</p>
          <span class="pill">DTF / Direct To Film</span>
        </div>
        <p class="lead">${esc(copy.next)}</p>
      </div>
      <div class="footer">
        <strong>MJ Reclame</strong><br>
        ${esc(copy.footer)}<br>
        <a href="${esc(siteUrl)}">${esc(siteUrl)}</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function makeTextEmail(data) {
  const name = pick(data, ["name", "naam", "imie", "imię", "full_name"]) || "Kliencie";
  const message = pick(data, ["message", "wiadomosc", "bericht"]);
  const productCode = pick(data, ["product_code", "produkt"]);
  const productSize = pick(data, ["product_size", "rozmiar"]);
  const productColor = pick(data, ["product_color", "kolor"]);
  const productQty = pick(data, ["product_quantity", "ilosc", "ilość"]);

  const lines = [
    `Dzień dobry, ${name}.`,
    "",
    "Dziękujemy za zapytanie dotyczące odzieży z nadrukiem DTF.",
    "Przygotujemy wycenę po sprawdzeniu produktu, rozmiarów, kolorów, ilości oraz przesłanej grafiki.",
    "",
    "Podsumowanie zapytania:",
    "",
  ];

  if (message) {
    lines.push(message);
  } else {
    if (productCode) lines.push(`Produkt / kod: ${productCode}`);
    if (productSize) lines.push(`Rozmiar: ${productSize}`);
    if (productColor) lines.push(`Kolor: ${productColor}`);
    if (productQty) lines.push(`Ilość: ${productQty}`);
  }

  lines.push("");
  lines.push("Jeśli do formularza dodano logo, projekt lub plik graficzny, uwzględnimy go przy wycenie DTF.");
  lines.push("");
  lines.push("MJ Reclame");
  return lines.join("\n");
}

async function sendCustomerConfirmation(data) {
  const customerEmail = pick(data, ["email", "mail", "from", "sender"]);
  const formName = pick(data, ["form-name", "form_name"]);

  console.log(`MJ autoresponder: otrzymano formName=${formName || "(brak)"} email=${customerEmail || "(brak)"}`);

  if (formName && formName !== "kontakt-mj-reclame") {
    console.log(`MJ autoresponder: pominięto inny formularz: ${formName}`);
    return;
  }

  if (!isEmail(customerEmail)) {
    console.log("MJ autoresponder: pominięto — brak prawidłowego adresu klienta.");
    return;
  }

  const subject = "MJ Reclame — potwierdzenie zapytania DTF";

  await smtpSendRawMail({
    to: customerEmail,
    subject,
    html: makeHtmlEmail(data),
    text: makeTextEmail(data),
  });

  console.log(`MJ autoresponder: wysłano potwierdzenie DTF do ${customerEmail}.`);
}

export default {
  async formSubmitted(event) {
    await sendCustomerConfirmation(event.data || {});
  },
};
