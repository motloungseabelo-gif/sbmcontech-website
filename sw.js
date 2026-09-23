const CACHE_NAME='sbm-contech-v2';
const CORE_ASSETS=[
  './',
  './index.html',
  './style.min.css',
  './script.min.js',
  './fonts/dm-sans-latin.woff2',
  './fonts/space-grotesk-latin.woff2',
  './images/logo-96.webp',
  './images/logo-256.webp'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const {request}=event;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then(response=>{
          const copy=response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)));
          return response;
        })
        .catch(()=>caches.match(request).then(cached=>cached||caches.match('./index.html')))
    );
    return;
  }

  if(['style','script','font','image'].includes(request.destination)){
    event.respondWith(
      caches.match(request).then(cached=>{
        const update=fetch(request).then(response=>{
          if(response.ok){
            const copy=response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)));
          }
          return response;
        });
        return cached||update;
      })
    );
  }
});
