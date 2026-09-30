const CACHE_NAME = "tubal-hub-shell-v1.2.42";
const DYNAMIC_CACHE = "tubal-hub-content-v1";
const CONTENT_TTL = 5 * 60 * 1000;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./tubal-hub-logo.png",
  "./assets/icons/tubal-hub-512.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => ![CACHE_NAME,DYNAMIC_CACHE].includes(key)).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isContentPage(url){
  return /\/pages\/(feeds|events)\.html$/i.test(url.pathname);
}

async function cachedContent(request){
  const cache=await caches.open(DYNAMIC_CACHE);
  const hit=await cache.match(request);
  if(!hit)return null;
  const savedAt=Number(hit.headers.get("x-tubal-cached-at")||0);
  if(savedAt && Date.now()-savedAt <= CONTENT_TTL)return hit;
  return hit;
}

async function networkContent(request){
  const response=await fetch(request);
  if(response.ok){
    const cache=await caches.open(DYNAMIC_CACHE);
    const headers=new Headers(response.headers);
    headers.set("x-tubal-cached-at",String(Date.now()));
    const body=await response.clone().arrayBuffer();
    await cache.put(request,new Response(body,{status:response.status,statusText:response.statusText,headers}));
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(isContentPage(url)){
    event.respondWith(
      networkContent(request)
        .catch(async()=>await cachedContent(request) || caches.match(request) || caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    fetch(request.destination==="document" ? new Request(request,{cache:"no-store"}) : request)
      .then(response=>{
        if(response.ok && (request.destination==="document" || request.destination==="script" || request.destination==="style")){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
        }
        return response;
      })
      .catch(()=>caches.match(request).then(cached=>cached || caches.match("./index.html")))
  );
});
