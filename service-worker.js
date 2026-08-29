const CACHE_VERSION = 'mj-reclame-pwa-v18-20260828-1';
const CORE = [
  '/',
  '/offline.html',
  '/site.webmanifest',
  '/assets/logo-mj-reclame.png',
  '/assets/logo-mj-reclame-transparent.png',
  '/dynamic-background.css',
  '/assets/cookie-consent.css',
  '/assets/cookie-consent.js',
  '/assets/mobile-site.css',
  '/assets/mobile-ui.js',
  '/assets/canonical-domain.js',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('mj-reclame-pwa-') && key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function shouldBypass(url){
  return url.pathname.startsWith('/panel/') ||
    /\/auth-callback\.html$/i.test(url.pathname) ||
    /\/admin-[^/]*\.html$/i.test(url.pathname);
}

async function networkFirst(request, fallbackUrl){
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if(response && response.ok) cache.put(request, response.clone());
    return response;
  } catch(error){
    const cached = await cache.match(request);
    if(cached) return cached;
    if(fallbackUrl){
      const fallback = await cache.match(fallbackUrl);
      if(fallback) return fallback;
    }
    throw error;
  }
}

async function cacheFirst(request){
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if(cached) return cached;
  const response = await fetch(request);
  if(response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;

  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;
  if(shouldBypass(url)) return;

  if(request.mode === 'navigate'){
    event.respondWith(networkFirst(request, '/offline.html'));
    return;
  }

  if(/\.(?:js|css|json|webmanifest)$/i.test(url.pathname)){
    event.respondWith(networkFirst(request));
    return;
  }

  if(/\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)){
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener('message', event => {
  if(event.data === 'SKIP_WAITING') self.skipWaiting();
});
