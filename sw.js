// Trusted Hands — Service Worker
// Enables installability and basic offline support for static assets.
// Firebase data (live marketplace, chat, bookings) always requires network —
// this only caches the app shell so it opens instantly and works if signal drops briefly.

const CACHE_NAME = 'trusted-hands-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // If any asset fails to cache (e.g. not yet uploaded), don't block install
      });
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
  // Only handle GET requests for our own origin's app shell files.
  // Everything else (Firebase, Firestore, external CDNs, APIs) goes straight to network.
  const url = new URL(event.request.url);
  const isAppShell = APP_SHELL.some((path) => url.pathname === path || url.pathname.endsWith(path));

  if (event.request.method !== 'GET' || !isAppShell) {
    return; // let the browser handle it normally (network)
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Try network first so users always get the latest app version,
      // fall back to cache only if offline.
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
