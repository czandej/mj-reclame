(function(){
  const lang = document.documentElement.lang === 'nl' ? 'nl' : 'pl';
  const VAT_RATE = 0.21;

  const PRODUCT_PRICES = {
    '21172': 6.50,
    '22160': 6.00,
    '21150': 6.10,
    '21149': 4.08,
    '21174': 6.50,
    '21185': 7.50,
    '21187': 7.10,
    '21204': 9.50,
    '21203': 8.50,
    '21600': 13.60,
    '21603': 12.10,
    '21400': 12.00
  };

  const PRINT_OPTIONS = [
    { key:'chest-left',  group:'chest-left',   price:3.00, side:'front', pl:'Lewa pierś — małe logo',          nl:'Linkerborst — klein logo' },
    { key:'chest-right', group:'chest-right',  price:3.00, side:'front', pl:'Prawa pierś — małe logo',         nl:'Rechterborst — klein logo' },
    { key:'sleeve-left', group:'sleeve-left',  price:3.00, side:'front', pl:'Lewy rękaw — małe logo',          nl:'Linkermouw — klein logo' },
    { key:'sleeve-right',group:'sleeve-right', price:3.00, side:'front', pl:'Prawy rękaw — małe logo',         nl:'Rechtermouw — klein logo' },
    { key:'front-a5',    group:'front-center', price:4.50, side:'front', pl:'Przód — nadruk A5',               nl:'Voorzijde — print A5' },
    { key:'back-large',  group:'back-large',   price:6.00, side:'back',  pl:'Plecy — duży nadruk',             nl:'Rug — grote print' },
    { key:'custom',      group:'custom',       price:null, side:'other', pl:'Inne miejsce — wycena indywidualna', nl:'Andere positie — individuele offerte' }
  ];

  const text = {
    pl: {
      base:'Cena od', net:'netto', gross:'brutto', print:'Nadruk', one:'1 szt. z wybranym nadrukiem', total:'Razem netto', totalGross:'Razem brutto', shipping:'Koszt wysyłki zostanie doliczony osobno.',
      choose:'Wybierz miejsce nadruku', hint:'Możesz zaznaczyć kilka miejsc jednocześnie. Na środku przodu dostępny jest nadruk A5.',
      front:'PRZÓD', back:'TYŁ', frontGroup:'Przód i rękawy', backGroup:'Tył / inne', custom:'Pozycja niestandardowa wymaga indywidualnej wyceny.',
      pricingTitle:'Jak liczona jest cena?', pricingLead:'Cena końcowa = koszulka bazowa + wybrane nadruki DTF + wysyłka.',
      step1:'1. Wybierz koszulkę', step2:'2. Wybierz miejsca nadruku', step3:'3. Podaj ilość', step4:'4. Wysyłkę doliczymy osobno',
      noPrint:'bez nadruku', selectedPrint:'Wybrane nadruki', components:'Składowe ceny / 1 szt.', shirt:'Koszulka', qtyLabel:'Ilość sztuk', individual:'wycena indywidualna'
    },
    nl: {
      base:'Prijs vanaf', net:'netto', gross:'bruto', print:'Bedrukking', one:'1 stuk met gekozen bedrukking', total:'Totaal netto', totalGross:'Totaal bruto', shipping:'Verzendkosten worden apart toegevoegd.',
      choose:'Kies de printpositie', hint:'Je kunt meerdere posities tegelijk kiezen. Midden op de voorzijde is printformaat A5 beschikbaar.',
      front:'VOORZIJDE', back:'ACHTERZIJDE', frontGroup:'Voorzijde en mouwen', backGroup:'Achterzijde / anders', custom:'Een afwijkende positie wordt individueel geoffreerd.',
      pricingTitle:'Hoe wordt de prijs berekend?', pricingLead:'Eindprijs = basisprijs kleding + gekozen DTF-prints + verzending.',
      step1:'1. Kies kleding', step2:'2. Kies printposities', step3:'3. Vul het aantal in', step4:'4. Verzending apart',
      noPrint:'zonder bedrukking', selectedPrint:'Gekozen bedrukking', components:'Prijsopbouw / 1 stuk', shirt:'Kleding', qtyLabel:'Aantal stuks', individual:'individuele offerte'
    }
  }[lang];

  function money(value){
    const n = Number(value || 0);
    return new Intl.NumberFormat(lang === 'nl' ? 'nl-NL' : 'pl-PL', {minimumFractionDigits:2, maximumFractionDigits:2}).format(n) + ' €';
  }

  function gross(value){ return Number(value || 0) * (1 + VAT_RATE); }

  function optionByKey(key){ return PRINT_OPTIONS.find(o => o.key === key); }
  function labelOf(option){ return option ? option[lang] : ''; }

  function selectedKeys(card){
    return Array.from(card.querySelectorAll('[data-print-option].is-selected')).map(btn => btn.dataset.printOption);
  }

  function getPrintSelections(card){
    return selectedKeys(card).map(optionByKey).filter(Boolean).map(o => ({
      key:o.key,
      label:labelOf(o),
      price:o.price,
      custom:o.price === null
    }));
  }

  function safeQty(card, fallback){
    const input = card.querySelector('[data-qty]');
    const raw = fallback != null ? fallback : (input ? input.value : 1);
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  function getPricing(card, qtyOverride){
    const code = card.dataset.code || '';
    const basePrice = Number(PRODUCT_PRICES[code] || 0);
    const prints = getPrintSelections(card);
    const printPrice = prints.reduce((sum, p) => sum + (Number.isFinite(Number(p.price)) ? Number(p.price) : 0), 0);
    const qty = safeQty(card, qtyOverride);
    const unitNet = basePrice + printPrice;
    const totalNet = unitNet * qty;
    const baseGross = gross(basePrice);
    const printGross = gross(printPrice);
    const unitGross = gross(unitNet);
    const totalGross = gross(totalNet);
    return { code, basePrice, baseGross, prints, printPrice, printGross, unitNet, unitGross, qty, totalNet, totalGross, customQuote:prints.some(p => p.custom) };
  }

  function shirtSvg(side){
    const isFront = side === 'front';
    return `
      <svg viewBox="0 0 220 240" aria-hidden="true" focusable="false">
        <path class="shirt-shape" d="M65 34 91 20h38l26 14 42 28-23 43-25-14v126H71V91l-25 14-23-43 42-28Z"/>
        <path class="shirt-neck" d="M91 21c4 15 11 23 19 23s15-8 19-23"/>
        ${isFront ? `
          <circle class="map-dot" cx="87" cy="72" r="7"/><text class="map-text" x="76" y="66">L</text>
          <circle class="map-dot" cx="133" cy="72" r="7"/><text class="map-text" x="139" y="66">P</text>
          <rect class="map-area" x="82" y="91" width="56" height="79" rx="10"/><text class="map-center" x="110" y="139">A5</text>
          <circle class="map-dot" cx="38" cy="83" r="7"/><circle class="map-dot" cx="182" cy="83" r="7"/>
        ` : `
          <rect class="map-area map-area-back" x="72" y="68" width="76" height="112" rx="12"/><text class="map-center" x="110" y="126">DTF</text><text class="map-center" x="110" y="145">PLECY</text>
        `}
      </svg>`;
  }

  function makeOptionButton(option){
    const price = option.price === null ? (lang === 'nl' ? 'offerte' : 'wycena') : `+ ${money(option.price)}`;
    return `<button type="button" class="print-option" data-print-option="${option.key}" data-print-group="${option.group}">
      <span>${labelOf(option)}</span><strong>${price}</strong>
    </button>`;
  }

  function buildPrintConfigurator(card){
    const existing = card.querySelector('[data-print-config]');
    if(existing) return existing;
    const front = PRINT_OPTIONS.filter(o => o.side === 'front');
    const back = PRINT_OPTIONS.filter(o => o.side !== 'front');
    const details = document.createElement('details');
    details.className = 'print-config';
    details.setAttribute('data-print-config','');
    details.innerHTML = `
      <summary><span>${text.choose}</span><b>${lang === 'nl' ? 'open' : 'rozwiń'}</b></summary>
      <div class="print-config-body">
        <p class="print-hint">${text.hint}</p>
        <div class="print-map-row">
          <div class="print-map-card"><span>${text.front}</span>${shirtSvg('front')}</div>
          <div class="print-map-card"><span>${text.back}</span>${shirtSvg('back')}</div>
        </div>
        <div class="print-option-columns">
          <div><h4>${text.frontGroup}</h4>${front.map(makeOptionButton).join('')}</div>
          <div><h4>${text.backGroup}</h4>${back.map(makeOptionButton).join('')}</div>
        </div>
        <p class="print-custom-note" data-custom-note hidden>${text.custom}</p>
      </div>`;
    return details;
  }

  function buildPriceBox(card){
    const code = card.dataset.code || '';
    const base = PRODUCT_PRICES[code] || 0;
    const box = document.createElement('div');
    box.className = 'product-price-box';
    box.setAttribute('data-product-price-box','');
    box.innerHTML = `
      <div class="price-components-title">${text.components}</div>
      <div class="price-components" data-price-components>
        <div class="price-component-row price-component-base"><span>${text.shirt} ${code}</span><strong><span>${money(base)} ${text.net}</span><small>${money(gross(base))} ${text.gross}</small></strong></div>
      </div>
      <div class="price-row price-unit"><span>${text.one}</span><strong><span data-price-unit>${money(base)} ${text.net}</span><small data-price-unit-gross>${money(gross(base))} ${text.gross}</small></strong></div>
      <div class="price-row price-qty"><span>${text.qtyLabel}</span><strong data-price-qty>1</strong></div>
      <div class="price-row price-total"><span>${text.total}</span><strong data-price-total>${money(base)}</strong></div>
      <div class="price-row price-total price-total-gross"><span>${text.totalGross}</span><strong data-price-total-gross>${money(gross(base))}</strong></div>
      <p class="price-selected-print" data-price-selected-print>${text.selectedPrint}: ${text.noPrint}</p>
      <small>${text.shipping}</small>`;
    return box;
  }

  function refreshCard(card){
    const p = getPricing(card);
    const componentsEl = card.querySelector('[data-price-components]');
    const unitEl = card.querySelector('[data-price-unit]');
    const unitGrossEl = card.querySelector('[data-price-unit-gross]');
    const totalEl = card.querySelector('[data-price-total]');
    const totalGrossEl = card.querySelector('[data-price-total-gross]');
    const qtyEl = card.querySelector('[data-price-qty]');
    const printText = card.querySelector('[data-price-selected-print]');
    const customNote = card.querySelector('[data-custom-note]');
    if(componentsEl){
      const rows = [`<div class="price-component-row price-component-base"><span>${text.shirt} ${p.code}</span><strong><span>${money(p.basePrice)} ${text.net}</span><small>${money(p.baseGross)} ${text.gross}</small></strong></div>`];
      p.prints.forEach(print => {
        if(print.custom){
          rows.push(`<div class="price-component-row price-component-custom"><span>${print.label}</span><strong><span>${text.individual}</span></strong></div>`);
        } else {
          rows.push(`<div class="price-component-row"><span>${print.label}</span><strong><span>${money(print.price)} ${text.net}</span><small>${money(gross(print.price))} ${text.gross}</small></strong></div>`);
        }
      });
      if(!p.prints.length){
        rows.push(`<div class="price-component-row price-component-empty"><span>${text.print}</span><strong><span>${text.noPrint}</span></strong></div>`);
      }
      componentsEl.innerHTML = rows.join('');
    }
    if(unitEl) unitEl.textContent = `${money(p.unitNet)} ${text.net}`;
    if(unitGrossEl) unitGrossEl.textContent = `${money(p.unitGross)} ${text.gross}`;
    if(totalEl) totalEl.textContent = `${money(p.totalNet)}`;
    if(totalGrossEl) totalGrossEl.textContent = `${money(p.totalGross)}`;
    if(qtyEl) qtyEl.textContent = String(p.qty);
    if(printText){
      const names = p.prints.length ? p.prints.map(x => x.label).join(' • ') : text.noPrint;
      printText.textContent = `${text.selectedPrint}: ${names}`;
      printText.classList.toggle('has-print', p.prints.length > 0);
    }
    if(customNote) customNote.hidden = !p.customQuote;
    card.dataset.basePrice = String(p.basePrice);
    card.dispatchEvent(new CustomEvent('mj-pricing-updated', {bubbles:false, detail:p}));
  }

  function initCard(card){
    const code = card.dataset.code || '';
    if(!(code in PRODUCT_PRICES)) return;
    card.dataset.basePrice = String(PRODUCT_PRICES[code]);

    const h3 = card.querySelector('.sales-body h3');
    if(h3 && !card.querySelector('.sales-price-badge')){
      const badge = document.createElement('div');
      badge.className = 'sales-price-badge';
      badge.innerHTML = `<span>${text.base}</span><strong><b>${money(PRODUCT_PRICES[code])} ${text.net}</b><small>${money(gross(PRODUCT_PRICES[code]))} ${text.gross}</small></strong>`;
      h3.insertAdjacentElement('afterend', badge);
    }

    const qty = card.querySelector('[data-qty]');
    const qtyBlock = qty ? qty.closest('.sales-select-block') : null;
    const summary = card.querySelector('[data-selected-summary]');
    if(qtyBlock){
      const cfg = buildPrintConfigurator(card);
      qtyBlock.insertAdjacentElement('afterend', cfg);
      const priceBox = buildPriceBox(card);
      if(summary) summary.insertAdjacentElement('beforebegin', priceBox);
      else cfg.insertAdjacentElement('afterend', priceBox);
    }

    card.querySelectorAll('[data-print-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.printGroup || '';
        const isSelected = btn.classList.contains('is-selected');
        if(group === 'front-center'){
          card.querySelectorAll('[data-print-group="front-center"]').forEach(other => {
            other.classList.remove('is-selected');
            other.setAttribute('aria-pressed','false');
          });
        }
        btn.classList.toggle('is-selected', !isSelected);
        btn.setAttribute('aria-pressed', String(!isSelected));
        refreshCard(card);
        card.dispatchEvent(new CustomEvent('mj-pricing-change', {bubbles:false, detail:getPricing(card)}));
      });
      btn.setAttribute('aria-pressed','false');
    });

    if(qty){
      qty.addEventListener('input', () => refreshCard(card));
      qty.addEventListener('change', () => refreshCard(card));
    }
    refreshCard(card);
  }

  function injectIntro(){
    const grid = document.querySelector('[data-sales-grid]');
    if(!grid || document.querySelector('[data-pricing-intro]')) return;
    const host = grid.parentElement;
    const toolbar = host ? host.querySelector('.sales-toolbar') : null;
    const box = document.createElement('section');
    box.className = 'pricing-intro';
    box.setAttribute('data-pricing-intro','');
    box.innerHTML = `
      <div><span class="pricing-kicker">DTF</span><h3>${text.pricingTitle}</h3><p>${text.pricingLead}</p></div>
      <ol><li>${text.step1}</li><li>${text.step2}</li><li>${text.step3}</li><li>${text.step4}</li></ol>`;
    if(toolbar) toolbar.insertAdjacentElement('beforebegin', box);
    else grid.insertAdjacentElement('beforebegin', box);
  }

  function init(){
    injectIntro();
    document.querySelectorAll('[data-product-card]').forEach(initCard);
  }

  window.MJApparelPricing = {
    productPrices: PRODUCT_PRICES,
    printOptions: PRINT_OPTIONS,
    money,
    gross,
    VAT_RATE,
    getPrintSelections,
    getPricing,
    refreshCard,
    labelOf
  };

  init();
})();
