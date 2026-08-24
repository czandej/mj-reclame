(function(){
'use strict';
var MOBILE_MAX=760;
function isMobile(){return window.innerWidth<=MOBILE_MAX}
function isNl(){return document.documentElement.lang==='nl'}

function initHeader(){
 document.querySelectorAll('.site-header').forEach(function(header){
  var inner=header.querySelector('.header-inner'),nav=header.querySelector('.main-nav'),quote=header.querySelector('.quote');
  if(!inner||!nav||inner.querySelector('.mobile-nav-toggle'))return;
  var nl=isNl();
  var button=document.createElement('button');button.type='button';button.className='mobile-nav-toggle';button.setAttribute('aria-label',nl?'Menu openen':'Otwórz menu');button.setAttribute('aria-expanded','false');button.innerHTML='<span class="mobile-nav-icon" aria-hidden="true"><span></span><span></span><span></span></span>';
  if(quote)inner.insertBefore(button,quote);else inner.appendChild(button);
  function close(){header.classList.remove('mobile-menu-open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',nl?'Menu openen':'Otwórz menu')}
  button.addEventListener('click',function(){var open=!header.classList.contains('mobile-menu-open');header.classList.toggle('mobile-menu-open',open);button.setAttribute('aria-expanded',open?'true':'false');button.setAttribute('aria-label',open?(nl?'Menu sluiten':'Zamknij menu'):(nl?'Menu openen':'Otwórz menu'))});
  nav.addEventListener('click',function(e){if(e.target.closest('a'))close()});if(quote)quote.addEventListener('click',close);document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});window.addEventListener('resize',function(){if(window.innerWidth>MOBILE_MAX)close()},{passive:true});
 });
}

function initCategories(){
 var panel=document.querySelector('.mj-bg-home .category-panel');if(!panel||panel.querySelector('.mobile-category-toggle'))return;var h=panel.querySelector('h3');if(!h)return;var nl=isNl();var b=document.createElement('button');b.type='button';b.className='mobile-category-toggle';b.setAttribute('aria-expanded','false');b.textContent=nl?'Diensten categorieën':'Kategorie usług';h.insertAdjacentElement('afterend',b);b.addEventListener('click',function(){var open=!panel.classList.contains('mobile-categories-open');panel.classList.toggle('mobile-categories-open',open);b.setAttribute('aria-expanded',open?'true':'false')});
}

function initServices(){
 document.querySelectorAll('.mj-bg-home .service-group').forEach(function(group){var grid=group.querySelector('.service-grid');if(!grid||grid.children.length<=4||group.querySelector('.mobile-services-toggle'))return;group.classList.add('mobile-services-collapsed');var nl=isNl(),more=nl?'Toon alle diensten':'Pokaż wszystkie usługi',less=nl?'Toon minder':'Pokaż mniej';var b=document.createElement('button');b.type='button';b.className='mobile-services-toggle';b.setAttribute('aria-expanded','false');function label(expanded){b.innerHTML=(expanded?less:more)+' <span aria-hidden="true">'+(expanded?'↑':'↓')+'</span>'}label(false);grid.insertAdjacentElement('afterend',b);b.addEventListener('click',function(){var collapsed=group.classList.toggle('mobile-services-collapsed'),expanded=!collapsed;b.setAttribute('aria-expanded',expanded?'true':'false');label(expanded)})});
}

function initSidebarMenus(){
 document.querySelectorAll('.sidebar').forEach(function(sidebar){
  var serviceBox=sidebar.querySelector('.side-box .side-menu') ? sidebar.querySelector('.side-box .side-menu').closest('.side-box') : null;
  if(!serviceBox||serviceBox.querySelector('.mobile-side-menu-toggle'))return;
  var nl=isNl(), menu=serviceBox.querySelector('.side-menu'), h=serviceBox.querySelector('h3');
  serviceBox.classList.add('mobile-side-menu-box');
  Array.from(sidebar.children).forEach(function(box){if(box!==serviceBox)box.classList.add('mobile-side-secondary')});
  var b=document.createElement('button');b.type='button';b.className='mobile-side-menu-toggle';b.setAttribute('aria-expanded','false');b.innerHTML='<span>'+(nl?'Diensten en uitgeverij':'Usługi i wydawnictwo')+'</span><span class="mobile-toggle-arrow" aria-hidden="true">▾</span>';
  if(h)h.insertAdjacentElement('afterend',b);else serviceBox.insertBefore(b,menu);
  b.addEventListener('click',function(){var open=serviceBox.classList.toggle('mobile-side-menu-open');b.setAttribute('aria-expanded',open?'true':'false')});
 });
}

function makePanelToggle(panel, bodySelectors, plText, nlText){
 if(!panel||panel.querySelector('.mobile-panel-toggle'))return;
 var head=panel.querySelector('.panel-head');
 var b=document.createElement('button');b.type='button';b.className='mobile-panel-toggle';b.setAttribute('aria-expanded','false');b.innerHTML='<span>'+(isNl()?nlText:plText)+'</span><span class="mobile-toggle-arrow" aria-hidden="true">▾</span>';
 if(head)head.insertAdjacentElement('afterend',b);else panel.insertBefore(b,panel.firstChild);
 panel.classList.add('mobile-panel-collapsed');
 b.addEventListener('click',function(){var open=panel.classList.toggle('mobile-panel-open');b.setAttribute('aria-expanded',open?'true':'false')});
 bodySelectors.forEach(function(sel){panel.querySelectorAll(sel).forEach(function(el){el.classList.add('mobile-panel-body')})});
}

function initApparelInfo(){
 var sales=document.querySelector('.sales-apparel');if(!sales)return;
 var how=sales.querySelector('.sales-how');
 if(how&&!how.querySelector('.mobile-how-toggle')){
  var h3=how.querySelector('h3'),ol=how.querySelector('ol'),b=document.createElement('button');b.type='button';b.className='mobile-how-toggle';b.setAttribute('aria-expanded','false');b.innerHTML='<span>'+(isNl()?'Hoe bestellen?':'Jak zamówić?')+'</span><span class="mobile-toggle-arrow" aria-hidden="true">▾</span>';
  if(h3)h3.insertAdjacentElement('afterend',b);else how.insertBefore(b,how.firstChild);
  how.classList.add('mobile-how-collapsed');if(ol)ol.classList.add('mobile-how-body');
  b.addEventListener('click',function(){var open=how.classList.toggle('mobile-how-open');b.setAttribute('aria-expanded',open?'true':'false')});
 }
 makePanelToggle(sales.querySelector('.palette-panel'),['.palette-grid'],'Pełna paleta kolorów','Volledig kleurenpalet');
 makePanelToggle(sales.querySelector('.sizes-panel'),['.size-tabs','.size-note'],'Tabela rozmiarów','Maattabel');

 var sizeDetails=sales.querySelectorAll('.size-table-box');
 sizeDetails.forEach(function(d,i){if(!d.dataset.mobileOriginalOpen)d.dataset.mobileOriginalOpen=d.open?'1':'0'});
 function syncDetails(){sizeDetails.forEach(function(d){if(isMobile())d.open=false;else d.open=d.dataset.mobileOriginalOpen==='1'})}
 syncDetails();
 var wasMobile=isMobile();window.addEventListener('resize',function(){var now=isMobile();if(now!==wasMobile){wasMobile=now;syncDetails()}},{passive:true});
}

function initInquiry(){
 var box=document.querySelector('[data-dtf-inquiry-box]');if(!box||box.querySelector('.mobile-inquiry-toggle'))return;
 var total=box.querySelector('[data-dtf-total-items]'),nl=isNl();
 var b=document.createElement('button');b.type='button';b.className='mobile-inquiry-toggle';b.setAttribute('aria-expanded','false');box.insertBefore(b,box.firstChild);box.classList.add('mobile-inquiry-collapsed');
 function totalValue(){return parseInt(total&&total.textContent||'0',10)||0}
 function label(){var n=totalValue();b.innerHTML='<span>'+(nl?'Jouw aanvraag':'Twoje zapytanie')+' — '+n+' '+(nl?'st.':'szt.')+'</span><span class="mobile-toggle-arrow" aria-hidden="true">▾</span>'}
 function openBox(){box.classList.add('mobile-inquiry-open');b.setAttribute('aria-expanded','true')}
 label();if(totalValue()>0&&isMobile())openBox();
 b.addEventListener('click',function(){var open=box.classList.toggle('mobile-inquiry-open');b.setAttribute('aria-expanded',open?'true':'false')});
 if(total){new MutationObserver(function(){var old=parseInt(b.dataset.lastTotal||'0',10)||0,n=totalValue();label();if(n>0&&n>old&&isMobile())openBox();b.dataset.lastTotal=String(n)}).observe(total,{childList:true,characterData:true,subtree:true});b.dataset.lastTotal=String(totalValue())}
}

function initSalesFilterSelect(){
 var toolbar=document.querySelector('.sales-toolbar-in-content');if(!toolbar||toolbar.querySelector('.mobile-sales-filter-select'))return;
 var filters=Array.from(toolbar.querySelectorAll('[data-sales-filter]'));if(!filters.length)return;
 var group=toolbar.querySelector('.sales-filters');
 var wrap=document.createElement('label');wrap.className='mobile-sales-filter-wrap';
 var caption=document.createElement('span');caption.className='mobile-sales-filter-caption';caption.textContent=isNl()?'Categorie':'Kategoria';
 var select=document.createElement('select');select.className='mobile-sales-filter-select';select.setAttribute('aria-label',isNl()?'Kies categorie':'Wybierz kategorię');
 filters.forEach(function(btn){var o=document.createElement('option');o.value=btn.dataset.salesFilter||'all';o.textContent=btn.textContent.trim();if(btn.classList.contains('is-active'))o.selected=true;select.appendChild(o)});
 wrap.appendChild(caption);wrap.appendChild(select);if(group)group.insertAdjacentElement('beforebegin',wrap);
 select.addEventListener('change',function(){var target=filters.find(function(btn){return (btn.dataset.salesFilter||'all')===select.value});if(target)target.click()});
 filters.forEach(function(btn){btn.addEventListener('click',function(){select.value=btn.dataset.salesFilter||'all'})});
}

function initProductVariants(){
 document.querySelectorAll('[data-product-card]').forEach(function(card){
  if(card.querySelector('.mobile-variant-toggle'))return;
  var body=card.querySelector('.sales-body'),fast=body&&body.querySelector('.sales-fast');if(!body)return;
  card.classList.add('mobile-variant-collapsed');
  var b=document.createElement('button');b.type='button';b.className='mobile-variant-toggle';b.setAttribute('aria-expanded','false');b.innerHTML='<span>'+(isNl()?'Kies variant':'Wybierz wariant')+'</span><span class="mobile-toggle-arrow" aria-hidden="true">▾</span>';
  if(fast)fast.insertAdjacentElement('afterend',b);else body.insertBefore(b,body.firstChild);
  b.addEventListener('click',function(){var open=card.classList.toggle('mobile-variant-open');b.setAttribute('aria-expanded',open?'true':'false')});
  var photoOpen=card.querySelector('[data-open-product]');if(photoOpen)photoOpen.addEventListener('click',function(){if(isMobile()){card.classList.add('mobile-variant-open');b.setAttribute('aria-expanded','true')}});

  body.querySelectorAll('.sales-select-block').forEach(function(block){
   var buttons=Array.from(block.querySelectorAll('.product-size,.product-color'));if(!buttons.length||block.querySelector('.mobile-variant-select-wrap'))return;
   var isColor=!!block.querySelector('.product-color'), label=block.querySelector('.sales-label');
   var wrap=document.createElement('label');wrap.className='mobile-variant-select-wrap';
   var caption=document.createElement('span');caption.className='mobile-variant-select-caption';caption.textContent=isColor?(isNl()?'Kleur':'Kolor'):(isNl()?'Maat':'Rozmiar');
   var select=document.createElement('select');select.className='mobile-variant-select '+(isColor?'mobile-color-select':'mobile-size-select');
   buttons.forEach(function(btn){var o=document.createElement('option');o.value=isColor?(btn.dataset.colorCode||''):(btn.dataset.size||btn.textContent.trim());o.textContent=isColor?((isNl()?'Kleur ':'Kolor ')+(btn.dataset.colorCode||btn.textContent.trim())):btn.textContent.trim();if(btn.classList.contains('is-selected'))o.selected=true;select.appendChild(o)});
   wrap.appendChild(caption);wrap.appendChild(select);if(label)label.insertAdjacentElement('afterend',wrap);else block.insertBefore(wrap,block.firstChild);
   select.addEventListener('change',function(){var target=buttons.find(function(btn){return (isColor?(btn.dataset.colorCode||''):(btn.dataset.size||btn.textContent.trim()))===select.value});if(target){target.click();select.value=isColor?(target.dataset.colorCode||''):(target.dataset.size||target.textContent.trim())}});
  });
 });
}

function init(){initHeader();initCategories();initServices();initSidebarMenus();initApparelInfo();initInquiry();initSalesFilterSelect();initProductVariants()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
