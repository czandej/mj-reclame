(function(){
'use strict';
function initHeader(){
 document.querySelectorAll('.site-header').forEach(function(header){
  var inner=header.querySelector('.header-inner'),nav=header.querySelector('.main-nav'),quote=header.querySelector('.quote');
  if(!inner||!nav||inner.querySelector('.mobile-nav-toggle'))return;
  var nl=document.documentElement.lang==='nl';
  var button=document.createElement('button');button.type='button';button.className='mobile-nav-toggle';button.setAttribute('aria-label',nl?'Menu openen':'Otwórz menu');button.setAttribute('aria-expanded','false');button.innerHTML='<span class="mobile-nav-icon" aria-hidden="true"><span></span><span></span><span></span></span>';
  if(quote)inner.insertBefore(button,quote);else inner.appendChild(button);
  function close(){header.classList.remove('mobile-menu-open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',nl?'Menu openen':'Otwórz menu')}
  button.addEventListener('click',function(){var open=!header.classList.contains('mobile-menu-open');header.classList.toggle('mobile-menu-open',open);button.setAttribute('aria-expanded',open?'true':'false');button.setAttribute('aria-label',open?(nl?'Menu sluiten':'Zamknij menu'):(nl?'Menu openen':'Otwórz menu'))});
  nav.addEventListener('click',function(e){if(e.target.closest('a'))close()});if(quote)quote.addEventListener('click',close);document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});window.addEventListener('resize',function(){if(window.innerWidth>760)close()},{passive:true});
 });
}
function initCategories(){
 var panel=document.querySelector('.mj-bg-home .category-panel');if(!panel||panel.querySelector('.mobile-category-toggle'))return;var h=panel.querySelector('h3');if(!h)return;var nl=document.documentElement.lang==='nl';var b=document.createElement('button');b.type='button';b.className='mobile-category-toggle';b.setAttribute('aria-expanded','false');b.textContent=nl?'Diensten categorieën':'Kategorie usług';h.insertAdjacentElement('afterend',b);b.addEventListener('click',function(){var open=!panel.classList.contains('mobile-categories-open');panel.classList.toggle('mobile-categories-open',open);b.setAttribute('aria-expanded',open?'true':'false')});
}
function initServices(){
 document.querySelectorAll('.mj-bg-home .service-group').forEach(function(group){var grid=group.querySelector('.service-grid');if(!grid||grid.children.length<=4||group.querySelector('.mobile-services-toggle'))return;group.classList.add('mobile-services-collapsed');var nl=document.documentElement.lang==='nl',more=nl?'Toon alle diensten':'Pokaż wszystkie usługi',less=nl?'Toon minder':'Pokaż mniej';var b=document.createElement('button');b.type='button';b.className='mobile-services-toggle';b.setAttribute('aria-expanded','false');function label(expanded){b.innerHTML=(expanded?less:more)+' <span aria-hidden="true">'+(expanded?'↑':'↓')+'</span>'}label(false);grid.insertAdjacentElement('afterend',b);b.addEventListener('click',function(){var collapsed=group.classList.toggle('mobile-services-collapsed'),expanded=!collapsed;b.setAttribute('aria-expanded',expanded?'true':'false');label(expanded)})});
}
function init(){initHeader();initCategories();initServices()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
