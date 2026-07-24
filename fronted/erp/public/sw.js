/**
 * Service Worker for PWA functionality
 * Handles caching, offline support, and background sync
 */

const CACHE_NAME = "grupo-ar-erp-v1";
const STATIC_CACHE = "grupo-ar-static-v1";
const DYNAMIC_CACHE = "grupo-ar-dynamic-v1";

// Static assets to cache on install
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/manifest.json",
    "/assets/logo.png",
    "/assets/logo-192.png",
    "/assets/logo-512.png"
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
    console.log("[SW] Installing service worker...");

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log("[SW] Caching static assets");
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - cleanup old caches
self.addEventListener("activate", (event) => {
    console.log("[SW] Activating service worker...");

    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys
                        .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                        .map((key) => {
                            console.log("[SW] Removing old cache:", key);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - network first with cache fallback
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== "GET") return;

    // Skip Firebase and external API requests
    if (url.hostname.includes("firebase") ||
        url.hostname.includes("googleapis") ||
        url.hostname.includes("google")) {
        return;
    }

    // Handle navigation requests
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .catch(() => caches.match("/index.html"))
        );
        return;
    }

    // Handle static assets - cache first
    if (STATIC_ASSETS.some((asset) => url.pathname.endsWith(asset))) {
        event.respondWith(
            caches.match(request)
                .then((cached) => cached || fetch(request))
        );
        return;
    }

    // Handle other requests - network first with cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Clone and cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(request);
            })
    );
});

// Background sync for offline operations
self.addEventListener("sync", (event) => {
    console.log("[SW] Background sync:", event.tag);

    if (event.tag === "sync-pending-operations") {
        event.waitUntil(syncPendingOperations());
    }
});

// Handle push notifications (future feature)
self.addEventListener("push", (event) => {
    console.log("[SW] Push notification received");

    const data = event.data?.json() || {};
    const title = data.title || "Grupo AR ERP";
    const options = {
        body: data.body || "Tienes una nueva notificación",
        icon: "/assets/logo-192.png",
        badge: "/assets/logo-192.png",
        vibrate: [100, 50, 100],
        data: {
            url: data.url || "/"
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const url = event.notification.data?.url || "/";

    event.waitUntil(
        clients.matchAll({ type: "window" })
            .then((windowClients) => {
                // Focus existing window if open
                for (const client of windowClients) {
                    if (client.url === url && "focus" in client) {
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// Sync pending operations helper
async function syncPendingOperations() {
    // This will be handled by the offlineQueue module in the main app
    // Just trigger a message to the main app
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
        client.postMessage({ type: "SYNC_PENDING" });
    });
}
