const CACHE_NAME = "grupo-ar-v1";
const ASSETS = [
  "/",
  "/assets/tailwind.css",
  "/assets/theme.css",
  "/assets/logo.png",
  "/assets/pwa-192.png",
  "/assets/pwa-512.png",
  "/shared/footer.js",
  "/shared/firebase.js",
  "/shared/i18n-es.js",
  "/shared/media.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        const responseClone = response.clone();
        if (response.status === 200 && response.type === "basic") {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => cached)
    )
  );
});
