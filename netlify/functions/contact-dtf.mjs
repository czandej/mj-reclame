import tls from "node:tls";
import crypto from "node:crypto";

const DEFAULT_TO = "info@reclamemj.nl";
const DEFAULT_SITE_URL = "https://www.reclamemj.nl";
const LOGO_PATH = "/assets/logo-mj-reclame.png";

function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");}
function sanitizeHeader(v=""){return String(v).replace(/[\r\n]+/g," ").replace(/[<>]/g,"").trim().slice(0,180);}
function sanitizeText(v=""){return String(v).replace(/\r\n/g,"\n").replace(/\r/g,"\n").slice(0,16000);}
function decodeRFC5987(v=""){try{return decodeURIComponent(String(v).replace(/^UTF-8''/i,""));}catch{return v;}}
function getField(fields,names,fallback=""){for(const n of names){if(fields[n]!==undefined&&fields[n]!==null&&String(fields[n]).trim()!=="")return String(fields[n]).trim();}return fallback;}
function detectLang(fields){return getField(fields,["language","lang"],"pl").toLowerCase()==="nl"?"nl":"pl";}
function textToHtml(t){return esc(t).replace(/\n/g,"<br>");}
function siteUrl(){return (process.env.SITE_URL||DEFAULT_SITE_URL).replace(/\/$/,"");}
function logoUrl(){return siteUrl()+LOGO_PATH;}

function contentDisposition(headerText){
  const name=(headerText.match(/name="([^"]+)"/i)||[])[1]||"";
  const fs=(headerText.match(/filename\*=([^;\r\n]+)/i)||[])[1];
  const fn=(headerText.match(/filename="([^"]*)"/i)||[])[1]||"";
  return {name, filename: fs?decodeRFC5987(fs.trim()):fn};
}
function splitMultipartBuffer(buffer,boundary){
  const marker=Buffer.from(`--${boundary}`); const parts=[]; let start=buffer.indexOf(marker);
  while(start!==-1){
    start+=marker.length; if(buffer[start]===45&&buffer[start+1]===45)break;
    if(buffer[start]===13&&buffer[start+1]===10)start+=2;
    const next=buffer.indexOf(marker,start); if(next===-1)break;
    let part=buffer.subarray(start,next);
    if(part.length>=2&&part[part.length-2]===13&&part[part.length-1]===10)part=part.subarray(0,part.length-2);
    parts.push(part); start=next;
  }
  return parts;
}
function parseMultipart(bodyBuffer,contentType){
  const bm=contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i); if(!bm)return {fields:{},files:[]};
  const parts=splitMultipartBuffer(bodyBuffer,bm[1]||bm[2]); const fields={}; const files=[];
  for(const part of parts){
    const split=part.indexOf(Buffer.from("\r\n\r\n")); if(split===-1)continue;
    const headers=part.subarray(0,split).toString("utf8"); const valueBuffer=part.subarray(split+4);
    const disp=contentDisposition(headers); if(!disp.name)continue;
    const ctm=headers.match(/Content-Type:\s*([^\r\n]+)/i);
    const ptype=sanitizeHeader(ctm?ctm[1]:"application/octet-stream");
    if(disp.filename){ files.push({field:disp.name, filename:sanitizeHeader(disp.filename), contentType:ptype, content:valueBuffer}); }
    else { fields[disp.name]=valueBuffer.toString("utf8"); }
  }
  return {fields,files};
}
function parseUrlEncoded(bodyBuffer){const params=new URLSearchParams(bodyBuffer.toString("utf8")); const fields={}; for(const [k,v] of params.entries())fields[k]=v; return {fields,files:[]};}
function parseRequest(event){
  const ct=event.headers["content-type"]||event.headers["Content-Type"]||"";
  const bodyBuffer=event.isBase64Encoded?Buffer.from(event.body||"","base64"):Buffer.from(event.body||"","utf8");
  return ct.includes("multipart/form-data")?parseMultipart(bodyBuffer,ct):parseUrlEncoded(bodyBuffer);
}

function L(lang){return lang==="nl"?{
  hello:"Goedendag", clientTitle:"Bedankt voor je aanvraag", clientIntro1:"Bedankt voor het versturen van je aanvraag naar MJ Reclame.", clientIntro2:"Wij hebben je aanvraag voor kleding met DTF-bedrukking ontvangen.", summary:"Samenvatting van de aanvraag", fallback:"De aanvraag is ontvangen en wordt beoordeeld.", files:"Als er grafische bestanden zijn toegevoegd aan het formulier, nemen wij deze mee in de offerte.", footerAuto:"Dit bericht is automatisch verzonden als bevestiging van ontvangst van het formulier.", ownerTitle:"Nieuwe aanvraag", ownerKicker:"MJ Reclame / formulier", ownerSubject:"Nieuwe aanvraag via MJ Reclame", clientSubject:"Bevestiging van je aanvraag bij MJ Reclame", fieldName:"Naam/bedrijf", fieldEmail:"E-mail", fieldPhone:"Telefoon", fieldService:"Dienst", fieldQuantity:"Aantal/oplage", fieldDeadline:"Deadline", fieldMessage:"Bericht", fieldFiles:"Bijlagen", noFiles:"Geen bijlagen", source:"Bron: contactformulier MJ Reclame", technical:"Technisch bericht van het contactformulier van MJ Reclame."
}:{
  hello:"Dzień dobry", clientTitle:"Dziękujemy za zapytanie", clientIntro1:"Dziękujemy za przesłanie zapytania do MJ Reclame.", clientIntro2:"Otrzymaliśmy zapytanie dotyczące odzieży z nadrukiem DTF.", summary:"Podsumowanie zapytania", fallback:"Zapytanie zostało przyjęte do wyceny.", files:"Jeżeli do formularza dołączono pliki graficzne, uwzględnimy je przy przygotowaniu wyceny.", footerAuto:"Ta wiadomość została wysłana automatycznie jako potwierdzenie otrzymania formularza.", ownerTitle:"Nowe zapytanie", ownerKicker:"MJ Reclame / formularz", ownerSubject:"Nowe zapytanie z formularza MJ Reclame", clientSubject:"Potwierdzenie zapytania MJ Reclame", fieldName:"Imię/nazwa", fieldEmail:"Email", fieldPhone:"Telefon", fieldService:"Usługa", fieldQuantity:"Ilość/nakład", fieldDeadline:"Termin", fieldMessage:"Wiadomość", fieldFiles:"Załączniki", noFiles:"Brak załączników", source:"Źródło: formularz kontaktowy MJ Reclame", technical:"Wiadomość techniczna z formularza kontaktowego MJ Reclame."
};}
function shell({lang,title,kicker,bodyHtml,footer}){
  const logo=logoUrl();
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head><body style="margin:0;padding:0;background:#0b100d;font-family:Arial,Helvetica,sans-serif;color:#eaf2ee;"><div style="width:100%;background:#0b100d;padding:24px 0;"><div style="max-width:720px;margin:0 auto;background:#111815;border:1px solid #2a6d19;border-radius:18px;overflow:hidden;"><div style="padding:22px 26px;background:#071009;border-bottom:4px solid #47df00;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr><td style="vertical-align:top;padding:0;"><div style="font-size:13px;font-weight:700;color:#47df00;letter-spacing:.08em;text-transform:uppercase;">${esc(kicker)}</div><h1 style="margin:8px 0 0;font-size:28px;line-height:1.1;color:#ffffff;">${esc(title)}</h1></td><td style="vertical-align:top;text-align:right;width:150px;padding:0;"><img src="${esc(logo)}" alt="MJ Reclame" width="118" style="display:inline-block;width:118px;max-width:118px;height:auto;border:0;"></td></tr></table></div><div style="padding:24px 26px;font-size:16px;line-height:1.6;">${bodyHtml}</div><div style="padding:16px 26px;background:#090d0b;color:#b9c8bf;font-size:13px;line-height:1.5;">${esc(footer)}<br>MJ Reclame — info@reclamemj.nl</div></div></div></body></html>`;
}
function clientText(fields,lang){const l=L(lang), name=getField(fields,["name","naam","imie"],lang==="nl"?"klant":"Kliencie"), msg=sanitizeText(getField(fields,["message","wiadomosc","bericht"])); return sanitizeText([`${l.hello}, ${name}.`,"",l.clientIntro1,l.clientIntro2,"",`${l.summary}:`,"",msg||l.fallback,"",l.files,"","MJ Reclame","info@reclamemj.nl"].join("\n"));}
function clientHtml(fields,lang){const l=L(lang); return shell({lang,title:l.clientTitle,kicker:"MJ Reclame / DTF",bodyHtml:textToHtml(clientText(fields,lang)),footer:l.footerAuto});}
function ownerText(fields,files,lang){const l=L(lang); const lines=[l.ownerTitle,"",`${l.fieldName}: ${getField(fields,["name","naam"],"-")}`,`${l.fieldEmail}: ${getField(fields,["email"],"-")}`,`${l.fieldPhone}: ${getField(fields,["phone"],"-")}`,`${l.fieldService}: ${getField(fields,["service"],"-")}`,`${l.fieldQuantity}: ${getField(fields,["quantity"],"-")}`,`${l.fieldDeadline}: ${getField(fields,["deadline"],"-")}`,"",`${l.fieldMessage}:`,sanitizeText(getField(fields,["message"],"-")),"",`${l.fieldFiles}: ${files.length}`]; for(const f of files)lines.push(`- ${f.filename} (${f.contentType}, ${f.content.length} B)`); lines.push("",l.source); return sanitizeText(lines.join("\n"));}
function ownerHtml(fields,files,lang){const l=L(lang), msg=sanitizeText(getField(fields,["message"],"-")); const rows=files.length?files.map(f=>`<li>${esc(f.filename)} — ${esc(f.contentType)}, ${f.content.length} B</li>`).join(""):`<li>${esc(l.noFiles)}</li>`; const body=`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;color:#eaf2ee;"><tr><td style="padding:8px 0;color:#47df00;font-weight:bold;width:150px;">${esc(l.fieldName)}</td><td style="padding:8px 0;">${esc(getField(fields,["name","naam"],"-"))}</td></tr><tr><td style="padding:8px 0;color:#47df00;font-weight:bold;">${esc(l.fieldEmail)}</td><td style="padding:8px 0;">${esc(getField(fields,["email"],"-"))}</td></tr><tr><td style="padding:8px 0;color:#47df00;font-weight:bold;">${esc(l.fieldPhone)}</td><td style="padding:8px 0;">${esc(getField(fields,["phone"],"-"))}</td></tr><tr><td style="padding:8px 0;color:#47df00;font-weight:bold;">${esc(l.fieldService)}</td><td style="padding:8px 0;">${esc(getField(fields,["service"],"-"))}</td></tr></table><div style="margin-top:18px;padding:16px;border:1px solid #2a6d19;border-radius:14px;background:#0d130f;color:#ffffff;">${textToHtml(msg)}</div><div style="margin-top:18px;"><strong style="color:#47df00;">${esc(l.fieldFiles)}:</strong><ul style="margin-top:8px;">${rows}</ul></div>`; return shell({lang,title:l.ownerTitle,kicker:l.ownerKicker,bodyHtml:body,footer:l.technical});}

function b64(text){return Buffer.from(text,"utf8").toString("base64").replace(/(.{76})/g,"$1\r\n");}
function encHeader(v){return `=?UTF-8?B?${Buffer.from(sanitizeHeader(v),"utf8").toString("base64")}?=`;}
function formatAddress(label,email){const sl=sanitizeHeader(label||""), se=sanitizeHeader(email||""); return sl?`${encHeader(sl)} <${se}>`:`<${se}>`;}
function buildMime({from,to,replyTo,subject,text,html,attachments=[]}){const bm="mj_mixed_"+crypto.randomBytes(12).toString("hex"), ba="mj_alt_"+crypto.randomBytes(12).toString("hex"), dom=(process.env.MAIL_DOMAIN||"reclamemj.nl").replace(/[^a-z0-9.-]/gi,"")||"reclamemj.nl"; let mime=[`From: ${from}`,`To: ${to}`,replyTo?`Reply-To: ${replyTo}`:"",`Subject: ${encHeader(subject)}`,`Date: ${new Date().toUTCString()}`,`Message-ID: <${Date.now()}.${crypto.randomBytes(8).toString("hex")}@${dom}>`,`MIME-Version: 1.0`,`X-Mailer: MJ Reclame Website`,`Content-Type: multipart/mixed; boundary="${bm}"`].filter(Boolean).join("\r\n")+"\r\n\r\n"; mime+=`--${bm}\r\nContent-Type: multipart/alternative; boundary="${ba}"\r\n\r\n`; mime+=`--${ba}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(text)}\r\n\r\n`; if(html)mime+=`--${ba}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(html)}\r\n\r\n`; mime+=`--${ba}--\r\n`; for(const f of attachments){if(!f.content||f.content.length===0||f.content.length>7*1024*1024)continue; const fn=sanitizeHeader(f.filename||"plik"); mime+=`--${bm}\r\nContent-Type: ${f.contentType||"application/octet-stream"}; name="${encHeader(fn)}"\r\nContent-Disposition: attachment; filename="${encHeader(fn)}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${f.content.toString("base64").replace(/(.{76})/g,"$1\r\n")}\r\n\r\n`; } return mime+`--${bm}--\r\n`;}
function smtpCommand(socket,command,expected=[250]){return new Promise((resolve,reject)=>{let buffer=""; const onData=chunk=>{buffer+=chunk.toString("utf8"); const lines=buffer.split(/\r?\n/).filter(Boolean); const last=lines[lines.length-1]||""; if(/^\d{3}\s/.test(last)){socket.off("data",onData); const code=Number(last.slice(0,3)); expected.includes(code)?resolve(buffer):reject(new Error(`SMTP odpowiedział kodem ${code}: ${buffer.trim()}`));}}; socket.on("data",onData); if(command!==null)socket.write(command+"\r\n");});}
async function sendMail({to,replyTo,subject,text,html,attachments}){const host=process.env.SMTP_HOST, port=Number(process.env.SMTP_PORT||465), user=process.env.SMTP_USER, pass=process.env.SMTP_PASS, envelope=process.env.MAIL_ENVELOPE_FROM||user, fromHeader=process.env.MAIL_FROM||formatAddress("MJ Reclame",user); if(!host||!user||!pass)throw new Error("Brak konfiguracji SMTP."); const socket=tls.connect({host,port,servername:host}); await new Promise((res,rej)=>{socket.once("secureConnect",res);socket.once("error",rej);}); try{await smtpCommand(socket,null,[220]); await smtpCommand(socket,`EHLO ${process.env.MAIL_DOMAIN||"reclamemj.nl"}`,[250]); await smtpCommand(socket,"AUTH LOGIN",[334]); await smtpCommand(socket,Buffer.from(user).toString("base64"),[334]); await smtpCommand(socket,Buffer.from(pass).toString("base64"),[235]); await smtpCommand(socket,`MAIL FROM:<${sanitizeHeader(envelope)}>`,[250]); await smtpCommand(socket,`RCPT TO:<${sanitizeHeader(to)}>`,[250,251]); await smtpCommand(socket,"DATA",[354]); await smtpCommand(socket,buildMime({from:fromHeader,to:`<${sanitizeHeader(to)}>`,replyTo,subject,text,html,attachments})+"\r\n.",[250]); await smtpCommand(socket,"QUIT",[221]);} finally{socket.end();}}
function successPath(fields){return detectLang(fields)==="nl"?"/nl/dziekujemy":"/pl/dziekujemy";}
export async function handler(event){if(event.httpMethod!=="POST")return {statusCode:405,headers:{Allow:"POST"},body:"Method not allowed"}; try{const {fields,files}=parseRequest(event); const lang=detectLang(fields), l=L(lang); const customerEmail=sanitizeHeader(getField(fields,["email"])); const customerName=sanitizeHeader(getField(fields,["name","naam"],lang==="nl"?"Klant":"Klient")); const ownerTo=sanitizeHeader(process.env.CONTACT_TO||DEFAULT_TO); if(!customerEmail||!customerEmail.includes("@"))return {statusCode:400,headers:{"Content-Type":"text/plain; charset=utf-8"},body:lang==="nl"?"Geen geldig e-mailadres.":"Brak poprawnego adresu e-mail."}; await sendMail({to:ownerTo,replyTo:formatAddress(customerName,customerEmail),subject:l.ownerSubject,text:ownerText(fields,files,lang),html:ownerHtml(fields,files,lang),attachments:files}); await sendMail({to:customerEmail,replyTo:process.env.MAIL_REPLY_TO||DEFAULT_TO,subject:l.clientSubject,text:clientText(fields,lang),html:clientHtml(fields,lang),attachments:[]}); return {statusCode:302,headers:{Location:successPath(fields)},body:""};}catch(error){console.error("MJ contact-dtf error:",error); return {statusCode:500,headers:{"Content-Type":"text/plain; charset=utf-8"},body:"Nie udało się wysłać formularza: "+error.message};}}
