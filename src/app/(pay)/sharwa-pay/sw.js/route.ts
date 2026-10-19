/**
 * «محفظة شروة» service worker (M40 FR-40.06, T182) — the «لا كاش» policy: it opens NO cache
 * and stores NO response (SC-40.2: 0 bytes of financial data in Cache Storage). GETs pass
 * straight to the network; when a navigation fails offline it answers with an inline page
 * built in memory — «لا اتصال — لا نعرض رصيداً قديماً» — so nothing stale can ever be shown.
 * Scope `/sharwa-pay/` (the marketing site at `/` is not the wallet's).
 */
const SOURCE = `/* Sharwa Pay — no-cache service worker */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("sharwa-pay")).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
const OFFLINE = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>لا اتصال — محفظة شروة</title><style>body{margin:0;font-family:system-ui,sans-serif;background:#fafafa;color:#09090b}@media (prefers-color-scheme:dark){body{background:#09090b;color:#fafafa}}main{max-width:480px;margin:0 auto;padding:32px 16px}p{color:#71717a}</style></head><body><main><h1>لا اتصال — لا نعرض رصيداً قديماً</h1><p>تعرض المحفظة أرصدتك من الخادم مباشرة فقط. أعد الاتصال ثم حدّث الصفحة.</p></main></body></html>';
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => new Response(OFFLINE, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } })));
    return;
  }
  event.respondWith(fetch(req));
});
`;

export function GET() {
  return new Response(SOURCE, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-cache",
      "service-worker-allowed": "/sharwa-pay/",
    },
  });
}
