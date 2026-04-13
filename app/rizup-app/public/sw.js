// Rizup Service Worker v3.5
// Strategies:
//  - navigation: network-first with offline fallback
//  - static assets (fonts/images/css/js): stale-while-revalidate
//  - API: network-only (no cache to avoid stale user data)
//  - push notifications: display + focus existing client on click

const CACHE_VERSION = "rizup-v3.5";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/logo.svg",
  "/logo-white.svg",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => null))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.hostname.includes("supabase.co");
}

function isStaticAsset(req) {
  const dest = req.destination;
  return ["style", "script", "font", "image"].includes(dest);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;
  if (isApiRequest(url)) return; // 素通り

  // Navigation: network-first with offline fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (isStaticAsset(req)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

// ── Push Notifications ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Rizup", body: "今日も1%前に進もう", url: "/home" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  const options = {
    body: data.body,
    icon: "/sho.png",
    badge: "/sho.png",
    vibrate: [80, 40, 80],
    tag: data.tag || "rizup-default",
    renotify: true,
    data: { url: data.url || "/home" },
    actions: [
      { action: "open", title: "開く" },
      { action: "dismiss", title: "閉じる" },
    ],
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const targetUrl = event.notification.data?.url || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// ── Background Sync（投稿失敗時のリトライ）──────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "retry-post") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open("rizup-pending-posts");
        const keys = await cache.keys();
        for (const k of keys) {
          const res = await cache.match(k);
          const body = await res.text();
          try {
            await fetch(k.url, { method: "POST", body, headers: { "Content-Type": "application/json" } });
            await cache.delete(k);
          } catch { /* 次回まで保持 */ }
        }
      })()
    );
  }
});
