const CACHE_NAME='sbm-contech-v4-58aaec1a3e6e';
const CORE_ASSETS=[
  './',
  './index.html',
  './style.min.css?v=58aaec1a3e6e',
  './script.min.js?v=58aaec1a3e6e',
  './fonts/dm-sans-latin.woff2',
  './fonts/space-grotesk-latin.woff2',
  './images/logo-96.webp',
  './images/logo-256.webp'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS.map(url=>new Request(url,{cache:'reload'})))));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith('sbm-contech-')&&key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const {request}=event;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    const response=fetch(request,{cache:'no-cache'})
      .then(async result=>{
        if(result.ok)await caches.open(CACHE_NAME).then(cache=>cache.put(request,result.clone())).catch(()=>undefined);
        return result;
      })
      .catch(()=>caches.open(CACHE_NAME).then(async cache=>(await cache.match(request))||(await cache.match('./index.html'))||Response.error()));
    event.waitUntil(response.then(()=>undefined));
    event.respondWith(response);
    return;
  }

  if(['style','script','font','image'].includes(request.destination)){
    const cache=caches.open(CACHE_NAME);
    const cached=cache.then(store=>store.match(request));
    const update=fetch(request,{cache:'no-cache'}).then(async response=>{
      if(response.ok)await cache.then(store=>store.put(request,response.clone())).catch(()=>undefined);
      return response;
    }).catch(async()=>(await cached)||Response.error());
    // Keep revalidation alive even when the cached response finishes immediately.
    event.waitUntil(update.then(()=>undefined));
    event.respondWith(cached.then(response=>response||update));
  }
});
