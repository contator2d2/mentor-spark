// MentorFlow Service Worker - PWA + Web Push (v4)
// Estratégia:
//  - Network-first para navegação (HTML) com fallback para shell em cache.
//  - Stale-while-revalidate para assets estáticos (mesma origem).
//  - Bypass total para /api e endpoints críticos (auth/oauth) — sempre rede.
const CACHE = "mentorflow-v4";
const SHELL_URL = "/";
const PRECACHE = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

const BYPASS_PATHS = ["/api", "/~oauth", "/auth"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {})));
      } catch {}
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

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function shouldBypass(url) {
  return BYPASS_PATHS.some((p) => url.pathname.startsWith(p));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  let url;
  try { url = new URL(request.url); } catch { return; }
  if (url.origin !== self.location.origin) return;
  if (shouldBypass(url)) return;

  // Navegação (HTML) — network-first com fallback offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(SHELL_URL, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(SHELL_URL).then(
            (c) =>
              c ||
              new Response(
                "<h1>Sem conexão</h1><p>Reconecte para continuar usando o MentorFlow.</p>",
                { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
              ),
          ),
        ),
    );
    return;
  }

  // Estáticos same-origin — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached || Response.error());
      return cached || fetchPromise;
    }),
  );
});

// ---------- Web Push ----------
self.addEventListener("push", (event) => {
  let data = { title: "MentorFlow", body: "Você tem uma nova notificação", url: "/" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
      vibrate: [100, 50, 100],
      tag: data.tag || "mentorflow",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
