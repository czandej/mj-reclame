(function(){
  'use strict';

  // Przy każdej istotnej zmianie cookies/polityki prywatności zwiększ VERSION.
  // Zgoda użytkownika wygasa po 30 dniach.

  var STORAGE_KEY = 'mj_cookie_consent';
  var OLD_STORAGE_KEYS = ['mj_cookie_consent_v2', 'mj_cookie_consent_v1'];
  var VERSION = '2026-08-23-3';
  var CONSENT_MAX_AGE_DAYS = 30;
  var CONSENT_MAX_AGE_MS = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  var translations = {
    pl: {
      eyebrow:'Prywatność i cookies',
      title:'Ta strona używa plików cookies',
      text:'Używamy niezbędnych cookies do prawidłowego działania strony. Za Twoją zgodą możemy używać także cookies funkcjonalnych, analitycznych oraz marketingowych i reklamowych, w tym w przyszłości do reklam MJ Reclame, partnerów lub klientów.',
      acceptAll:'Akceptuję wszystkie',
      reject:'Odrzuć nieobowiązkowe',
      settings:'Ustawienia',
      modalTitle:'Ustawienia cookies',
      modalText:'Możesz wybrać, na które kategorie cookies wyrażasz zgodę. Cookies niezbędne są zawsze aktywne, ponieważ strona bez nich nie działa prawidłowo.',
      save:'Zapisz wybór',
      close:'Zamknij',
      necessaryTitle:'Niezbędne cookies',
      necessaryText:'Wymagane do działania strony, bezpieczeństwa, formularzy oraz zapamiętania Twoich ustawień cookies. Zawsze aktywne.',
      functionalTitle:'Funkcjonalne cookies',
      functionalText:'Pomagają zapamiętać ustawienia strony, np. preferencje językowe lub wygodę korzystania z formularzy.',
      analyticsTitle:'Analityczne cookies',
      analyticsText:'Pomagają mierzyć odwiedziny i działanie strony, aby poprawiać jej jakość i użyteczność.',
      marketingTitle:'Marketingowe i reklamowe cookies',
      marketingText:'Mogą służyć do wyświetlania i mierzenia reklam MJ Reclame, partnerów lub klientów oraz dopasowania treści reklamowych po uzyskaniu zgody.'
    },
    nl: {
      eyebrow:'Privacy en cookies',
      title:'Deze website gebruikt cookies',
      text:'Wij gebruiken noodzakelijke cookies om de website goed te laten werken. Met uw toestemming kunnen wij ook functionele, analytische en marketing-/advertentiecookies gebruiken, waaronder in de toekomst voor advertenties van MJ Reclame, partners of klanten.',
      acceptAll:'Alles accepteren',
      reject:'Niet-noodzakelijke weigeren',
      settings:'Instellingen',
      modalTitle:'Cookie-instellingen',
      modalText:'U kunt kiezen voor welke categorieën cookies u toestemming geeft. Noodzakelijke cookies zijn altijd actief, omdat de website zonder deze cookies niet goed werkt.',
      save:'Keuze opslaan',
      close:'Sluiten',
      necessaryTitle:'Noodzakelijke cookies',
      necessaryText:'Nodig voor de werking van de website, beveiliging, formulieren en het onthouden van uw cookie-instellingen. Altijd actief.',
      functionalTitle:'Functionele cookies',
      functionalText:'Helpen om website-instellingen te onthouden, bijvoorbeeld taalvoorkeuren of gebruiksgemak van formulieren.',
      analyticsTitle:'Analytische cookies',
      analyticsText:'Helpen bezoeken en de werking van de website te meten om kwaliteit en bruikbaarheid te verbeteren.',
      marketingTitle:'Marketing- en advertentiecookies',
      marketingText:'Kunnen worden gebruikt voor het tonen en meten van advertenties van MJ Reclame, partners of klanten en voor het afstemmen van advertentie-inhoud na toestemming.'
    },
    both: {
      eyebrow:'Privacy i cookies / Privacy en cookies',
      title:'Ta strona używa cookies / Deze website gebruikt cookies',
      text:'Używamy cookies niezbędnych do działania strony. Za zgodą użytkownika możemy używać także cookies funkcjonalnych, analitycznych oraz marketingowych i reklamowych. / Wij gebruiken noodzakelijke cookies. Met toestemming kunnen wij ook functionele, analytische en marketing-/advertentiecookies gebruiken.',
      acceptAll:'Akceptuję wszystkie / Alles accepteren',
      reject:'Odrzuć nieobowiązkowe / Niet-noodzakelijke weigeren',
      settings:'Ustawienia / Instellingen',
      modalTitle:'Ustawienia cookies / Cookie-instellingen',
      modalText:'Wybierz kategorie cookies. Cookies niezbędne są zawsze aktywne. / Kies cookiecategorieën. Noodzakelijke cookies zijn altijd actief.',
      save:'Zapisz wybór / Keuze opslaan',
      close:'Zamknij / Sluiten',
      necessaryTitle:'Niezbędne / Noodzakelijke cookies',
      necessaryText:'Wymagane do działania strony. / Nodig voor de werking van de website.',
      functionalTitle:'Funkcjonalne / Functionele cookies',
      functionalText:'Zapamiętują ustawienia strony. / Onthouden website-instellingen.',
      analyticsTitle:'Analityczne / Analytische cookies',
      analyticsText:'Pomagają mierzyć działanie strony. / Helpen de werking van de website te meten.',
      marketingTitle:'Marketingowe i reklamowe / Marketing- en advertentiecookies',
      marketingText:'Dla reklam MJ Reclame, partnerów lub klientów po uzyskaniu zgody. / Voor advertenties van MJ Reclame, partners of klanten na toestemming.'
    }
  };

  function getLang(){
    var htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    var path = location.pathname.toLowerCase();
    if(path.indexOf('/nl/') === 0 || htmlLang.indexOf('nl') === 0) return 'nl';
    if(path.indexOf('/pl/') === 0 || htmlLang.indexOf('pl') === 0) return 'pl';
    return 'both';
  }

  function t(){return translations[getLang()] || translations.both;}

  function readConsent(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      var data = JSON.parse(raw);
      if(!data || data.version !== VERSION) return null;
      if(!data.savedAt) return null;

      var savedTime = new Date(data.savedAt).getTime();
      if(!savedTime || isNaN(savedTime)) return null;

      if(Date.now() - savedTime > CONSENT_MAX_AGE_MS){
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return data;
    }catch(e){return null;}
  }

  function writeConsent(data){
    var now = new Date();
    var expires = new Date(now.getTime() + CONSENT_MAX_AGE_MS);
    var consent = {
      version: VERSION,
      necessary: true,
      functional: !!data.functional,
      analytics: !!data.analytics,
      marketing: !!data.marketing,
      savedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      maxAgeDays: CONSENT_MAX_AGE_DAYS
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    OLD_STORAGE_KEYS.forEach(function(key){ try{ localStorage.removeItem(key); }catch(e){} });
    window.mjCookieConsent = consent;
    document.dispatchEvent(new CustomEvent('mjCookieConsentChanged', { detail: consent }));
    runQueuedScripts(consent);
    return consent;
  }

  function hasConsent(category){
    var c = readConsent();
    if(category === 'necessary') return true;
    return !!(c && c[category]);
  }

  window.mjCookieConsentApi = {
    open: openSettings,
    get: readConsent,
    hasConsent: hasConsent,
    reset: function(){
      localStorage.removeItem(STORAGE_KEY);
      OLD_STORAGE_KEYS.forEach(function(key){ try{ localStorage.removeItem(key); }catch(e){} });
      location.reload();
    },
    version: VERSION,
    maxAgeDays: CONSENT_MAX_AGE_DAYS
  };

  function runQueuedScripts(consent){
    var scripts = document.querySelectorAll('script[type="text/plain"][data-cookie-category]');
    scripts.forEach(function(script){
      var category = script.getAttribute('data-cookie-category');
      if(!consent || !consent[category] || script.dataset.mjLoaded === 'true') return;
      var s = document.createElement('script');
      Array.prototype.slice.call(script.attributes).forEach(function(attr){
        if(attr.name !== 'type' && attr.name !== 'data-cookie-category' && attr.name !== 'data-mj-loaded'){
          s.setAttribute(attr.name, attr.value);
        }
      });
      s.text = script.text || script.textContent || '';
      script.dataset.mjLoaded = 'true';
      script.parentNode.insertBefore(s, script.nextSibling);
    });
  }

  function button(text, cls, action){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'mj-cookie-btn' + (cls ? ' ' + cls : '');
    b.textContent = text;
    b.addEventListener('click', action);
    return b;
  }

  function createBanner(){
    if(document.querySelector('.mj-cookie-initial-backdrop')) return;
    var lang = t();
    document.body.classList.add('mj-cookie-lock');

    var backdrop = document.createElement('div');
    backdrop.className = 'mj-cookie-initial-backdrop';
    backdrop.setAttribute('data-cookie-initial','true');

    var banner = document.createElement('div');
    banner.className = 'mj-cookie-banner';
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-modal','true');
    banner.setAttribute('aria-label', lang.title);
    banner.innerHTML = '<div class="mj-cookie-banner__grid"><div><p class="mj-cookie-eyebrow"></p><h2 class="mj-cookie-title"></h2><p class="mj-cookie-text"></p></div><div class="mj-cookie-actions"></div></div>';
    banner.querySelector('.mj-cookie-eyebrow').textContent = lang.eyebrow;
    banner.querySelector('.mj-cookie-title').textContent = lang.title;
    banner.querySelector('.mj-cookie-text').textContent = lang.text;

    var actions = banner.querySelector('.mj-cookie-actions');
    actions.appendChild(button(lang.acceptAll, 'mj-cookie-btn--green', function(){
      writeConsent({functional:true, analytics:true, marketing:true});
      closeBanner();
    }));
    actions.appendChild(button(lang.reject, 'mj-cookie-btn--muted', function(){
      writeConsent({functional:false, analytics:false, marketing:false});
      closeBanner();
    }));
    actions.appendChild(button(lang.settings, '', openSettings));

    backdrop.appendChild(banner);
    document.body.appendChild(backdrop);

    var firstButton = banner.querySelector('button');
    if(firstButton) setTimeout(function(){ firstButton.focus(); }, 50);
  }

  function closeBanner(){
    var b = document.querySelector('.mj-cookie-banner');
    if(b) b.remove();
    var initial = document.querySelector('.mj-cookie-initial-backdrop');
    if(initial) initial.remove();
    var m = document.querySelector('.mj-cookie-modal-backdrop');
    if(m) m.remove();
    document.body.classList.remove('mj-cookie-lock');
  }

  function categoryRow(id, title, text, checked, disabled){
    var row = document.createElement('div');
    row.className = 'mj-cookie-category';
    row.innerHTML = '<div><h3></h3><p></p></div><label class="mj-cookie-switch"><input type="checkbox"><span class="mj-cookie-slider"></span></label>';
    row.querySelector('h3').textContent = title;
    row.querySelector('p').textContent = text;
    var input = row.querySelector('input');
    input.id = id;
    input.checked = !!checked;
    input.disabled = !!disabled;
    return row;
  }

  function openSettings(evt){
    if(evt && evt.preventDefault) evt.preventDefault();
    var existing = document.querySelector('.mj-cookie-modal-backdrop');
    if(existing) existing.remove();
    document.body.classList.add('mj-cookie-lock');
    var lang = t();
    var saved = readConsent() || {necessary:true,functional:false,analytics:false,marketing:false};
    var backdrop = document.createElement('div');
    backdrop.className = 'mj-cookie-modal-backdrop';
    backdrop.innerHTML = '<div class="mj-cookie-modal" role="dialog" aria-modal="true"><div class="mj-cookie-modal__head"><p class="mj-cookie-eyebrow"></p><h2></h2><p class="mj-cookie-modal-text"></p></div><div class="mj-cookie-modal__body"></div><div class="mj-cookie-modal__foot"></div></div>';
    backdrop.querySelector('.mj-cookie-eyebrow').textContent = lang.eyebrow;
    backdrop.querySelector('h2').textContent = lang.modalTitle;
    backdrop.querySelector('.mj-cookie-modal-text').textContent = lang.modalText;
    var body = backdrop.querySelector('.mj-cookie-modal__body');
    body.appendChild(categoryRow('mj-cookie-necessary', lang.necessaryTitle, lang.necessaryText, true, true));
    body.appendChild(categoryRow('mj-cookie-functional', lang.functionalTitle, lang.functionalText, saved.functional, false));
    body.appendChild(categoryRow('mj-cookie-analytics', lang.analyticsTitle, lang.analyticsText, saved.analytics, false));
    body.appendChild(categoryRow('mj-cookie-marketing', lang.marketingTitle, lang.marketingText, saved.marketing, false));
    var foot = backdrop.querySelector('.mj-cookie-modal__foot');
    foot.appendChild(button(lang.reject, 'mj-cookie-btn--muted', function(){
      writeConsent({functional:false, analytics:false, marketing:false});
      closeBanner();
    }));
    foot.appendChild(button(lang.save, 'mj-cookie-btn--green', function(){
      writeConsent({
        functional: backdrop.querySelector('#mj-cookie-functional').checked,
        analytics: backdrop.querySelector('#mj-cookie-analytics').checked,
        marketing: backdrop.querySelector('#mj-cookie-marketing').checked
      });
      closeBanner();
    }));
    function closeSettingsOnly(){
      backdrop.remove();
      if(!document.querySelector('.mj-cookie-initial-backdrop')){
        document.body.classList.remove('mj-cookie-lock');
      }
    }
    foot.appendChild(button(lang.close, '', closeSettingsOnly));
    backdrop.addEventListener('click', function(e){if(e.target === backdrop) closeSettingsOnly();});
    document.body.appendChild(backdrop);
  }

  function bindSettingsLinks(){
    document.addEventListener('click', function(e){
      var trigger = e.target.closest('[data-cookie-settings]');
      if(trigger){
        e.preventDefault();
        openSettings();
      }
    });
  }

  function init(){
    bindSettingsLinks();
    var consent = readConsent();
    if(consent){
      window.mjCookieConsent = consent;
      runQueuedScripts(consent);
    }else{
      createBanner();
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
