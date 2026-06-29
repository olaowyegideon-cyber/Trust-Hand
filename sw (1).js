// Trusted Hands SW v6 - Force refresh on all devices
const V = 'v6-' + '20260629';
const CACHE = 'th-' + V;

self.addEventListener('install', e => {
  self.skipWaiting(); // activate immediately, no waiting
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k))) // delete ALL old caches
    ).then(() => self.clients.claim()) // take control of ALL tabs immediately
  );
});

// NEVER cache anything - always fetch fresh from network
self.addEventListener('fetch', e => {
  // Let everything go to network - no caching at all
  return;
});
