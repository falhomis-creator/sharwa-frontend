import { generateKeyPairSync } from "node:crypto";
import { parseCurrency, storeDefaultCurrency } from "@/mocks/storefront/money";
import { registerPassthroughMock } from "@/mocks/passthrough";
import { mockJson } from "@/mocks/runtime";
import { categoryTree, listPublicProducts, productDetail } from "@/mocks/storefront/catalog";
import { cartAction, clearCart, getCart, serializeCart, setCurrency } from "@/mocks/storefront/cart";
import { storeState } from "@/mocks/store-state";
import { orderByUuid } from "@/mocks/orders/state";

/**
 * Passthrough fixtures for the READY storefront rows of `/api/v1/*` (ready-api-v1 #2–#7,
 * #11–#14). They answer only while Django is unreachable or 404s the tenant (an unseeded
 * fixture store) — a real Django answer always wins (see `app/api/v1/[...path]/route.ts`).
 *
 * The cart identity is an opaque id in the HttpOnly cookie `sharwa_mock_cart`, the stand-in
 * for Django's `sessionid` (it carries no data; the cart lives in the per-store mock state).
 */
export const MOCK_CART_COOKIE = "sharwa_mock_cart";

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** The mock session's cart id, and the `Set-Cookie` to send when it was just minted. */
export function cartSession(request: Request): { id: string; setCookie: string | null } {
  const existing = readCookie(request, MOCK_CART_COOKIE);
  if (existing && /^[a-f0-9-]{16,64}$/.test(existing)) return { id: existing, setCookie: null };
  const id = crypto.randomUUID();
  return { id, setCookie: `${MOCK_CART_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600` };
}

function withCookie(setCookie: string | null): Record<string, string> {
  return setCookie ? { "set-cookie": setCookie } : {};
}

// #2
registerPassthroughMock("catalog/categories/", (req, ctx) => {
  if (req.method !== "GET" || !ctx.store) return undefined;
  return mockJson(categoryTree(ctx.store), { delay: 80 });
});

// #3
registerPassthroughMock("catalog/products/", (req, ctx, url) => {
  if (req.method !== "GET" || !ctx.store) return undefined;
  const currency = parseCurrency(url.searchParams.get("currency"), storeDefaultCurrency(ctx.store));
  const result = listPublicProducts(ctx.store, url.searchParams, currency);
  return result.ok ? mockJson(result.data, { delay: 120 }) : mockJson(result.body, { status: result.status });
});

// #4
registerPassthroughMock(/^catalog\/products\/\d+\/$/, (req, ctx, url) => {
  if (req.method !== "GET" || !ctx.store) return undefined;
  const id = Number(url.pathname.split("/").filter(Boolean).at(-1));
  const currency = parseCurrency(url.searchParams.get("currency"), storeDefaultCurrency(ctx.store));
  const detail = productDetail(ctx.store, id, currency);
  return detail ? mockJson(detail, { delay: 120 }) : mockJson({ detail: "المنتج غير موجود." }, { status: 404 });
});

// #5 / #6
registerPassthroughMock("cart/", (req, ctx, url) => {
  if (!ctx.store) return undefined;
  const session = cartSession(req);
  const headers = withCookie(session.setCookie);
  if (req.method === "DELETE") {
    clearCart(ctx.store, session.id);
    return mockJson(null, { status: 204, headers });
  }
  if (req.method !== "GET" && req.method !== "HEAD") return undefined;
  const requested = url.searchParams.get("currency");
  if (requested) setCurrency(ctx.store, session.id, parseCurrency(requested, getCart(ctx.store, session.id).currency));
  return mockJson(serializeCart(ctx.store, getCart(ctx.store, session.id)), { delay: 90, headers });
});

// #7
registerPassthroughMock("cart/actions/", async (req, ctx) => {
  if (req.method !== "POST" || !ctx.store) return undefined;
  const session = cartSession(req);
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const result = cartAction(ctx.store, session.id, body);
  const headers = withCookie(session.setCookie);
  return result.ok ? mockJson(result.data, { delay: 160, headers }) : mockJson(result.body, { status: result.status, headers });
});

// ── #11–#14 PWA / push (M44) ─────────────────────────────────────────────────────────
interface PwaLog {
  installEvents: Array<{ event_type: string; source: string; at: number }>;
  subscriptions: Map<string, { endpoint: string; p256dh: string; auth: string; customer_phone: string | null; is_active: boolean }>;
  hits: number[];
}
const pwa = (store: string | null) =>
  storeState<PwaLog>(store, "storefront:pwa", () => ({ installEvents: [], subscriptions: new Map(), hits: [] }));

const INSTALL_EVENTS = ["prompt_shown", "ios_hint_shown", "accepted", "dismissed", "installed"];

registerPassthroughMock("pwa/install-event/", async (req, ctx) => {
  if (req.method !== "POST") return undefined;
  const log = pwa(ctx.store);
  const now = Date.now();
  log.hits = log.hits.filter((t) => now - t < 60_000);
  // Django (INT-016): a very loose per-IP ceiling (300/min) — Yemeni CGNAT shares one IP.
  if (log.hits.length >= 300) return mockJson({ detail: "طلبات كثيرة جداً، حاول لاحقاً." }, { status: 429 });
  log.hits.push(now);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!INSTALL_EVENTS.includes(String(body.event_type))) return mockJson({ event_type: ["قيمة غير صالحة."] }, { status: 400 });
  log.installEvents.push({ event_type: String(body.event_type), source: String(body.source ?? "django_storefront"), at: now });
  return mockJson({ ok: true }, { status: 201 });
});

/** A real P-256 public key (uncompressed point, base64url) so `pushManager.subscribe` accepts it. */
const VAPID_PUBLIC_KEY = (() => {
  const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = publicKey.export({ format: "jwk" }) as { x: string; y: string };
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]);
  return raw.toString("base64url");
})();

registerPassthroughMock("push/vapid-public-key/", (req) => {
  if (req.method !== "GET") return undefined;
  return mockJson({ publicKey: VAPID_PUBLIC_KEY });
});

registerPassthroughMock("push/subscribe/", async (req, ctx) => {
  if (req.method !== "POST") return undefined;
  const body = (await req.json().catch(() => ({}))) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    customer_phone?: string;
    order_uuid?: string | null;
  };
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) return mockJson({ detail: "بيانات الاشتراك ناقصة." }, { status: 400 });
  // Like Django (INT-016): the phone comes from the order (`order_uuid`), never from the client;
  // an anonymous re-subscribe keeps the phone an earlier order linked.
  let phone: string | null = null;
  if (body.order_uuid) {
    const order = orderByUuid(ctx.store, body.order_uuid);
    if (!order) return mockJson({ order_uuid: ["لم نجد هذا الطلب."] }, { status: 400 });
    phone = order.customer_phone;
  }
  const subs = pwa(ctx.store).subscriptions;
  subs.set(body.endpoint, {
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    customer_phone: phone ?? subs.get(body.endpoint)?.customer_phone ?? null,
    is_active: true,
  });
  return mockJson({ ok: true }, { status: 201 });
});

registerPassthroughMock("push/unsubscribe/", async (req, ctx) => {
  if (req.method !== "POST") return undefined;
  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (!body.endpoint) return mockJson({ detail: "endpoint مطلوب." }, { status: 400 });
  const row = pwa(ctx.store).subscriptions.get(body.endpoint);
  if (row) row.is_active = false;
  return mockJson({ ok: true });
});

/** Read-only view for the storefront check script and the merchant push card (M44 US-44.5). */
export function pwaLog(store: string | null) {
  return pwa(store);
}

/** M44 US-44.5 fixture for `GET /api/v1/push/stats/`. */
export function pushStats(store: string | null) {
  return { active_subscribers: [...pwa(store).subscriptions.values()].filter((s) => s.is_active).length };
}

const lastBroadcast = new Map<string, number>();

/** M44 US-44.5 fixture for `POST /api/v1/push/test/` — same checks and messages as Django (`api/views_push.py`). */
export function pushTest(store: string | null, body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  const errors: Record<string, string[]> = {};
  if (!title) errors.title = ["أدخل عنوان الإشعار."];
  else if ([...title].length > 60) errors.title = ["العنوان 60 حرفاً على الأكثر."];
  if (!text) errors.body = ["أدخل نص الإشعار."];
  else if ([...text].length > 200) errors.body = ["النص 200 حرف على الأكثر."];
  if (Object.keys(errors).length) return { ok: false as const, status: 400, body: errors };
  const count = pushStats(store).active_subscribers;
  if (count === 0) return { ok: false as const, status: 400, body: { detail: "لا يوجد مشتركون نشطون لإشعارات المتصفح بعد." } };
  const key = store ?? "";
  const now = Date.now();
  if (now - (lastBroadcast.get(key) ?? 0) < 60_000) {
    return { ok: false as const, status: 429, body: { detail: "أُرسل إشعار قبل قليل — انتظر دقيقة قبل الإرسال مجدداً." } };
  }
  lastBroadcast.set(key, now);
  return { ok: true as const, status: 202, data: { queued_for: count } };
}
