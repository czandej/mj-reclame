import tls from "node:tls";
import crypto from "node:crypto";

const DEFAULT_TO = "info@reclamemj.nl";

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
    .slice(0, 16000);
}

function decodeRFC5987(value = "") {
  try {
    return decodeURIComponent(String(value).replace(/^UTF-8''/i, ""));
  } catch {
    return value;
  }
}

function splitMultipartBuffer(buffer, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`, "utf8");
  const parts = [];
  let start = buffer.indexOf(boundaryBuffer);

  while (start !== -1) {
    start += boundaryBuffer.length;

    if (buffer[start] === 45 && buffer[start + 1] === 45) break;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;

    const next = buffer.indexOf(boundaryBuffer, start);
    if (next === -1) break;

    let part = buffer.subarray(start, next);
    if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
      part = part.subarray(0, part.length - 2);
    }

    parts.push(part);
    start = next;
  }

  return parts;
}

function parseContentDisposition(headerText) {
  const nameMatch = headerText.match(/name="([^"]+)"/i);
  const filenameStarMatch = headerText.match(/filename\*=([^;\r\n]+)/i);
  const filenameMatch = headerText.match(/filename="([^"]*)"/i);

  return {
    name: nameMatch ? nameMatch[1] : "",
    filename: filenameStarMatch
      ? decodeRFC5987(filenameStarMatch[1].trim())
      : (filenameMatch ? filenameMatch[1] : ""),
  };
}

function parseMultipart(bodyBuffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return { fields: {}, files: [] };

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const parts = splitMultipartBuffer(bodyBuffer, boundary);
  const fields = {};
  const files = [];

  for (const part of parts) {
    const split = part.indexOf(Buffer.from("\r\n\r\n", "utf8"));
    if (split === -1) continue;

    const headerText = part.subarray(0, split).toString("utf8");
    let valueBuffer = part.subarray(split + 4);

    if (valueBuffer.length >= 2 && valueBuffer[valueBuffer.length - 2] === 13 && valueBuffer[valueBuffer.length - 1] === 10) {
      valueBuffer = valueBuffer.subarray(0, valueBuffer.length - 2);
    }

    const disposition = parseContentDisposition(headerText);
    if (!disposition.name) continue;

    const contentTypeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
    const partContentType = sanitizeHeader(contentTypeMatch ? contentTypeMatch[1] : "application/octet-stream");

    if (disposition.filename) {
      files.push({
        field: disposition.name,
        filename: sanitizeHeader(disposition.filename),
        contentType: partContentType,
        content: valueBuffer,
      });
    } else {
      fields[disposition.name] = valueBuffer.toString("utf8");
    }
  }

  return { fields, files };
}

function parseUrlEncoded(bodyBuffer) {
  const params = new URLSearchParams(bodyBuffer.toString("utf8"));
  const fields = {};
  for (const [key, value] of params.entries()) fields[key] = value;
  return { fields, files: [] };
}

function parseRequest(event) {
  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64")
    : Buffer.from(event.body || "", "utf8");

  if (contentType.includes("multipart/form-data")) {
    return parseMultipart(bodyBuffer, contentType);
  }

  return parseUrlEncoded(bodyBuffer);
}

function getField(fields, names, fallback = "") {
  for (const name of names) {
    if (fields[name] !== undefined && fields[name] !== null && String(fields[name]).trim() !== "") {
      return String(fields[name]).trim();
    }
  }
  return fallback;
}

function detectLang(fields) {
  const lang = getField(fields, ["language", "lang"], "pl").toLowerCase();
  return lang === "nl" ? "nl" : "pl";
}

function labels(lang) {
  return lang === "nl" ? {
    ownerSubject: "Nieuwe aanvraag via MJ Reclame",
    clientSubject: "Bevestiging van je aanvraag bij MJ Reclame",
    hello: "Goedendag",
    clientIntro1: "Bedankt voor het versturen van je aanvraag naar MJ Reclame.",
    clientIntro2: "Wij hebben je aanvraag voor kleding met DTF-bedrukking ontvangen.",
    summary: "Samenvatting van de aanvraag",
    filesInfo: "Als er grafische bestanden zijn toegevoegd, nemen wij deze mee in de offerte.",
    footer: "MJ Reclame\ninfo@reclamemj.nl",
    ownerTitle: "Nieuwe aanvraag via MJ Reclame",
    name: "Naam/bedrijf",
    email: "E-mail",
    phone: "Telefoon",
    service: "Dienst",
    quantity: "Aantal/oplage",
    deadline: "Deadline",
    message: "Bericht",
    attachments: "Bijlagen",
    source: "Bron: contactformulier MJ Reclame"
  } : {
    ownerSubject: "Nowe zapytanie z formularza MJ Reclame",
    clientSubject: "Potwierdzenie zapytania MJ Reclame",
    hello: "Dzień dobry",
    clientIntro1: "Dziękujemy za przesłanie zapytania do MJ Reclame.",
    clientIntro2: "Otrzymaliśmy zapytanie dotyczące odzieży z nadrukiem DTF.",
    summary: "Podsumowanie zapytania",
    filesInfo: "Jeżeli do formularza dołączono pliki graficzne, uwzględnimy je przy przygotowaniu wyceny.",
    footer: "MJ Reclame\ninfo@reclamemj.nl",
    ownerTitle: "Nowe zapytanie z formularza MJ Reclame",
    name: "Imię/nazwa",
    email: "Email",
    phone: "Telefon",
    service: "Usługa",
    quantity: "Ilość/nakład",
    deadline: "Termin",
    message: "Wiadomość",
    attachments: "Załączniki",
    source: "Źródło: formularz kontaktowy MJ Reclame"
  };
}

function buildClientText(fields, lang) {
  const L = labels(lang);
  const name = getField(fields, ["name", "naam"], lang === "nl" ? "klant" : "Kliencie");
  const message = sanitizeText(getField(fields, ["message", "wiadomosc", "bericht"], ""));

  const lines = [
    `${L.hello}, ${name}.`,
    "",
    L.clientIntro1,
    L.clientIntro2,
    "",
    `${L.summary}:`,
    "",
    message || (lang === "nl" ? "De aanvraag is ontvangen." : "Zapytanie zostało przyjęte do wyceny."),
    "",
    L.filesInfo,
    "",
    L.footer
  ];

  return sanitizeText(lines.join("\n"));
}

function buildOwnerText(fields, files, lang) {
  const L = labels(lang);
  const lines = [
    L.ownerTitle,
    "",
    `${L.name}: ${getField(fields, ["name", "naam"], "-")}`,
    `${L.email}: ${getField(fields, ["email"], "-")}`,
    `${L.phone}: ${getField(fields, ["phone"], "-")}`,
    `${L.service}: ${getField(fields, ["service"], "-")}`,
    `${L.quantity}: ${getField(fields, ["quantity"], "-")}`,
    `${L.deadline}: ${getField(fields, ["deadline"], "-")}`,
    "",
    `${L.message}:`,
    sanitizeText(getField(fields, ["message"], "-")),
    "",
    `${L.attachments}: ${files.length}`
  ];

  for (const file of files) {
    lines.push(`- ${file.filename} (${file.contentType}, ${file.content.length} B)`);
  }

  lines.push("");
  lines.push(L.source);

  return sanitizeText(lines.join("\n"));
}

function b64Utf8(text) {
  return Buffer.from(String(text), "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
}

function encodeHeader(value) {
  const clean = sanitizeHeader(value);
  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

function formatAddress(label, email) {
  const safeLabel = sanitizeHeader(label || "");
  const safeEmail = sanitizeHeader(email || "");
  return safeLabel ? `${encodeHeader(safeLabel)} <${safeEmail}>` : `<${safeEmail}>`;
}

function buildMime({ from, to, replyTo, subject, text, attachments = [] }) {
  const boundaryMixed = "mj_mixed_" + crypto.randomBytes(12).toString("hex");
  const messageIdDomain = (process.env.MAIL_DOMAIN || "reclamemj.nl").replace(/[^a-z0-9.-]/gi, "") || "reclamemj.nl";
  const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString("hex")}@${messageIdDomain}>`;

  const hasAttachments = attachments.some(file => file.content && file.content.length > 0 && file.content.length <= 7 * 1024 * 1024);

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : "",
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    `MIME-Version: 1.0`,
    `X-Mailer: MJ Reclame Website`,
    hasAttachments ? `Content-Type: multipart/mixed; boundary="${boundaryMixed}"` : `Content-Type: text/plain; charset=UTF-8`,
    hasAttachments ? "" : `Content-Transfer-Encoding: base64`
  ].filter(line => line !== null && line !== undefined).join("\r\n");

  if (!hasAttachments) {
    return headers + "\r\n\r\n" + b64Utf8(text) + "\r\n";
  }

  let mime = headers + "\r\n\r\n";
  mime += `--${boundaryMixed}\r\n`;
  mime += `Content-Type: text/plain; charset=UTF-8\r\n`;
  mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
  mime += b64Utf8(text) + "\r\n\r\n";

  for (const file of attachments) {
    if (!file.content || file.content.length === 0) continue;
    if (file.content.length > 7 * 1024 * 1024) continue;

    const filename = sanitizeHeader(file.filename || "plik");
    mime += `--${boundaryMixed}\r\n`;
    mime += `Content-Type: ${file.contentType || "application/octet-stream"}; name="${encodeHeader(filename)}"\r\n`;
    mime += `Content-Disposition: attachment; filename="${encodeHeader(filename)}"\r\n`;
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

async function sendMail({ to, replyTo, subject, text, attachments }) {
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
      attachments,
    });

    await smtpCommand(socket, mime + "\r\n.", [250]);
    await smtpCommand(socket, "QUIT", [221]);
  } finally {
    socket.end();
  }
}

function successPath(fields) {
  return detectLang(fields) === "nl" ? "/nl/dziekujemy" : "/pl/dziekujemy";
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Allow": "POST" }, body: "Method not allowed" };
  }

  try {
    const { fields, files } = parseRequest(event);
    const lang = detectLang(fields);
    const L = labels(lang);

    const customerEmail = sanitizeHeader(getField(fields, ["email"]));
    const customerName = sanitizeHeader(getField(fields, ["name", "naam"], lang === "nl" ? "Klant" : "Klient"));
    const ownerTo = sanitizeHeader(process.env.CONTACT_TO || DEFAULT_TO);

    if (!customerEmail || !customerEmail.includes("@")) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: lang === "nl" ? "Geen geldig e-mailadres." : "Brak poprawnego adresu e-mail."
      };
    }

    await sendMail({
      to: ownerTo,
      replyTo: formatAddress(customerName, customerEmail),
      subject: L.ownerSubject,
      text: buildOwnerText(fields, files, lang),
      attachments: files,
    });

    await sendMail({
      to: customerEmail,
      replyTo: process.env.MAIL_REPLY_TO || DEFAULT_TO,
      subject: L.clientSubject,
      text: buildClientText(fields, lang),
      attachments: [],
    });

    return {
      statusCode: 302,
      headers: { "Location": successPath(fields) },
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
