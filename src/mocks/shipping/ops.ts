import type { MockResult } from "@/lib/bff/mock-route";
import { ordersState } from "@/mocks/orders/state";
import { FIXTURE_NOW, nextId } from "@/mocks/store-state";
import { listZones, paginate, shippingState, type MockRestrictedZone, type MockShipment, type MockSlaRule, type ShipmentStatus } from "@/mocks/shipping/state";

/**
 * M15 US-15.6 / US-15.7 — zone review, restricted polygons, SLA rules, the edge-case
 * queues and the two shipment actions. `ShipmentOrder` state machine (FR-15.05): the
 * conversion to pickup is legal only before `picked_up`; the address update only while
 * `in_transit`. The convert endpoint carries the order `version` → 409 when stale.
 */
type Body = Record<string, unknown>;
type Errors = Record<string, string[]>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v).trim());
const bool = (v: unknown) => v === true || v === "true";
const has = (b: Body, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const fail = (e: Errors): MockResult<never> | null => (Object.keys(e).length ? { ok: false, status: 400, body: e } : null);

// ── zone review ──────────────────────────────────────────────────────────────────────
export function listReview(store: string | null, params: URLSearchParams) {
  const s = shippingState(store);
  const reason = params.get("reason");
  let rows = s.review;
  if (reason) rows = rows.filter((r) => r.reason === reason);
  const view = rows.map((r) => ({ ...r, restricted_zone_name: r.restricted_zone_id ? (s.restricted.find((z) => z.id === r.restricted_zone_id)?.name ?? null) : null }));
  return paginate(view, params);
}

export function resolveReview(store: string | null, orderId: number, b: Body): MockResult<{ order_id: number; action: string; message: string }> {
  const s = shippingState(store);
  const item = s.review.find((r) => r.order_id === orderId);
  if (!item) return { ok: false, status: 404, body: { detail: "الطلب لم يعد في قائمة المراجعة." } };
  const order = ordersState(store).orders.find((o) => o.id === orderId);
  // M15 §8: cancelled from M06 while under review → it leaves the list with a notice.
  if (order?.status === "cancelled") {
    s.review = s.review.filter((r) => r.order_id !== orderId);
    return { ok: false, status: 409, body: { detail: `أُلغي الطلب #${orderId} من شاشة الطلبات أثناء المراجعة — أُزيل من القائمة.`, code: "order_cancelled" } };
  }
  const action = str(b.action);
  if (!["confirm", "convert_pickup", "cancel"].includes(action)) return { ok: false, status: 400, body: { action: ["اختر إجراءً: تأكيد أو تحويل إلى استلام أو إلغاء."] } };
  let message = `أُكِّد عنوان الطلب #${orderId} — يُشحن كما هو.`;
  if (action === "convert_pickup") {
    const p = s.pickups.find((x) => x.id === Number(b.pickup_location_id));
    if (!p || !p.is_active) return { ok: false, status: 400, body: { pickup_location_id: ["اختر نقطة استلام نشطة."] } };
    message = `حُوِّل الطلب #${orderId} إلى استلام من «${p.name}».`;
  }
  if (action === "cancel") message = `أُلغي شحن الطلب #${orderId}.`;
  s.review = s.review.filter((r) => r.order_id !== orderId);
  return { ok: true, data: { order_id: orderId, action, message } };
}

// ── restricted polygons ──────────────────────────────────────────────────────────────
export function listRestricted(store: string | null, params: URLSearchParams) {
  return paginate(shippingState(store).restricted, params);
}

function parsePoints(v: unknown): Array<[number, number]> | null {
  if (!Array.isArray(v)) return null;
  const out: Array<[number, number]> = [];
  for (const p of v) {
    if (!Array.isArray(p) || p.length !== 2) return null;
    const [lat, lng] = [Number(p[0]), Number(p[1])];
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    out.push([lat, lng]);
  }
  return out;
}

function validateRestricted(b: Body, partial: boolean): Errors {
  const e: Errors = {};
  if ((!partial || has(b, "name")) && !str(b.name)) e.name = ["أدخل اسم النطاق."];
  if (!partial || has(b, "polygon_points")) {
    const pts = parsePoints(b.polygon_points);
    if (!pts) e.polygon_points = ["إحداثيات غير صحيحة — كل نقطة «خط العرض، خط الطول»."];
    else if (pts.length < 3) e.polygon_points = ["النطاق يحتاج 3 نقاط على الأقل."];
  }
  return e;
}

export function createRestricted(store: string | null, b: Body): MockResult<MockRestrictedZone> {
  const err = fail(validateRestricted(b, false));
  if (err) return err;
  const z: MockRestrictedZone = { id: nextId(store, "restricted", 10), name: str(b.name), reason: str(b.reason), is_active: has(b, "is_active") ? bool(b.is_active) : true, polygon_points: parsePoints(b.polygon_points)! };
  shippingState(store).restricted.push(z);
  return { ok: true, status: 201, data: z };
}

export function patchRestricted(store: string | null, id: number, b: Body): MockResult<MockRestrictedZone> {
  const z = shippingState(store).restricted.find((x) => x.id === id);
  if (!z) return { ok: false, status: 404, body: { detail: "النطاق غير موجود." } };
  const err = fail(validateRestricted(b, true));
  if (err) return err;
  if (has(b, "name")) z.name = str(b.name);
  if (has(b, "reason")) z.reason = str(b.reason);
  if (has(b, "is_active")) z.is_active = bool(b.is_active);
  if (has(b, "polygon_points")) z.polygon_points = parsePoints(b.polygon_points)!;
  return { ok: true, data: z };
}

export function deleteRestricted(store: string | null, id: number): MockResult<null> {
  const s = shippingState(store);
  if (!s.restricted.some((x) => x.id === id)) return { ok: false, status: 404, body: { detail: "النطاق غير موجود." } };
  s.restricted = s.restricted.filter((x) => x.id !== id);
  return { ok: true, status: 204, data: null };
}

// ── SLA rules ────────────────────────────────────────────────────────────────────────
function slaView(store: string | null, r: MockSlaRule) {
  const s = shippingState(store);
  return {
    ...r,
    zone_name: r.zone_code ? (listZones(store).find((z) => z.code === r.zone_code)?.name ?? r.zone_code) : null,
    delivery_method_name: r.delivery_method_id ? (s.methods.find((m) => m.id === r.delivery_method_id)?.name ?? null) : null,
  };
}

export function listSla(store: string | null, params: URLSearchParams) {
  return paginate(shippingState(store).sla.map((r) => slaView(store, r)), params);
}

function validateSla(store: string | null, b: Body, selfId: number | null): Errors {
  const e: Errors = {};
  const hours = Number(b.sla_hours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 720) e.sla_hours = ["عدد ساعات صحيح بين 1 و 720."];
  const zone = str(b.zone_code) || null;
  const method = b.delivery_method_id === null || b.delivery_method_id === "" || b.delivery_method_id === undefined ? null : Number(b.delivery_method_id);
  if (zone && !listZones(store).some((z) => z.code === zone)) e.zone_code = ["المنطقة غير موجودة."];
  if (method !== null && !shippingState(store).methods.some((m) => m.id === method)) e.delivery_method_id = ["طريقة التوصيل غير موجودة."];
  if (!zone && method === null) e.zone_code = ["اختر منطقة أو طريقة توصيل على الأقل."];
  if (shippingState(store).sla.some((r) => r.id !== selfId && r.zone_code === zone && r.delivery_method_id === method)) e.zone_code = ["توجد قاعدة لنفس المنطقة والطريقة."];
  return e;
}

export function createSla(store: string | null, b: Body): MockResult<ReturnType<typeof slaView>> {
  const err = fail(validateSla(store, b, null));
  if (err) return err;
  const r: MockSlaRule = { id: nextId(store, "sla", 10), zone_code: str(b.zone_code) || null, delivery_method_id: b.delivery_method_id ? Number(b.delivery_method_id) : null, sla_hours: Number(b.sla_hours) };
  shippingState(store).sla.push(r);
  return { ok: true, status: 201, data: slaView(store, r) };
}

export function patchSla(store: string | null, id: number, b: Body): MockResult<ReturnType<typeof slaView>> {
  const r = shippingState(store).sla.find((x) => x.id === id);
  if (!r) return { ok: false, status: 404, body: { detail: "القاعدة غير موجودة." } };
  const merged = { zone_code: r.zone_code, delivery_method_id: r.delivery_method_id, sla_hours: r.sla_hours, ...b };
  const err = fail(validateSla(store, merged, id));
  if (err) return err;
  r.zone_code = str(merged.zone_code) || null;
  r.delivery_method_id = merged.delivery_method_id ? Number(merged.delivery_method_id) : null;
  r.sla_hours = Number(merged.sla_hours);
  return { ok: true, data: slaView(store, r) };
}

export function deleteSla(store: string | null, id: number): MockResult<null> {
  const s = shippingState(store);
  if (!s.sla.some((x) => x.id === id)) return { ok: false, status: 404, body: { detail: "القاعدة غير موجودة." } };
  s.sla = s.sla.filter((x) => x.id !== id);
  return { ok: true, status: 204, data: null };
}

// ── edge cases ───────────────────────────────────────────────────────────────────────
export const EDGE_KINDS = ["out_of_order", "flagged", "rejected", "sla_breach"] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];
const OPEN: ShipmentStatus[] = ["label_pending", "pending_pickup", "picked_up", "in_transit"];

function breached(s: MockShipment) {
  return OPEN.includes(s.status) && Date.parse(s.sla_deadline) < FIXTURE_NOW;
}

function rowsFor(store: string | null, kind: EdgeKind): Array<Record<string, unknown> & { id: string; event_label: string | null; source: string | null }> {
  const ships = shippingState(store).shipments;
  const base = (s: MockShipment) => ({ shipment_id: s.id, waybill: s.waybill, order_id: s.order_id, customer_name: s.customer_name, status: s.status, address: s.address, carrier: s.carrier, version: s.version, sla_deadline: s.sla_deadline, convert_block_reason: convertBlockReason(s.status), address_block_reason: s.status === "in_transit" ? null : "تحديث العنوان متاح فقط والشحنة قيد التوصيل." });
  if (kind === "sla_breach") {
    return ships.filter(breached).map((s) => ({ id: `sla-${s.id}`, ...base(s), event_label: null, source: null, occurred_at: s.sla_deadline, note: `تجاوزت مهلة SLA (${s.zone_code ?? "بلا منطقة"}).` }));
  }
  const flag = kind === "out_of_order" ? "out_of_order" : kind === "flagged" ? "flagged_for_review" : "is_rejected";
  return ships.flatMap((s) => s.events.filter((e) => e[flag]).map((e) => ({ id: `ev-${e.id}`, ...base(s), event_label: e.label, source: e.source, occurred_at: e.occurred_at, note: e.note })));
}

export function listEdgeCases(store: string | null, params: URLSearchParams) {
  const kindParam = params.get("kind");
  const kind = (EDGE_KINDS as readonly string[]).includes(kindParam ?? "") ? (kindParam as EdgeKind) : "out_of_order";
  const s = shippingState(store);
  return {
    ...paginate(rowsFor(store, kind), params),
    kind,
    counts: Object.fromEntries(EDGE_KINDS.map((k) => [k, rowsFor(store, k).length])) as Record<EdgeKind, number>,
    pickup_options: s.pickups.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order).map((p) => ({ id: p.id, name: p.name })),
  };
}

export function updateShipmentAddress(store: string | null, shipmentId: number, b: Body, actor: string): MockResult<{ shipment_id: number; address: string; status: ShipmentStatus; version: number; event: { source: "merchant_manual"; label: string } }> {
  const sh = shippingState(store).shipments.find((s) => s.id === shipmentId);
  if (!sh) return { ok: false, status: 404, body: { detail: "الشحنة غير موجودة." } };
  if (sh.status !== "in_transit") return { ok: false, status: 400, body: { detail: "تحديث العنوان متاح فقط والشحنة قيد التوصيل." } };
  const address = str(b.address);
  if (address.length < 8) return { ok: false, status: 400, body: { address: ["أدخل العنوان الجديد كاملاً (8 أحرف على الأقل)."] } };
  if (address === sh.address) return { ok: false, status: 400, body: { address: ["العنوان الجديد مطابق للحالي."] } };
  const lat = b.latitude === undefined || b.latitude === "" || b.latitude === null ? null : Number(b.latitude);
  const lng = b.longitude === undefined || b.longitude === "" || b.longitude === null ? null : Number(b.longitude);
  if ((lat !== null && !Number.isFinite(lat)) || (lng !== null && !Number.isFinite(lng))) return { ok: false, status: 400, body: { latitude: ["إحداثيات غير صحيحة."] } };
  const label = `عُدِّل العنوان أثناء النقل بواسطة ${actor}`;
  sh.events.push({ id: nextId(store, "shipment-event", 100), label, source: "merchant_manual", occurred_at: new Date().toISOString(), out_of_order: false, flagged_for_review: false, is_rejected: false, note: `من «${sh.address}» إلى «${address}»` });
  sh.address = address;
  sh.version += 1;
  return { ok: true, data: { shipment_id: sh.id, address, status: sh.status, version: sh.version, event: { source: "merchant_manual", label } } };
}

const CONVERT_BLOCK: Partial<Record<ShipmentStatus, string>> = {
  picked_up: "استُلمت الشحنة من المتجر — لم يعد التحويل إلى استلام ممكناً.",
  in_transit: "الشحنة قيد التوصيل — استخدم تحديث العنوان.",
  delivered: "سُلِّمت الشحنة.",
  returned: "الشحنة مُعادة.",
  cancelled: "الشحنة ملغاة.",
  compensated_lost: "الشحنة مُعوَّضة.",
};
export function convertBlockReason(status: ShipmentStatus): string | null {
  return CONVERT_BLOCK[status] ?? null;
}

export function convertToPickup(store: string | null, orderId: number, b: Body): MockResult<{ order_id: number; pickup_location: { id: number; name: string }; version: number; status: ShipmentStatus }> {
  const s = shippingState(store);
  const sh = s.shipments.find((x) => x.order_id === orderId);
  if (!sh) return { ok: false, status: 404, body: { detail: "لا شحنة لهذا الطلب." } };
  if (Number(b.version) !== sh.version) return { ok: false, status: 409, body: { detail: "حُدِّثت الشحنة من مستخدم آخر.", current_version: sh.version, status: sh.status } };
  const block = convertBlockReason(sh.status);
  if (block) return { ok: false, status: 400, body: { detail: block } };
  const p = s.pickups.find((x) => x.id === Number(b.pickup_location_id));
  if (!p || !p.is_active) return { ok: false, status: 400, body: { pickup_location_id: ["اختر نقطة استلام نشطة."] } };
  sh.status = "cancelled";
  sh.pickup_location_id = p.id;
  sh.version += 1;
  sh.events.push({ id: nextId(store, "shipment-event", 100), label: `حُوِّل الطلب إلى استلام من «${p.name}»`, source: "merchant_manual", occurred_at: new Date().toISOString(), out_of_order: false, flagged_for_review: false, is_rejected: false, note: "" });
  return { ok: true, data: { order_id: orderId, pickup_location: { id: p.id, name: p.name }, version: sh.version, status: sh.status } };
}
