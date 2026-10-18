import { requestIdentity } from "@/features/tenant/request";

/**
 * The store-origin service worker (M44 US-44.3, FR-44.03, research R-16 — Next owns
 * `/sw.js`; Django's `pwa_service_worker` is not proxied). Policy:
 *
 *   - `/api/v1/cart*`, `/api/v1/config/`, every `/api/bff/*` → network only (never cached:
 *     a stale cart or another visitor's data must be impossible — SC-44.2);
 *   - other `/api/v1/*` GETs → network first, the last answer only as an offline fallback;
 *   - images and fonts → cache first, refreshed in the background (SC-44.4);
 *   - pages → network; when offline, the precached `/offline` page. No page with personal
 *     data (checkout, tracking, cart) is ever stored.
 *
 * Cache names carry the HOST and the release, so two stores never share a cache (VIII) and
 * `activate` drops the previous release's caches. A new worker waits (no `skipWaiting`) until
 * the page tells it to — the page holds that message while the buyer is in checkout (M44 §8).
 */
const RELEASE = process.env.NEXT_DEPLOYMENT_ID || process.env.SHARWA_RELEASE || `dev-${Date.now().toString(36)}`;

function source(host: string): string {
  return `/* Sharwa storefront service worker — ${host} — ${RELEASE} */
const RELEASE = ${JSON.stringify(RELEASE)};
const PREFIX = "sharwa-" + self.location.host + "-";
const ASSETS = PREFIX + "assets-" + RELEASE;
const API = PREFIX + "api-" + RELEASE;
const PAGES = PREFIX + "pages-" + RELEASE;
const OFFLINE_URL = "/offline";
const MEDIA = /\\.(png|jpe?g|webp|gif|svg|avif|ico|woff2?)(\\?.*)?$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add(new Request(OFFLINE_URL, { cache: "reload" }))).catch(() => undefined));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && ![ASSETS, API, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function networkOnly(url) {
  return url.pathname.startsWith("/api/v1/cart") || url.pathname === "/api/v1/config/" || url.pathname.startsWith("/api/bff/");
}

async function networkFirst(request) {
  const cache = await caches.open(API);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw error;
  }
}

async function cacheFirst(event) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then((response) => {
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
    .catch(() => undefined);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  const fresh = await refresh;
  return fresh || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (networkOnly(url)) return;
  if (url.pathname.startsWith("/api/v1/")) {
    event.respondWith(networkFirst(request));
    return;
  }
  const isMedia = MEDIA.test(url.pathname) || url.pathname.startsWith("/_next/image") || request.destination === "image" || request.destination === "font";
  if (isMedia) {
    event.respondWith(cacheFirst(event));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.open(PAGES).then((c) => c.match(OFFLINE_URL)).then((r) => r || Response.error())),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "تحديث من المتجر";
  event.waitUntil(self.registration.showNotification(title, { body: data.body || "", data: { url: data.url || "/" }, dir: "rtl", lang: "ar", silent: true }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).pathname === target && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
`;
}

export async function GET() {
  const { storeHost } = await requestIdentity();
  return new Response(source(storeHost), {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate",
      "service-worker-allowed": "/",
    },
  });
}
