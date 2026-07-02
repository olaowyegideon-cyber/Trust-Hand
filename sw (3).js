// Trusted Hands Service Worker
// Simple and clean — never caches HTML, always fresh from server

const CACHE = 'th-static-v1';
const STATIC = ['/manifest.json','/icon-192.png','/icon-512.png','/icon-180.png','/icon-maskable-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(STATIC.map(u=>c.add(u).catch(()=>{})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // NEVER cache HTML — always get fresh
  if(e.request.mode==='navigate' || url.pathname.endsWith('.html') || url.pathname==='/') return;
  // Never cache Firebase, payments, SMS
  if(url.hostname.includes('googleapis.com') || url.hostname.includes('firebaseio.com') ||
     url.hostname.includes('termii.com') || url.hostname.includes('callmebot.com') ||
     url.hostname.includes('paystack.co') || url.hostname.includes('firebasestorage')) return;
  if(e.request.method!=='GET') return;
  // Cache static assets only
  e.respondWith(caches.match(e.request).then(cached=>{
    if(cached) return cached;
    return fetch(e.request).then(res=>{
      if(res&&res.status===200) caches.open(CACHE).then(c=>c.put(e.request,res.clone()));
      return res;
    }).catch(()=>cached);
  }));
});

self.addEventListener('message', e=>{if(e.data==='skipWaiting')self.skipWaiting();});
