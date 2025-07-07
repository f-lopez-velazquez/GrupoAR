const CACHE_NAME = "grupo-ar-v1";
const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://i.imgur.com/kf8e57F.jpg",
  // Agrega aquí otros archivos (JS, CSS, imágenes locales)
];

// Instala SW y cachea archivos
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Atiende solicitudes de red con cache
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
