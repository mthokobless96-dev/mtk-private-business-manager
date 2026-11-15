const CACHE_NAME = "eat-out-shell-v2";
const MENU_CACHE_NAME = "eat-out-menu-v1";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key =>
        key.startsWith("eat-out-shell-") && key !== CACHE_NAME
      ).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname === "/api/menu") {
    event.respondWith((async () => {
      const cache = await caches.open(MENU_CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) {
          try {
            await cache.put(request, response.clone());
          } catch (error) {
            console.warn("Could not save the latest Eat Out menu for offline use.", error);
          }
          return response;
        }
        const cached = await cache.match(request);
        return cached ? markOffline(cached) : response;
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) return markOffline(cached);
        return new Response(JSON.stringify({ message: "The menu is not saved on this phone yet. Connect to the internet to load it." }), {
          status: 503,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
    })());
    return;
  }

  if (url.pathname.includes("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () =>
      await caches.match(request) || await caches.match("./index.html") ||
      new Response("Connect to the internet to open Eat Out.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      })
    ));
    return;
  }

  event.respondWith(
    fetch(request).then(response => {
      if (!response.ok || response.type !== "basic") return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(error => {
        console.warn("Could not cache the Eat Out app shell.", error);
      });
      return response;
    }).catch(async () => await caches.match(request) || Response.error())
  );
});

function markOffline(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Eat-Out-Offline", "true");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
