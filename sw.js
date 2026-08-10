const CACHE_NAME = 'cvdlu-cache-v16';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css?v=11',
  '/script.js?v=11',
  '/logo.webp',
  '/abeja_lucha.webp',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Forzar activación del Service Worker inmediatamente
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  // Limpiar versiones antiguas del caché al actualizar v16
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Network-First para peticiones dinámicas a Google Script (Estadísticas)
  if (url.hostname.includes('script.google.com') || url.pathname.includes('exec')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-While-Revalidate para recursos estáticos (Páginas, JS, CSS, Imágenes)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(err => console.log('Sin red, sirviendo desde caché PWA:', err));

      return cachedResponse || fetchPromise;
    })
  );
});
