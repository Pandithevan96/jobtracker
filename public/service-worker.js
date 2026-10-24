const CACHE_NAME = "jobtrack-shell-v1";
const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/images/logo/icon-192.png",
  "/images/logo/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(SHELL_URLS);
      const response = await fetch("/build/manifest.json", { cache: "no-store" });
      if (response.ok) {
        const manifest = await response.json();
        const assets = Object.values(manifest)
          .map((entry) => entry.file)
          .filter((file) => typeof file === "string")
          .map((file) => `/build/${file}`);
        await cache.addAll(assets);
      }
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/storage/")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match("/")) || Response.error();
      }),
    );
    return;
  }

  if (url.pathname.startsWith("/build/") || url.pathname.startsWith("/images/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
        return cached || network;
      }),
    );
  }
});
