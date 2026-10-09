const CACHE_NAME = "financeapp-shell-v1";
const OFFLINE_URL = "/static/offline.html";
const APP_SHELL = [
  OFFLINE_URL,
  "/static/manifest.webmanifest",
  "/static/css/pwa.css?v=1",
  "/static/img/pwa-icon-192.png",
  "/static/img/pwa-icon-512.png",
  "/static/img/pwa-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("financeapp-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Páginas e APIs autenticadas são sempre consultadas na rede e nunca persistidas.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  if (url.pathname.startsWith("/api/") || url.pathname === "/session" || url.pathname === "/lancamentos") return;

  if (url.pathname.startsWith("/static/")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
