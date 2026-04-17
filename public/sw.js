// MentorFlow Service Worker - PWA básico com cache de assets
const CACHE = "mentorflow-v1";
const ASSETS = ["/", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Não cacheia API
  if (url.pathname.startsWith("/api") || url.hostname !== self.location.hostname) return;
  // Network first para HTML, cache first para assets
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() => caches.match("/") as Promise<Response>),
    );
    return;
  }
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(request, clone));
      }
      return res;
    })),
  );
});
