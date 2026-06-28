// Trusted Hands Service Worker
const CACHE='trusted-hands-v1';
const ASSETS=['/manifest.json','/icon-192.png','/icon-512.png','/icon-180.png','/icon-maskable-512.png'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ASSETS.map(a=>c.add(a).catch(()=>{})))));
});

self.addEventListener('activate',e=>{
  e.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // Never cache HTML or Firebase requests
  if(e.request.mode==='navigate'||url.pathname.endsWith('.html')||
     url.hostname.includes('googleapis.com')||url.hostname.includes('firebaseio.com')||
     url.hostname.includes('termii.com')||url.hostname.includes('callmebot.com')||
     url.hostname.includes('paystack.co'))return;
  if(e.request.method!=='GET')return;
  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
      if(res&&res.status===200)caches.open(CACHE).then(c=>c.put(e.request,res.clone()));
      return res;
    }).catch(()=>cached))
  );
});

self.addEventListener('message',e=>{if(e.data==='skipWaiting')self.skipWaiting();});
