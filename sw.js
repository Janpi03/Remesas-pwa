const CACHE_NAME = 'remesas-pro-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/db.js',
  '/js/utils.js',
  '/js/auth.js',
  '/js/api.js',
  '/js/charts.js',
  '/js/app.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(names => 
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  
  // API Google Sheets → Network First
  if (request.url.includes('script.google.com')) {
    e.respondWith(
      fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(`${CACHE_NAME}-api`).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Estáticos → Cache First
  if (request.method === 'GET') {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          fetch(request).then(res => {
            if (res.ok) caches.open(CACHE_NAME).then(c => c.put(request, res));
          }).catch(() => {});
          return cached;
        }
        return fetch(request).then(res => {
          if (!res || res.status !== 200 || res.type !== 'basic') return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        });
      })
    );
  }
});
