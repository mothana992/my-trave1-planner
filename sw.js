const CACHE='rahlati-v50';
const ASSETS=['./','./index.html','./style.css?v=50','./upgrade.css?v=50','./planner-core.js?v=50','./app.js?v=50','./upgrade.js?v=50','./preview.js?v=50','./istanbul-preview.json?v=50','./venue-guide.js?v=50','./trip-assistant.js?v=50','./transit.js?v=50','./transit.css?v=50','./trip-plan.js?v=50','./wanderlog-sync-data.js?v=50','./venue-costs.js?v=50','./wanderlog-sync.js?v=50','./simple.js?v=50','./simple.css?v=50','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('rahlati-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate')event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('./index.html',copy)));}return response;}).catch(()=>caches.match('./index.html')));
  else event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&url.pathname.includes('/data/')){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));
});
