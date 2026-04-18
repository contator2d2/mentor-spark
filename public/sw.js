// MentorFlow Service Worker - PWA básico com cache de assets
// Versionado por hash — bumpe ao mudar a estratégia de cache.
const CACHE = "mentorflow-v2";
const PRECACHE = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        await Promise.all(
          PRECACHE.map((url) =>
            cache.add(url).catch(() => {
              // Ignora falhas individuais para não quebrar a instalação.
            }),
          ),
        );
      } catch {
        // Sem cache ainda — segue.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Não intercepta cross-origin nem chamadas de API.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;

  // Network first para HTML (navegação), com fallback para cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put("/", clone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/").then((c) => c || Response.error())),
    );
    return;
  }

  // Cache first para demais assets (estáticos).
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((res) => {
            if (res && res.ok && res.type === "basic") {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(request, clone)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached || Response.error()),
    ),
  );
});
