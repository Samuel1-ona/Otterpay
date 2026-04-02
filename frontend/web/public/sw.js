const CACHE_NAME = "otterpay-v1";

// App shell assets to pre-cache
const PRECACHE_ASSETS = ["/", "/app"];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: remove old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

// Fetch: network-first for navigation & API, cache-first for static assets
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and cross-origin requests
    if (request.method !== "GET" || url.origin !== self.location.origin) {
        return;
    }

    // Skip Next.js internal routes and HMR
    if (
        url.pathname.startsWith("/_next/webpack-hmr") ||
        url.pathname.startsWith("/_next/static/development")
    ) {
        return;
    }

    // Cache-first for Next.js static chunks (hashed filenames never change)
    if (url.pathname.startsWith("/_next/static/")) {
        event.respondWith(
            caches.match(request).then(
                (cached) =>
                    cached ||
                    fetch(request).then((response) => {
                        if (response.ok) {
                            const clone = response.clone();
                            caches
                                .open(CACHE_NAME)
                                .then((cache) => cache.put(request, clone));
                        }
                        return response;
                    })
            )
        );
        return;
    }

    // Network-first for navigation (HTML pages) with offline fallback
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches
                            .open(CACHE_NAME)
                            .then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match("/app")))
        );
        return;
    }

    // Network-first for everything else
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});

// Push notification handler
self.addEventListener("push", (event) => {
    if (!event.data) return;

    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || "OtterPay", {
            body: data.body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            vibrate: [100, 50, 100],
            data: { url: data.url || "/app" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/app";
    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((windowClients) => {
                const existing = windowClients.find((c) => c.url.includes(url));
                if (existing) return existing.focus();
                return clients.openWindow(url);
            })
    );
});
