// Trusted Hands — Service Worker v4
// Auto-update: checks for new version every 5 minutes
// When update found — applies immediately, no hour-long waits

const CACHE_NAME = 'trusted-hands-v4';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
  '/icon-maskable-512.png'
];

const CACHE_EXTERNAL = [
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=DM+Serif+Display&display=swap',
  'https://js.paystack.co/v1/inline.js'
];

// ── INSTALL: cache app shell immediately ──
self.addEventListener('install', (event) => {
  // skipWaiting immediately — don't wait, take over right away
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all([
        ...APP_SHELL.map(url => cache.add(url).catch(() => {})),
        ...CACHE_EXTERNAL.map(url => cache.add(url).catch(() => {}))
      ]);
    })
  );
});

// ── ACTIVATE: claim all clients immediately, delete old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Delete ALL old caches immediately
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
      // Claim all open tabs immediately — no waiting for next navigation
      self.clients.claim()
    ])
  );
});

// ── FETCH: smart caching strategy ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  const isFirebase = url.hostname.includes('googleapis.com') ||
                     url.hostname.includes('firebaseio.com') ||
                     url.hostname.includes('firebasestorage.googleapis.com');
  const isTermii = url.hostname.includes('termii.com');
  const isCallmebot = url.hostname.includes('callmebot.com');
  const isFont = url.hostname.includes('fonts.gstatic.com') ||
                 url.hostname.includes('fonts.googleapis.com');
  const isPaystack = url.hostname.includes('paystack.co');

  // Firebase, Termii, CallMeBot — always network (live data, never cache)
  if (isFirebase || isTermii || isCallmebot) return;

  // Navigation (HTML page) — network first, cache fallback
  // This guarantees everyone gets the latest version on every visit
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => 
          caches.match('/index.html') || caches.match('/')
        )
    );
    return;
  }

  // Fonts — cache first (never change)
  if (isFont) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          }
          return res;
        });
      })
    );
    return;
  }

  // Paystack script — cache with background refresh
  if (isPaystack && event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          }
          return res;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // App shell icons and manifest — stale-while-revalidate
  const isShell = APP_SHELL.some(path =>
    url.pathname === path || url.pathname === '/'
  );
  if (event.request.method === 'GET' && isShell) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          }
          return res;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});

// ── MESSAGE HANDLER ──
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'checkUpdate') {
    // Broadcast to all clients that they should reload
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'UPDATE_READY' }));
    });
  }
});
