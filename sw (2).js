// Trusted Hands — Service Worker
// Enables installability. Caching is intentionally conservative:
// the app shell document itself is NEVER served from cache — only
// truly static assets (icons, manifest) get cached. This guarantees
// the page always loads fresh and can never show a stale/blank cached version.

const CACHE_NAME = 'trusted-hands-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
  '/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache each asset individually so one missing file never blocks the others
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch(() => {
            // Silently skip any asset that isn't uploaded yet — never fail install
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: never intercept the HTML document itself (index.html or root '/').
  // This guarantees the app always loads the live, current version from network
  // and can never show a stale or blank cached page.
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    return; // let the browser fetch this normally from network, every time
  }

  // Only apply cache-first strategy to known static assets (icons, manifest)
  const isStaticAsset = STATIC_ASSETS.some((path) => url.pathname === path);
  if (event.request.method !== 'GET' || !isStaticAsset) {
    return; // everything else (Firebase, Firestore, fonts, CDNs) goes straight to network
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      });
    })
  );
});
