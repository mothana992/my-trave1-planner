const CACHE='rahlati-v48';
const ASSETS=['./','./index.html','./style.css?v=48','./upgrade.css?v=48','./planner-core.js?v=48','./app.js?v=48','./upgrade.js?v=48','./preview.js?v=48','./istanbul-preview.json?v=48','./venue-guide.js?v=48','./trip-assistant.js?v=48','./transit.js?v=48','./transit.css?v=48','./trip-plan.js?v=48','./simple.js?v=48','./simple.css?v=48','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('rahlati-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate')event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('./index.html',copy)));}return response;}).catch(()=>caches.match('./index.html')));
  else event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&url.pathname.includes('/data/')){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));
});
