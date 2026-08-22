
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
      sendBase: "/pl/kontakt.html",
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
      sendBase: "/nl/kontakt.html",
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
      lines.push("");
    });
    const sum = inquiry.reduce((acc, item) => acc + safeQty(item.qty), 0);
    lines.push(`${lang === "nl" ? "Totaal" : "Razem"}: ${sum} ${lang === "nl" ? "stuks" : "szt."}`);
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
      tr.querySelector("small").textContent = item.code ? `Kod: ${item.code}` : "";
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
    return { code, name, size, color, qty };
  }

  function addToInquiry(card){
    const item = getSelection(card);
    const existing = inquiry.find(x => x.code === item.code && x.size === item.size && x.color === item.color);
    if(existing){
      existing.qty = safeQty(existing.qty) + item.qty;
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

  function updatePhoto(card, color){
    const img = card.querySelector("img.sales-photo");
    if(!img) return;

    const cleanColor = normalizeColorCode(color || "");
    const mapRaw = img.getAttribute("data-photo-map");
    const fallback = img.getAttribute("data-default-src") || img.getAttribute("src");
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

    if(!nextSrc) return;

    img.classList.add("is-loading-color");

    img.onerror = function(){
      img.onerror = null;
      img.src = fallback;
      img.classList.remove("is-loading-color");
      img.classList.add("has-photo-fallback");
    };

    img.onload = function(){
      img.classList.remove("is-loading-color");
      img.classList.remove("has-photo-fallback");
    };

    if(img.src !== nextSrc){
      img.src = nextSrc;
      img.setAttribute("data-photo-active", nextSrc);
    }
  }

  function updateLink(card){
    const item = getSelection(card);
    const link = card.querySelector("[data-single-inquiry-link]");
    const summary = card.querySelector("[data-selected-summary]");

    if(summary){
      summary.textContent = `${labels.chosen}: ${item.size}, ${labels.color} ${item.color}, ${labels.qty} ${item.qty}`;
    }

    if(link){
      const msg = labels.message(item.code, item.name, item.size, item.color, item.qty);
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
    updateLink(card);

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
    if(qty) qty.addEventListener("input", () => updateLink(card));

    const addBtn = card.querySelector("[data-add-to-inquiry]");
    if(addBtn) {
      addBtn.addEventListener("click", () => addToInquiry(card));
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
