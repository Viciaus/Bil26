const BIL_VERSION='21.8.6';
const SHELL_CACHE='bil-v21-8-5';
const STATIC_CACHE='bil-v21-8-5-static';
const CDN_CACHE='bil-v21-8-5-cdn';
const SHELL=[
  './','./index.html','./privacy.html','./terms.html',
  './assets/app.css?v=21.8.6','./js/app.js?v=21.8.6','./manifest.webmanifest?v=21.8.6',
  './assets/opel-mokka-2023.png','./apple-touch-icon.png','./favicon-32.png','./icon-192.png','./icon-512.png'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(SHELL_CACHE).then(c=>c.addAll(SHELL)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bil-')&&!([SHELL_CACHE,STATIC_CACHE,CDN_CACHE].includes(k))).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
function isPrivateBackend(url){return url.hostname.includes('supabase.co')||url.pathname.includes('/rest/v1/')||url.pathname.includes('/auth/v1/')||url.pathname.includes('/functions/v1/')}
function isSafeCDN(url){return url.hostname==='unpkg.com'||url.hostname==='cdn.jsdelivr.net'}
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(isPrivateBackend(url))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(SHELL_CACHE).then(c=>c.put('./index.html',copy))}return r}).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));return;
  }
  if(url.origin===self.location.origin){
    event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(r=>{if(r.ok){const copy=r.clone();caches.open(STATIC_CACHE).then(c=>c.put(req,copy))}return r})));return;
  }
  // Public UI libraries only: runtime cache after the first successful online load.
  // Supabase/API requests are deliberately excluded above and are never cached.
  if(isSafeCDN(url)){
    event.respondWith(caches.match(req).then(cached=>{
      const network=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque')){const copy=r.clone();caches.open(CDN_CACHE).then(c=>c.put(req,copy))}return r}).catch(()=>cached);
      return cached||network;
    }));
  }
});
