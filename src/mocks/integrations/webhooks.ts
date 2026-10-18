import { randomBytes } from "node:crypto";
import type { MockResult } from "@/lib/bff/mock-route";
import {
  AUTO_DISABLE_AFTER,
  DELIVERY_STATUSES,
  WEBHOOK_EVENT_CODES,
  WEBHOOK_TEST_EVENT,
  type DeliveryStatus,
  type WebhookDelivery,
  type WebhookEndpoint,
  type WebhookEvent,
} from "@/features/integrations/schemas";
import { int, pick, seeded } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, nextId, seedOf, storeState } from "@/mocks/store-state";

/**
 * M19 outgoing webhooks `[NEEDS BACKEND]` (Absent). Secrets stay in this module: a create or
 * a rotation returns the new one ONCE; every other response carries `has_secret` only
 * (FR-19.04, SC-19.3). An endpoint whose host contains `fail` answers 5xx, so the seed and
 * the check script can show the auto-disable after 10 consecutive failures (§8).
 */
export const WEBHOOK_EVENTS: WebhookEvent[] = [
  { code: "order.created", name: "طلب جديد", description: "عند إنشاء طلب من المتجر أو الكاشير أو القنوات." },
  { code: "order.status_changed", name: "تغيّر حالة الطلب", description: "عند نقل الطلب إلى حالة جديدة." },
  { code: "order.fulfillment_changed", name: "تغيّر حالة التجهيز", description: "عند تغيّر التجهيز أو الشحن للطلب." },
  { code: "order.refunded", name: "استرداد طلب", description: "عند استرداد كامل أو جزئي لمبلغ طلب." },
  { code: "shipment.event", name: "حدث شحنة", description: "كل تحديث تتبع من شركة الشحن." },
  { code: "product.updated", name: "تحديث منتج", description: "عند تعديل السعر أو البيانات أو الظهور." },
  { code: "inventory.low_stock", name: "مخزون منخفض", description: "عند وصول كمية متغيّر إلى حد التنبيه." },
];

interface Endpoint {
  id: number;
  url: string;
  events: string[];
  is_active: boolean;
  description: string;
  secret: string;
  created_at: string;
  failure_count: number;
  auto_disabled: boolean;
}
interface State {
  endpoints: Endpoint[];
  deliveries: WebhookDelivery[];
}

const MIN = 60_000;
const newSecret = () => `whsec_${randomBytes(24).toString("base64url")}`;
const healthy = (e: Endpoint) => !/fail/i.test(new URL(e.url).hostname);

function seed(store: string | null): State {
  if (isEmptyStore(store)) return { endpoints: [], deliveries: [] };
  const rnd = seeded(seedOf(store) + 19);
  const erp: Endpoint = {
    id: 1,
    url: `https://erp.${store ?? "store"}-store.com/hooks/sharwa`,
    events: ["order.created", "order.status_changed", "order.refunded", "inventory.low_stock"],
    is_active: true,
    description: "مزامنة الطلبات مع نظام المحاسبة",
    secret: newSecret(),
    created_at: new Date(FIXTURE_NOW - 45 * 86_400_000).toISOString(),
    failure_count: 0,
    auto_disabled: false,
  };
  const zap: Endpoint = {
    id: 2,
    url: "https://hooks.fail-relay.example.com/catch/48213/sharwa",
    events: ["shipment.event", "order.fulfillment_changed"],
    is_active: false,
    description: "إشعارات الشحن لفريق التوصيل",
    secret: newSecret(),
    created_at: new Date(FIXTURE_NOW - 20 * 86_400_000).toISOString(),
    failure_count: AUTO_DISABLE_AFTER,
    auto_disabled: true,
  };
  const deliveries: WebhookDelivery[] = [];
  let id = 100;
  // ERP: ~40 deliveries over 6 days, a few transient failures later redelivered.
  for (let i = 0; i < 40; i++) {
    const failed = i % 9 === 4;
    deliveries.push({
      id: ++id,
      endpoint_id: 1,
      event: pick(rnd, erp.events),
      status: failed ? "failed" : "delivered",
      response_code: failed ? pick(rnd, [500, 502, 504]) : 200,
      duration_ms: failed ? int(rnd, 3000, 10000) : int(rnd, 80, 640),
      attempt: failed ? int(rnd, 1, 3) : 1,
      created_at: new Date(FIXTURE_NOW - (i * 211 + int(rnd, 0, 60)) * MIN).toISOString(),
      error: failed ? "انتهت مهلة الاستجابة أو ردّ الخادم بخطأ." : null,
    });
  }
  // The failing relay: 10 consecutive 5xx → auto-disabled.
  for (let i = 0; i < AUTO_DISABLE_AFTER + 2; i++) {
    const ok = i >= AUTO_DISABLE_AFTER;
    deliveries.push({
      id: ++id,
      endpoint_id: 2,
      event: pick(rnd, zap.events),
      status: ok ? "delivered" : "failed",
      response_code: ok ? 200 : 503,
      duration_ms: ok ? int(rnd, 120, 400) : int(rnd, 900, 2000),
      attempt: ok ? 1 : Math.min(5, AUTO_DISABLE_AFTER - i),
      created_at: new Date(FIXTURE_NOW - (90 + i * 37) * MIN).toISOString(),
      error: ok ? null : "Service Unavailable",
    });
  }
  return { endpoints: [erp, zap], deliveries };
}

function state(store: string | null): State {
  return storeState(store, "integrations:webhooks", () => seed(store));
}

function view(s: State, e: Endpoint): WebhookEndpoint {
  const last = s.deliveries.filter((d) => d.endpoint_id === e.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return {
    id: e.id,
    url: e.url,
    events: e.events,
    is_active: e.is_active,
    description: e.description,
    has_secret: Boolean(e.secret),
    created_at: e.created_at,
    last_delivery_at: last?.created_at ?? null,
    last_delivery_status: last?.status ?? null,
    failure_count: e.failure_count,
    auto_disabled: e.auto_disabled,
  };
}

const notFound = { ok: false as const, status: 404, body: { detail: "نقطة النهاية غير موجودة." } };

export function listEndpoints(store: string | null) {
  const s = state(store);
  const results = [...s.endpoints].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((e) => view(s, e));
  return { count: results.length, results };
}

export function getEndpoint(store: string | null, id: number): MockResult<WebhookEndpoint> {
  const s = state(store);
  const e = s.endpoints.find((x) => x.id === id);
  return e ? { ok: true, data: view(s, e) } : notFound;
}

function readInput(body: Record<string, unknown>, existing?: Endpoint): MockResult<Pick<Endpoint, "url" | "events" | "description" | "is_active">> {
  const errors: Record<string, string[]> = {};
  const url = String(body.url ?? existing?.url ?? "").trim();
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") errors.url = ["العنوان يجب أن يبدأ بـ https://"];
    else if (!u.hostname.includes(".") || /^(localhost|127\.|10\.|192\.168\.)/.test(u.hostname)) errors.url = ["لا تُقبل العناوين الداخلية — استخدم عنواناً عاماً."];
  } catch {
    errors.url = [url ? "عنوان غير صالح." : "أدخل عنوان نقطة النهاية."];
  }
  const events = Array.isArray(body.events) ? body.events.map(String) : (existing?.events ?? []);
  const unknown = events.filter((c) => !(WEBHOOK_EVENT_CODES as readonly string[]).includes(c));
  if (!events.length) errors.events = ["اختر حدثاً واحداً على الأقل."];
  else if (unknown.length) errors.events = [`أحداث غير معروفة: ${unknown.join("، ")}`];
  const description = String(body.description ?? existing?.description ?? "").trim();
  if (description.length > 200) errors.description = ["200 حرف كحد أقصى."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  return { ok: true, data: { url, events: [...new Set(events)], description, is_active: body.is_active === undefined ? (existing?.is_active ?? true) : Boolean(body.is_active) } };
}

export function createEndpoint(store: string | null, body: Record<string, unknown>): MockResult<{ endpoint: WebhookEndpoint; secret: string }> {
  const s = state(store);
  const input = readInput(body);
  if (!input.ok) return input;
  if (s.endpoints.some((e) => e.url === input.data.url)) return { ok: false, status: 400, body: { url: ["هذا العنوان مضاف بالفعل."] } };
  if (s.endpoints.length >= 10) return { ok: false, status: 400, body: { detail: "الحد الأقصى 10 نقاط نهاية لكل متجر." } };
  const e: Endpoint = { id: nextId(store, "webhook", 10), ...input.data, secret: newSecret(), created_at: new Date().toISOString(), failure_count: 0, auto_disabled: false };
  s.endpoints.push(e);
  return { ok: true, status: 201, data: { endpoint: view(s, e), secret: e.secret } };
}

export function patchEndpoint(store: string | null, id: number, body: Record<string, unknown>): MockResult<WebhookEndpoint> {
  const s = state(store);
  const e = s.endpoints.find((x) => x.id === id);
  if (!e) return notFound;
  const input = readInput(body, e);
  if (!input.ok) return input;
  const reEnable = input.data.is_active && !e.is_active;
  Object.assign(e, input.data);
  // «إعادة التفعيل» clears the auto-disable and the failure streak (§8).
  if (reEnable) {
    e.auto_disabled = false;
    e.failure_count = 0;
  }
  return { ok: true, data: view(s, e) };
}

export function deleteEndpoint(store: string | null, id: number): MockResult<null> {
  const s = state(store);
  if (!s.endpoints.some((e) => e.id === id)) return notFound;
  s.endpoints = s.endpoints.filter((e) => e.id !== id);
  s.deliveries = s.deliveries.filter((d) => d.endpoint_id !== id);
  return { ok: true, status: 204, data: null };
}

export function rotateSecret(store: string | null, id: number): MockResult<{ endpoint: WebhookEndpoint; secret: string }> {
  const s = state(store);
  const e = s.endpoints.find((x) => x.id === id);
  if (!e) return notFound;
  e.secret = newSecret();
  return { ok: true, data: { endpoint: view(s, e), secret: e.secret } };
}

function deliver(store: string | null, s: State, e: Endpoint, event: string, attempt: number): WebhookDelivery {
  const ok = healthy(e);
  const d: WebhookDelivery = {
    id: nextId(store, "webhook-delivery", 1000),
    endpoint_id: e.id,
    event,
    status: ok ? "delivered" : "failed",
    response_code: ok ? 200 : 503,
    duration_ms: ok ? 140 + (attempt * 37) % 300 : 1200,
    attempt,
    created_at: new Date().toISOString(),
    error: ok ? null : "Service Unavailable",
  };
  s.deliveries.push(d);
  if (ok) e.failure_count = 0;
  else {
    e.failure_count += 1;
    if (e.failure_count >= AUTO_DISABLE_AFTER && e.is_active) {
      e.is_active = false;
      e.auto_disabled = true;
    }
  }
  return d;
}

/** «إرسال حدث تجريبي» — sent even to an inactive endpoint so the owner can test before enabling. */
export function testEndpoint(store: string | null, id: number): MockResult<WebhookDelivery> {
  const s = state(store);
  const e = s.endpoints.find((x) => x.id === id);
  if (!e) return notFound;
  return { ok: true, data: deliver(store, s, e, WEBHOOK_TEST_EVENT, 1) };
}

export function redeliver(store: string | null, deliveryId: number): MockResult<WebhookDelivery> {
  const s = state(store);
  const d = s.deliveries.find((x) => x.id === deliveryId);
  if (!d) return { ok: false, status: 404, body: { detail: "التسليم غير موجود." } };
  if (d.status !== "failed") return { ok: false, status: 400, body: { detail: "إعادة الإرسال للتسليمات الفاشلة فقط." } };
  const e = s.endpoints.find((x) => x.id === d.endpoint_id);
  if (!e) return { ok: false, status: 404, body: { detail: "نقطة النهاية غير موجودة." } };
  return { ok: true, data: deliver(store, s, e, d.event, d.attempt + 1) };
}

export function listDeliveries(store: string | null, endpointId: number, params: URLSearchParams): MockResult<{ count: number; results: WebhookDelivery[] }> {
  const s = state(store);
  if (!s.endpoints.some((e) => e.id === endpointId)) return notFound;
  const status = params.get("status") as DeliveryStatus | null;
  const event = params.get("event");
  const from = params.get("from");
  const to = params.get("to");
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const size = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 20)));
  const rows = s.deliveries
    .filter(
      (d) =>
        d.endpoint_id === endpointId &&
        (!status || !DELIVERY_STATUSES.includes(status) || d.status === status) &&
        (!event || d.event === event) &&
        (!from || d.created_at.slice(0, 10) >= from) &&
        (!to || d.created_at.slice(0, 10) <= to),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  return { ok: true, data: { count: rows.length, results: rows.slice((page - 1) * size, page * size) } };
}
