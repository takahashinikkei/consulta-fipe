const CACHE='garagem26-v43';
const APP_SHELL=['./','./index.html','./manifest.json','./icon-garagem26.svg','./icon-garagem26.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const isNavigation=event.request.mode==='navigate';
 event.respondWith(
  fetch(event.request,{cache:isNavigation?'no-store':'default'}).then(response=>{
   const copy=response.clone();
   caches.open(CACHE).then(cache=>cache.put(event.request,copy));
   return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html')))
 );
});