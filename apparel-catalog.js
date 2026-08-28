
(function(){
  const lang = document.documentElement.lang === "nl" ? "nl" : "pl";
  const cards = Array.from(document.querySelectorAll("[data-product-card]"));
  if(!cards.length) return;

  const search = document.querySelector("[data-sales-search]");
  const count = document.querySelector("[data-sales-count]");
  const empty = document.querySelector("[data-sales-empty]");
  const filters = Array.from(document.querySelectorAll("[data-sales-filter]"));
  const inquiryBox = document.querySelector("[data-dtf-inquiry-box]");
  const inquiryTbody = document.querySelector("[data-dtf-items]");
  const inquiryEmpty = document.querySelector("[data-dtf-empty]");
  const inquiryTableWrap = document.querySelector("[data-dtf-table-wrap]");
  const totalItems = document.querySelector("[data-dtf-total-items]");
  const clearBtn = document.querySelector("[data-dtf-clear]");
  const sendBtn = document.querySelector("[data-dtf-send]");
  let feedbackToast = null;

  const storageKey = "mjDtfInquiryItems";
  let active = "all";
  let query = "";
  let inquiry = [];

  const labels = {
    pl: {
      chosen: "Wybrano",
      color: "kolor",
      qty: "ilość",
      remove: "Usuń",
      empty: "Lista jest pusta. Wybierz produkt, rozmiar, kolor i ilość, a potem kliknij „Dodaj do zapytania”.",
      added: "Dodano do zapytania",
      updated: "Zaktualizowano zapytanie",
      sendBase: "kontakt.html",
      inquiryHeader: "Proszę o wycenę odzieży do druku DTF:",
      graphicsLine: "Grafikę / logo do nadruku DTF dołączam w załączniku albo prześlę po kontakcie.",
      message: (code, name, size, color, qty) => `Interesuje mnie produkt ${code}: ${name}. Rozmiar: ${size || ""}. Kolor: ${color || ""}. Ilość: ${qty || ""}. Nadruk: proszę o wycenę nadruku DTF.`
    },
    nl: {
      chosen: "Gekozen",
      color: "kleur",
      qty: "aantal",
      remove: "Verwijder",
      empty: "De lijst is leeg. Kies product, maat, kleur en aantal en klik daarna op “Toevoegen aan aanvraag”.",
      added: "Toegevoegd aan aanvraag",
      updated: "Aanvraag bijgewerkt",
      sendBase: "kontakt.html",
      inquiryHeader: "Graag ontvang ik een offerte voor kleding met DTF-bedrukking:",
      graphicsLine: "Het ontwerp / logo voor DTF-bedrukking voeg ik toe als bijlage of stuur ik na contact door.",
      message: (code, name, size, color, qty) => `Ik ben geïnteresseerd in product ${code}: ${name}. Maat: ${size || ""}. Kleur: ${color || ""}. Aantal: ${qty || ""}. Bedrukking: graag offerte voor DTF-print.`
    }
  }[lang];

  function normalizeColorCode(color){
    return color === "29" ? "290" : color;
  }

  function safeQty(value){
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  function formatPrice(value){
    if(window.MJApparelPricing && typeof window.MJApparelPricing.money === "function") return window.MJApparelPricing.money(value);
    const n = Number(value || 0);
    return n.toFixed(2).replace(".", ",") + " €";
  }

  function grossPrice(value){
    if(window.MJApparelPricing && typeof window.MJApparelPricing.gross === "function") return window.MJApparelPricing.gross(value);
    return Number(value || 0) * 1.21;
  }

  function loadInquiry(){
    try {
      const raw = localStorage.getItem(storageKey);
      inquiry = raw ? JSON.parse(raw) : [];
      if(!Array.isArray(inquiry)) inquiry = [];
    } catch(e) {
      inquiry = [];
    }
  }

  function saveInquiry(){
    try {
      localStorage.setItem(storageKey, JSON.stringify(inquiry));
    } catch(e) {}
  }

  function makeSummary(){
    if(!inquiry.length) return "";
    const lines = [labels.inquiryHeader, ""];
    inquiry.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name}`);
      lines.push(`   Kod: ${item.code}`);
      lines.push(`   ${lang === "nl" ? "Maat" : "Rozmiar"}: ${item.size}`);
      lines.push(`   ${lang === "nl" ? "Kleur" : "Kolor"}: ${item.color}`);
      lines.push(`   ${lang === "nl" ? "Aantal" : "Ilość"}: ${item.qty}`);
      if(Array.isArray(item.prints) && item.prints.length){
        lines.push(`   ${lang === "nl" ? "Bedrukking" : "Nadruk"}: ${item.prints.map(p => p.label).join("; ")}`);
      } else {
        lines.push(`   ${lang === "nl" ? "Bedrukking" : "Nadruk"}: ${lang === "nl" ? "zonder bedrukking" : "bez nadruku"}`);
      }
      if(Number.isFinite(Number(item.basePrice))){
        const unitNet = Number(item.unitNet || item.basePrice || 0);
        const totalNet = Number(item.totalNet || 0);
        lines.push(`   ${lang === "nl" ? "Prijs vanaf netto" : "Cena od netto"}: ${formatPrice(item.basePrice)}`);
        lines.push(`   ${lang === "nl" ? "Prijs vanaf bruto" : "Cena od brutto"}: ${formatPrice(Number.isFinite(Number(item.baseGross)) ? item.baseGross : grossPrice(item.basePrice))}`);
        lines.push(`   ${lang === "nl" ? "Bedrukking netto / stuk" : "Nadruk netto / szt."}: ${formatPrice(item.printPrice || 0)}`);
        lines.push(`   ${lang === "nl" ? "Bedrukking bruto / stuk" : "Nadruk brutto / szt."}: ${formatPrice(Number.isFinite(Number(item.printGross)) ? item.printGross : grossPrice(item.printPrice || 0))}`);
        lines.push(`   ${lang === "nl" ? "Prijs netto / stuk" : "Cena netto / szt."}: ${formatPrice(unitNet)}`);
        lines.push(`   ${lang === "nl" ? "Prijs bruto / stuk" : "Cena brutto / szt."}: ${formatPrice(Number.isFinite(Number(item.unitGross)) ? item.unitGross : grossPrice(unitNet))}`);
        lines.push(`   ${lang === "nl" ? "Totaal netto" : "Razem netto"}: ${formatPrice(totalNet)}`);
        lines.push(`   ${lang === "nl" ? "Totaal bruto" : "Razem brutto"}: ${formatPrice(Number.isFinite(Number(item.totalGross)) ? item.totalGross : grossPrice(totalNet))}`);
      }
      lines.push("");
    });
    const sum = inquiry.reduce((acc, item) => acc + safeQty(item.qty), 0);
    lines.push(lang === "nl" ? `Totaal: ${sum} stuks` : `Razem: ${sum} szt.`);
    lines.push("");
    lines.push(labels.graphicsLine);
    return lines.join("\n");
  }

  function updateSendLink(){
    if(!sendBtn) return;
    const message = makeSummary();
    if(!inquiry.length){
      sendBtn.classList.add("is-disabled");
      sendBtn.href = labels.sendBase;
      return;
    }
    sendBtn.classList.remove("is-disabled");
    const first = inquiry[0] || {};
    sendBtn.href = `${labels.sendBase}?produkt=${encodeURIComponent("zapytanie-zbiorcze")}&rozmiar=${encodeURIComponent("różne")}&kolor=${encodeURIComponent("różne")}&ilosc=${encodeURIComponent(inquiry.reduce((acc, item) => acc + safeQty(item.qty), 0))}&wiadomosc=${encodeURIComponent(message)}&dtf_zapytanie=1`;
  }

  function renderInquiry(){
    if(!inquiryTbody) return;

    inquiryTbody.innerHTML = "";
    const sum = inquiry.reduce((acc, item) => acc + safeQty(item.qty), 0);

    if(totalItems) totalItems.textContent = String(sum);
    if(inquiryEmpty) {
      inquiryEmpty.hidden = inquiry.length > 0;
      inquiryEmpty.textContent = labels.empty;
    }
    if(inquiryTableWrap) inquiryTableWrap.hidden = inquiry.length === 0;
    if(clearBtn) clearBtn.hidden = inquiry.length === 0;

    inquiry.forEach((item, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="dtf-item-product"><b></b><small></small></span></td>
        <td></td>
        <td><span class="dtf-item-color"></span></td>
        <td></td>
        <td><button class="dtf-remove" type="button" data-remove-index="${index}">${labels.remove}</button></td>
      `;
      tr.querySelector("b").textContent = item.name || "";
      const details = [];
      if(item.code) details.push(`Kod: ${item.code}`);
      if(Array.isArray(item.prints) && item.prints.length) details.push(item.prints.map(p => p.label).join(" • "));
      if(Number.isFinite(Number(item.unitNet))){
        details.push(`${lang === "nl" ? "netto/st." : "netto/szt."} ${formatPrice(item.unitNet)}`);
        details.push(`${lang === "nl" ? "bruto/st." : "brutto/szt."} ${formatPrice(Number.isFinite(Number(item.unitGross)) ? item.unitGross : grossPrice(item.unitNet))}`);
      }
      tr.querySelector("small").textContent = details.join(" · ");
      tr.children[1].textContent = item.size || "";
      tr.querySelector(".dtf-item-color").textContent = item.color || "";
      tr.children[3].textContent = item.qty || "";
      inquiryTbody.appendChild(tr);
    });

    inquiryTbody.querySelectorAll("[data-remove-index]").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.dataset.removeIndex, 10);
        inquiry.splice(i, 1);
        saveInquiry();
        renderInquiry();
      });
    });

    updateSendLink();
  }

  function getSelection(card){
    const code = card.dataset.code || "";
    const name = card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "";
    const sizeBtn = card.querySelector(".product-size.is-selected");
    const colorBtn = card.querySelector(".product-color.is-selected");
    const qtyInput = card.querySelector("[data-qty]");
    const size = sizeBtn ? sizeBtn.dataset.size : "";
    const color = normalizeColorCode(colorBtn ? colorBtn.dataset.colorCode : "");
    const qty = safeQty(qtyInput ? qtyInput.value : 1);
    const pricing = window.MJApparelPricing && typeof window.MJApparelPricing.getPricing === "function"
      ? window.MJApparelPricing.getPricing(card, qty)
      : null;
    return {
      code, name, size, color, qty,
      prints: pricing ? pricing.prints : [],
      basePrice: pricing ? pricing.basePrice : undefined,
      baseGross: pricing ? pricing.baseGross : undefined,
      printPrice: pricing ? pricing.printPrice : undefined,
      printGross: pricing ? pricing.printGross : undefined,
      unitNet: pricing ? pricing.unitNet : undefined,
      unitGross: pricing ? pricing.unitGross : undefined,
      totalNet: pricing ? pricing.totalNet : undefined,
      totalGross: pricing ? pricing.totalGross : undefined,
      customQuote: pricing ? pricing.customQuote : false
    };
  }

  function addToInquiry(card){
    const item = getSelection(card);
    const itemPrintKey = (item.prints || []).map(p => p.key).sort().join("|");
    const existing = inquiry.find(x => x.code === item.code && x.size === item.size && x.color === item.color && ((x.prints || []).map(p => p.key).sort().join("|")) === itemPrintKey);
    if(existing){
      existing.qty = safeQty(existing.qty) + item.qty;
      if(Number.isFinite(Number(item.unitNet))){
        existing.unitNet = Number(item.unitNet);
        existing.unitGross = Number.isFinite(Number(item.unitGross)) ? Number(item.unitGross) : grossPrice(item.unitNet);
        existing.totalNet = Number(item.unitNet) * existing.qty;
        existing.totalGross = grossPrice(existing.totalNet);
      }
    } else {
      inquiry.push(item);
    }
    saveInquiry();
    renderInquiry();

    if(inquiryBox){
      inquiryBox.classList.add("is-highlighted");
      setTimeout(() => inquiryBox.classList.remove("is-highlighted"), 700);
    }
  }

  function showAddedFeedback(card){
    let inline = card.querySelector("[data-add-feedback]");
    if(!inline){
      inline = document.createElement("div");
      inline.className = "sales-add-feedback";
      inline.setAttribute("data-add-feedback", "");
      inline.setAttribute("role", "status");
      inline.setAttribute("aria-live", "polite");
      const addBtn = card.querySelector("[data-add-to-inquiry]");
      if(addBtn) addBtn.insertAdjacentElement("afterend", inline);
      else card.appendChild(inline);
    }
    inline.textContent = `✓ ${labels.added}`;
    inline.classList.remove("is-visible");
    void inline.offsetWidth;
    inline.classList.add("is-visible");
    window.clearTimeout(inline._mjTimer);
    inline._mjTimer = window.setTimeout(() => inline.classList.remove("is-visible"), 4200);

    if(!feedbackToast){
      feedbackToast = document.createElement("div");
      feedbackToast.className = "mj-inquiry-toast";
      feedbackToast.setAttribute("role", "status");
      feedbackToast.setAttribute("aria-live", "polite");
      document.body.appendChild(feedbackToast);
    }
    feedbackToast.textContent = `✓ ${labels.added}`;
    feedbackToast.classList.remove("is-visible");
    void feedbackToast.offsetWidth;
    feedbackToast.classList.add("is-visible");
    window.clearTimeout(feedbackToast._mjTimer);
    feedbackToast._mjTimer = window.setTimeout(() => feedbackToast.classList.remove("is-visible"), 3200);
  }

  function escapeSvgText(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function getColorPaint(card, color){
    const cleanColor = normalizeColorCode(color || "");
    const btn = Array.from(card.querySelectorAll(".product-color")).find(b => normalizeColorCode(b.dataset.colorCode || "") === cleanColor);
    let swatch = "";
    if(btn){
      swatch = (btn.style && btn.style.getPropertyValue("--swatch")) || "";
      if(!swatch && window.getComputedStyle) swatch = getComputedStyle(btn).getPropertyValue("--swatch") || "";
    }
    const hex = String(swatch).match(/#[0-9a-f]{3,8}/i);
    if(hex) return hex[0];
    const special = {
      "21":"#3b4f70",
      "290":"#00a06f"
    };
    return special[cleanColor] || "#7b8580";
  }

  function makeColorFallback(card, color){
    const cleanColor = normalizeColorCode(color || "");
    const paint = getColorPaint(card, cleanColor);
    const title = card.querySelector("h3")?.textContent?.trim() || (document.documentElement.lang === "nl" ? "Product" : "Produkt");
    const code = card.querySelector(".sales-code")?.textContent?.replace(/^Kod\s*/i, "")?.trim() || "";
    const dark = /^#(?:0{3,6}|0[0-9a-f]{5}|1[0-9a-f]{5}|2[0-9a-f]{5}|3[0-9a-f]{5})$/i.test(paint);
    const stroke = dark ? "#dbe5df" : "#26302c";
    const label = document.documentElement.lang === "nl" ? "Kleur" : "Kolor";
    const preview = document.documentElement.lang === "nl" ? "Kleurvoorbeeld" : "Podgląd koloru";
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 680" role="img" aria-label="${escapeSvgText(title)} — ${label} ${escapeSvgText(cleanColor)}">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#f7faf8"/>
            <stop offset=".58" stop-color="#eef4f0"/>
            <stop offset="1" stop-color="#dfe8e3"/>
          </linearGradient>
          <radialGradient id="glow" cx="80%" cy="18%" r="70%">
            <stop offset="0" stop-color="#47df00" stop-opacity=".24"/>
            <stop offset="1" stop-color="#47df00" stop-opacity="0"/>
          </radialGradient>
          <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#0a0e0c" flood-opacity=".22"/>
          </filter>
        </defs>
        <rect width="900" height="680" rx="42" fill="url(#bg)"/>
        <circle cx="760" cy="100" r="185" fill="url(#glow)"/>
        <g filter="url(#shadow)">
          <path d="M288 166l90-60h144l90 60 114 76-60 122-78-42v246H312V322l-78 42-60-122 114-76z" fill="${paint}" stroke="${stroke}" stroke-width="7" stroke-linejoin="round"/>
          <path d="M392 120c14 34 34 51 58 51s44-17 58-51" fill="none" stroke="#47df00" stroke-width="12" stroke-linecap="round"/>
        </g>
        <rect x="56" y="46" width="220" height="54" rx="27" fill="#07100b"/>
        <text x="84" y="81" font-family="Arial,sans-serif" font-size="24" font-weight="800" fill="#47df00">${escapeSvgText(label.toUpperCase())} ${escapeSvgText(cleanColor)}</text>
        <text x="70" y="620" font-family="Arial,sans-serif" font-size="30" font-weight="800" fill="#07100b">${escapeSvgText(title)}</text>
        <text x="70" y="652" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#51605a">${escapeSvgText(preview)}${code ? " • " + escapeSvgText(code) : ""}</text>
      </svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function updatePhoto(card, color){
    const img = card.querySelector("img.sales-photo");
    if(!img) return;

    const cleanColor = normalizeColorCode(color || "");
    const mapRaw = img.getAttribute("data-photo-map");
    let nextSrc = "";

    if(mapRaw){
      try {
        const photoMap = JSON.parse(mapRaw);
        nextSrc = photoMap[cleanColor] || "";
      } catch(e) {}
    }

    if(!nextSrc){
      const template = img.getAttribute("data-photo-template");
      if(template && cleanColor) nextSrc = template.replace("{color}", encodeURIComponent(cleanColor));
    }

    if(!cleanColor) return;

    const requestId = `${cleanColor}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    img.dataset.photoRequest = requestId;
    img.dataset.selectedColor = cleanColor;
    img.classList.add("is-loading-color");

    const colorFallback = makeColorFallback(card, cleanColor);
    const compactMode = (window.matchMedia && window.matchMedia("(max-width: 760px)").matches) ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);

    if(!nextSrc){
      img.onerror = null;
      img.onload = null;
      img.src = colorFallback;
      img.setAttribute("data-photo-active", colorFallback);
      img.classList.remove("is-loading-color");
      img.classList.add("has-photo-fallback");
      return;
    }

    if(compactMode){
      // Na telefonie/PWA natychmiast pokazuj faktycznie wybrany kolor, a zdjęcie producenta
      // dociągaj w tle. Dzięki temu awaria hotlinku nie pozostawia poprzedniego koloru.
      img.onerror = null;
      img.onload = null;
      img.src = colorFallback;
      img.setAttribute("data-photo-active", colorFallback);
      img.classList.add("has-photo-fallback");

      const probe = new Image();
      probe.referrerPolicy = "no-referrer";
      probe.onload = function(){
        if(img.dataset.photoRequest !== requestId || img.dataset.selectedColor !== cleanColor) return;
        img.src = nextSrc;
        img.setAttribute("data-photo-active", nextSrc);
        img.classList.remove("is-loading-color");
        img.classList.remove("has-photo-fallback");
      };
      probe.onerror = function(){
        if(img.dataset.photoRequest !== requestId || img.dataset.selectedColor !== cleanColor) return;
        img.classList.remove("is-loading-color");
        img.classList.add("has-photo-fallback");
      };
      probe.src = nextSrc;
      return;
    }

    // Desktop zachowuje dotychczasowy sposób przełączania zdjęć. Jedyna zmiana:
    // w razie niedostępności zdjęcia pokazuje podgląd WYBRANEGO koloru, nie stare zdjęcie.
    img.onerror = function(){
      if(img.dataset.photoRequest !== requestId || img.dataset.selectedColor !== cleanColor) return;
      img.onerror = null;
      img.onload = null;
      img.src = colorFallback;
      img.setAttribute("data-photo-active", colorFallback);
      img.classList.remove("is-loading-color");
      img.classList.add("has-photo-fallback");
    };
    img.onload = function(){
      if(img.dataset.photoRequest !== requestId || img.dataset.selectedColor !== cleanColor) return;
      img.classList.remove("is-loading-color");
      img.classList.remove("has-photo-fallback");
    };
    if(img.src !== nextSrc){
      img.src = nextSrc;
      img.setAttribute("data-photo-active", nextSrc);
    } else {
      img.classList.remove("is-loading-color");
    }
  }

  function updateLink(card){
    const item = getSelection(card);
    const link = card.querySelector("[data-single-inquiry-link]");
    const summary = card.querySelector("[data-selected-summary]");

    if(summary){
      const printLabel = Array.isArray(item.prints) && item.prints.length
        ? item.prints.map(p => p.label).join(" • ")
        : (lang === "nl" ? "zonder bedrukking" : "bez nadruku");
      const priceLabel = Number.isFinite(Number(item.unitNet))
        ? ` · ${formatPrice(item.unitNet)} ${lang === "nl" ? "netto/st." : "netto/szt."} · ${formatPrice(Number.isFinite(Number(item.unitGross)) ? item.unitGross : grossPrice(item.unitNet))} ${lang === "nl" ? "bruto/st." : "brutto/szt."}`
        : "";
      summary.textContent = `${labels.chosen}: ${item.size}, ${labels.color} ${item.color}, ${labels.qty} ${item.qty} · ${lang === "nl" ? "bedrukking" : "nadruk"}: ${printLabel}${priceLabel}`;
    }

    if(link){
      let msg = labels.message(item.code, item.name, item.size, item.color, item.qty);
      if(Array.isArray(item.prints) && item.prints.length) msg += ` ${lang === "nl" ? "Gekozen bedrukking" : "Wybrane nadruki"}: ${item.prints.map(p => p.label).join("; ")}.`;
      if(Number.isFinite(Number(item.unitNet))){
        msg += ` ${lang === "nl" ? "Prijs netto per stuk" : "Cena netto za sztukę"}: ${formatPrice(item.unitNet)}.`;
        msg += ` ${lang === "nl" ? "Prijs bruto per stuk" : "Cena brutto za sztukę"}: ${formatPrice(Number.isFinite(Number(item.unitGross)) ? item.unitGross : grossPrice(item.unitNet))}.`;
      }
      const base = card.dataset.contact || labels.sendBase;
      link.href = `${base}?produkt=${encodeURIComponent(item.code)}&rozmiar=${encodeURIComponent(item.size)}&kolor=${encodeURIComponent(item.color)}&ilosc=${encodeURIComponent(item.qty)}&wiadomosc=${encodeURIComponent(msg)}`;
    }
  }

  function applyFilters(){
    let n = 0;
    cards.forEach(card => {
      const hay = (card.innerText + " " + (card.dataset.name || "") + " " + (card.dataset.code || "")).toLowerCase();
      const okCat = active === "all" || card.dataset.category === active;
      const okQuery = !query || hay.includes(query.toLowerCase());
      const ok = okCat && okQuery;
      card.hidden = !ok;
      if(ok) n++;
    });
    if(count) count.textContent = n;
    if(empty) empty.classList.toggle("is-visible", n === 0);
  }

  cards.forEach(card => {
    const firstSize = card.querySelector(".product-size.is-selected") || card.querySelector(".product-size");
    const firstColor = card.querySelector(".product-color.is-selected") || card.querySelector(".product-color");

    if(firstSize) firstSize.classList.add("is-selected");
    if(firstColor) firstColor.classList.add("is-selected");

    if(firstColor){
      firstColor.dataset.colorCode = normalizeColorCode(firstColor.dataset.colorCode || "");
      updatePhoto(card, firstColor.dataset.colorCode || "");
    }
    // Domyślna ilość produktu zawsze startuje od 1.
    // Jawne ustawienie w JS zapobiega przywróceniu starej wartości przez przeglądarkę.
    const initialQty = card.querySelector("[data-qty]");
    if(initialQty) initialQty.value = "1";
    updateLink(card);
    card.addEventListener("mj-pricing-change", () => updateLink(card));

    card.querySelectorAll(".product-size").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".product-size").forEach(b => b.classList.toggle("is-selected", b === btn));
        updateLink(card);
      });
    });

    card.querySelectorAll(".product-color").forEach(btn => {
      btn.addEventListener("click", () => {
        const color = normalizeColorCode(btn.dataset.colorCode || "");
        btn.dataset.colorCode = color;
        const codeSpan = btn.querySelector(".color-code");
        if(codeSpan) codeSpan.textContent = color;
        card.querySelectorAll(".product-color").forEach(b => b.classList.toggle("is-selected", b === btn));
        updatePhoto(card, color);
        updateLink(card);
      });
    });

    const qty = card.querySelector("[data-qty]");
    if(qty) {
      // Pole ilości ma być bezproblemowo edytowalne także w lokalnym podglądzie
      // i na urządzeniach mobilnych. Zaznaczamy wartość po wejściu do pola,
      // przepuszczamy wyłącznie cyfry i nie nadpisujemy wartości podczas pisania.
      qty.addEventListener("focus", () => {
        requestAnimationFrame(() => {
          try { qty.select(); } catch(e) {}
        });
      });
      qty.addEventListener("input", () => {
        const clean = String(qty.value || "").replace(/\D+/g, "").slice(0, 6);
        if(qty.value !== clean) qty.value = clean;
        updateLink(card);
      });
      qty.addEventListener("blur", () => {
        if(!String(qty.value || "").trim()) qty.value = "1";
        updateLink(card);
      });
    }

    const addBtn = card.querySelector("[data-add-to-inquiry]");
    if(addBtn) {
      const originalLabel = addBtn.textContent.trim();
      addBtn.setAttribute("aria-live", "polite");
      addBtn.addEventListener("click", () => {
        addToInquiry(card);
        showAddedFeedback(card);
        addBtn.textContent = `✓ ${labels.added}`;
        addBtn.classList.add("is-added");
        window.clearTimeout(addBtn._mjAddedTimer);
        addBtn._mjAddedTimer = window.setTimeout(() => {
          addBtn.textContent = originalLabel;
          addBtn.classList.remove("is-added");
        }, 2200);
      });
    }

    const open = card.querySelector("[data-open-product]");
    if(open) open.addEventListener("click", () => {
      card.scrollIntoView({behavior:"smooth", block:"center"});
      const img = card.querySelector(".sales-photo");
      if(img){
        img.classList.add("is-selected");
        setTimeout(() => img.classList.remove("is-selected"), 1100);
      }
    });
  });

  filters.forEach(btn => {
    btn.addEventListener("click", () => {
      active = btn.dataset.salesFilter || "all";
      filters.forEach(b => b.classList.toggle("is-active", b === btn));
      applyFilters();
    });
  });

  if(search){
    search.addEventListener("input", () => {
      query = search.value.trim();
      applyFilters();
    });
  }

  if(clearBtn){
    clearBtn.addEventListener("click", () => {
      inquiry = [];
      saveInquiry();
      renderInquiry();
    });
  }

  loadInquiry();
  renderInquiry();
  applyFilters();
})();
