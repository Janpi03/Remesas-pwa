const CACHE_NAME = 'remesas-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        return fetch(event.request).catch(() => {
          // Si falla la red y es una API, devolver respuesta offline
          if (event.request.url.includes('googleusercontent')) {
            return new Response(JSON.stringify({offline: true}), {
              headers: {'Content-Type': 'application/json'}
            });
          }
        });
      })
  );
});
