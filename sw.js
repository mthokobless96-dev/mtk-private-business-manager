const CACHE='mtk-business-v7';
const APP_SHELL=['./','./index.html?v=sky-blue-1','./manifest.webmanifest?v=sky-blue-1','./mtk-logo.jpeg'];

function cacheResponse(request,response,label){
 if(!response.ok||response.type!=='basic')return Promise.resolve(response);
 return caches.open(CACHE).then(cache=>cache.put(request,response.clone())).catch(error=>{
  console.warn(`Could not cache the offline ${label}.`,error);
 }).then(()=>response);
}

self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(
  keys.filter(key=>key.startsWith('mtk-business-')&&key!==CACHE).map(key=>caches.delete(key))
 )).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;

 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>cacheResponse(request,response,'page')).catch(async()=>{
   const cached=await caches.match(request)||await caches.match('./index.html');
   return cached||new Response('The app is not available offline yet. Connect to the internet once to install it.',{
    status:503,
    headers:{'Content-Type':'text/plain; charset=utf-8'}
   });
  }));
  return;
 }

 const url=new URL(request.url);
 if(!/\.(?:css|html|ico|jpe?g|js|json|png|svg|webmanifest|woff2?)$/i.test(url.pathname))return;
 event.respondWith(fetch(request).then(response=>cacheResponse(request,response,'asset')).catch(error=>
  caches.match(request).then(cached=>{
   if(cached)return cached;
   throw error;
  })
 ));
});