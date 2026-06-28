// Trusted Hands — Service Worker v5
// NEVER caches index.html — always fetches fresh from Vercel

const CACHE_NAME = 'trusted-hands-v5';

// Only cache icons and fonts — NEVER the HTML
const STATIC = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
  '/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting(); // activate immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(STATIC.map(url => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      // Delete ALL old caches
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // NEVER intercept HTML — always get fresh from network
  if (e.request.mode === 'navigate' ||
      url.pathname === '/' ||
      url.pathname.endsWith('.html')) {
    return; // browser fetches normally
  }

  // NEVER intercept Firebase, Termii, CallMeBot, Paystack
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('firebasestorage') ||
      url.hostname.includes('termii.com') ||
      url.hostname.includes('callmebot.com') ||
      url.hostname.includes('paystack.co') ||
      url.hostname.includes('identitytoolkit') ||
      url.hostname.includes('securetoken')) {
    return;
  }

  // Only cache static assets (icons, manifest, fonts)
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
