
(function () {
  const params = new URLSearchParams(window.location.search);
  const isNl = document.documentElement.lang === "nl";

  const fields = {
    product_code: params.get("produkt") || params.get("product_code") || "",
    product_size: params.get("rozmiar") || "",
    product_color: (params.get("kolor") === "29" ? "290" : (params.get("kolor") || "")),
    product_quantity: params.get("ilosc") || "",
    product_inquiry: params.get("dtf_zapytanie") === "1" ? "zbiorcze zapytanie DTF" : ""
  };

  const messageFromUrl = params.get("wiadomosc");
  let message = messageFromUrl || "";

  if (!message && params.get("dtf_zapytanie") === "1") {
    try {
      const raw = localStorage.getItem("mjDtfInquiryItems");
      const items = raw ? JSON.parse(raw) : [];
      if (Array.isArray(items) && items.length) {
        const lines = [
          isNl ? "Graag ontvang ik een offerte voor kleding met DTF-bedrukking:" : "Proszę o wycenę odzieży do druku DTF:",
          ""
        ];
        items.forEach((item, index) => {
          lines.push(`${index + 1}. ${item.name || ""}`);
          lines.push(`   Kod: ${item.code || ""}`);
          lines.push(`   Rozmiar/Maat: ${item.size || ""}`);
          lines.push(`   Kolor/Kleur: ${item.color || ""}`);
          lines.push(`   Ilość/Aantal: ${item.qty || ""}`);
          lines.push("");
        });
        const total = items.reduce((acc, item) => acc + (parseInt(item.qty, 10) || 0), 0);
        lines.push(`Razem/Totaal: ${total} szt.`);
        lines.push("");
        lines.push(isNl ? "Het ontwerp / logo voor DTF-bedrukking voeg ik toe als bijlage of stuur ik na contact door." : "Grafikę / logo do nadruku DTF dołączam w załączniku albo prześlę po kontakcie.");
        message = lines.join("\n");
      }
    } catch(e) {}
  }

  const form = document.querySelector("form");
  if (form) {
    Object.entries(fields).forEach(([name, value]) => {
      let input = form.querySelector(`[name="${name}"]`);
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        form.prepend(input);
      }
      input.value = value;
    });
  }

  const textarea = document.querySelector("textarea[name='message'], textarea[name='wiadomosc'], textarea");
  if (textarea && message && !textarea.value.trim()) {
    textarea.value = message;
  }

  const contactForm = document.querySelector("form");
  if (contactForm && !document.querySelector(".dtf-upload-note")) {
    const note = document.createElement("div");
    note.className = "dtf-upload-note";
    note.innerHTML = isNl
      ? "<strong>DTF-bedrukking:</strong> voeg je logo, ontwerp of grafische bestanden toe als bijlage. Dat helpt ons om de offerte nauwkeuriger te maken."
      : "<strong>Druk DTF:</strong> dołącz logo, projekt lub pliki graficzne jako załącznik. To pomoże przygotować dokładniejszą wycenę.";
    contactForm.insertBefore(note, contactForm.firstChild);
  }
})();
