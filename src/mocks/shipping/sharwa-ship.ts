import type { MockResult } from "@/lib/bff/mock-route";
import { displayMoney, type Currency } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { ordersState, type MockOrder } from "@/mocks/orders/state";
import { platformState } from "@/mocks/platform/state";
import { FIXTURE_NOW, storeState } from "@/mocks/store-state";
import { shippingState, type EventSource, type MockShipment, type ShipmentStatus, SHIPMENT_STATUSES } from "@/mocks/shipping/state";

/**
 * M39 «شروة شيب» + M38 «تطبيق المندوب» — ONE model of a `ShipmentOrder` (T175/T178).
 *
 * The M15 row (`shippingState().shipments`: id, waybill, status, address, version) stays
 * the authority for WHERE the shipment is, so the M15 edge-case queues, M38 and M39 never
 * disagree; this bag extends it with what M39 adds (fulfillment + items, zone/cost/weight
 * snapshots, `billing_status`, master/children, the assigned agent) and the full
 * `ShipmentEvent` log (accepted AND rejected — FR-39.05), plus the courier shifts, the
 * custody ledger, the 3PL AWB queue and the rate-card snapshots.
 *
 * Every status change — agent app (M38), manual (M39), carrier webhook — goes through
 * `transition()` below: the same state machine, the same idempotency key
 * `(shipment_id, to_status, client_generated_uuid)` and the same four rejection reasons.
 */
type Body = Record<string, unknown>;

export const BILLING_STATUSES = ["pending", "collected", "waived"] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];
export const REJECTION_REASONS = ["invalid_transition", "stale_event", "order_already_reversed", "compensated_lost_scan"] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];
export const CUSTODY_TYPES = ["collected_cod", "handed_over", "lost", "written_off", "reversed"] as const;
export type CustodyType = (typeof CUSTODY_TYPES)[number];
export const AWB_STATUSES = ["pending", "processing", "issued", "failed"] as const;
export type AwbStatus = (typeof AWB_STATUSES)[number];

/** FR-38.04 / M39 §5 — `ALLOWED_TRANSITIONS`. */
export const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  label_pending: ["pending_pickup", "cancelled"],
  pending_pickup: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "returned", "cancelled"],
  in_transit: ["delivered", "returned"],
  delivered: ["returned"],
  returned: [],
  cancelled: [],
  compensated_lost: [],
};

const M15_LABEL: Record<ShipmentStatus, string> = {
  label_pending: "بانتظار تأكيد الملصق",
  pending_pickup: "بانتظار الاستلام",
  picked_up: "تم الاستلام",
  in_transit: "قيد التوصيل",
  delivered: "تم التسليم",
  returned: "مُعاد",
  cancelled: "ملغي",
  compensated_lost: "شحنة مُعوَّضة",
};

export interface ShipItem {
  fulfillment_item_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  delivered_quantity: number | null;
  rejection_reason: string;
}
export interface RichEvent {
  id: number;
  event_time: string;
  received_at: string;
  from_status: ShipmentStatus | null;
  to_status: ShipmentStatus;
  source: EventSource;
  actor_type: "agent" | "merchant" | "carrier" | "system";
  actor_id: number | null;
  actor_name: string;
  idempotency_key: string;
  is_rejected: boolean;
  rejection_reason: RejectionReason | null;
  out_of_order: boolean;
  flagged_for_review: boolean;
  geo: { lat: number; lng: number; accuracy_m: number | null } | null;
}
export interface ShipExt {
  id: number;
  order_id: number;
  fulfillment_id: number | null;
  carrier_code: "sharwa_ship" | "aramex" | "smsa";
  zone_code: string | null;
  zone_name_snapshot: string;
  cost_snapshot: number;
  currency: Currency;
  actual_weight_snapshot: string;
  master_waybill_number: string | null;
  parent_shipment: number | null;
  billing_status: BillingStatus;
  agent_id: number | null;
  cod_amount: number;
  items: ShipItem[];
  delivered_at: string | null;
  collected_at: string | null;
  events: RichEvent[];
}
export interface Shift {
  id: number;
  agent_id: number;
  vehicle_ref: string;
  started_at: string;
  ended_at: string | null;
  handed_over_to: number | null;
}
export interface CustodyEntry {
  id: number;
  agent_id: number;
  entry_type: CustodyType;
  /** Signed: + increases what the agent holds, − decreases it. */
  amount: number;
  currency: Currency;
  related_shipment: number | null;
  related_shift: number | null;
  reverses: number | null;
  note: string;
  created_at: string;
}
export interface AwbItem {
  id: number;
  shipment_id: number | null;
  order_id: number;
  fulfillment_id: number;
  carrier_code: "aramex" | "smsa";
  status: AwbStatus;
  attempts: number;
  error_detail: string;
  updated_at: string;
}
export interface RateCard {
  carrier_code: "aramex" | "smsa";
  zone_code: string;
  currency: Currency;
  expected_price: number;
  last_confirmed_price: number;
  updated_at: string;
}
interface ShipState {
  ext: Map<number, ShipExt>;
  shifts: Shift[];
  custody: CustodyEntry[];
  awb: AwbItem[];
  rateCards: RateCard[];
  /** Idempotency: `${shipment}:${to}:${uuid}` → the first response. */
  statusKeys: Map<string, TransitionResponse>;
  /** `partial:${uuid}` → the first response. */
  partialKeys: Map<string, PartialResponse>;
  /** The over-weight and the no-fulfillment pending-order fixtures, fixed at seed time. */
  heavyOrderId: number | null;
  noFulfillmentOrderId: number | null;
  ids: Record<string, number>;
}

export interface TransitionResponse {
  shipment_id: number;
  waybill_number: string;
  status: ShipmentStatus;
  accepted: boolean;
  rejection_reason: RejectionReason | null;
  flagged_for_review: boolean;
}
export interface PartialResponse {
  collected_amount: string;
  display_collected_amount: string;
  currency: Currency;
  delivered: number;
  rejected: number;
  duplicate: boolean;
  status: ShipmentStatus;
}

const at = (hoursAgo: number) => new Date(FIXTURE_NOW - hoursAgo * 3_600_000).toISOString();
const ahead = (hours: number) => new Date(FIXTURE_NOW + hours * 3_600_000).toISOString();
const now = () => new Date().toISOString();
const str = (v: unknown) => (typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v).trim());
const PENDING_STATUSES: MockOrder["status"][] = ["new", "awaiting_payment", "payment_review", "pending_payment"];

function nid(s: ShipState, entity: string, start: number) {
  s.ids[entity] = (s.ids[entity] ?? start) + 1;
  return s.ids[entity]!;
}

// ── agents (M15 providers without a carrier = in-house agents) ───────────────────────
export function agents(store: string | null) {
  return shippingState(store).providers.filter((p) => !p.carrier_code);
}
export function agentById(store: string | null, id: number | null | undefined) {
  if (id === null || id === undefined) return undefined;
  return agents(store).find((a) => a.id === id);
}
/** FR-38 §2: a staff account linked to a provider profile (`shipping_provider_profile`). */
export function agentForStaff(store: string | null, staffId: number) {
  return agents(store).find((a) => a.staff_account === staffId);
}
const agentName = (store: string | null, id: number | null) => (id === null ? "—" : (agentById(store, id)?.name.split(" — ")[0] ?? `مندوب #${id}`));

// ── weight preview (FR-39.03) ───────────────────────────────────────────────────────
function lineWeightKg(o: MockOrder, i: number): number {
  const l = o.lines[i]!;
  return (((l.product_id ?? l.id) % 7) + 1) * 0.35;
}
function weightPreview(o: MockOrder, heavy: boolean) {
  const qty = (i: number) => Number(o.lines[i]!.quantity) || 1;
  let actual = o.lines.reduce((sum, _l, i) => sum + lineWeightKg(o, i) * qty(i), 0) + 0.18;
  if (heavy) actual = Math.max(actual * 14, 31.5);
  // Default packaging (M15 profile #1, 20×15×10) per 3 items, divisor 5000.
  const boxes = Math.max(1, Math.ceil(o.lines.reduce((s, _l, i) => s + qty(i), 0) / 3));
  const volumetric = ((20 * 15 * 10) / 5000) * boxes * (heavy ? 6 : 1);
  const chargeable = Math.max(actual, volumetric);
  return { actual: actual.toFixed(3), volumetric: volumetric.toFixed(3), chargeable: chargeable.toFixed(3) };
}

function itemsOf(o: MockOrder, fulfillmentId: number): ShipItem[] {
  return o.lines.map((l, i) => ({ fulfillment_item_id: fulfillmentId * 10 + i + 1, product_name: l.variant_label ? `${l.product_name} — ${l.variant_label}` : l.product_name, quantity: Math.max(1, Number(l.quantity) || 1), unit_price: Number(l.price) || 0, delivered_quantity: null, rejection_reason: "" }));
}
function codOf(o: MockOrder, force: boolean): number {
  if (o.payment_method !== "cod" && !force) return 0;
  const lines = o.lines.reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.quantity) || 1), 0);
  // `force`: the fixture treats the order as cash-on-delivery whatever was paid online.
  return Math.max(0, lines + (Number(o.delivery_fee) || 0) - (force ? 0 : Number(o.paid) || 0) - (Number(o.discount) || 0));
}

// ── seed ────────────────────────────────────────────────────────────────────────────
interface SeedRow {
  id: number;
  status: ShipmentStatus;
  agent: number | null;
  zone: string | null;
  carrier?: ShipExt["carrier_code"];
  billing?: BillingStatus;
  cod?: boolean;
  master?: string;
  parent?: number;
  hoursAgo: number;
}

function seed(store: string | null): ShipState {
  const s: ShipState = { ext: new Map(), shifts: [], custody: [], awb: [], rateCards: [], statusKeys: new Map(), partialKeys: new Map(), heavyOrderId: null, noFulfillmentOrderId: null, ids: {} };
  if (isEmptyStore(store)) return s;
  const ship = shippingState(store);
  const orders = ordersState(store).orders.filter((o) => o.status !== "cancelled");
  const zones = platformState().zones;
  const zoneBy = (code: string | null) => zones.find((z) => z.code === code);

  const rows: SeedRow[] = [
    { id: 701, status: "in_transit", agent: 1, zone: "SAN-01", cod: true, hoursAgo: 40 },
    { id: 702, status: "in_transit", agent: null, zone: null, carrier: "aramex", hoursAgo: 30 },
    { id: 703, status: "pending_pickup", agent: 1, zone: "ADN-01", hoursAgo: 60 },
    { id: 704, status: "label_pending", agent: null, zone: "TAZ-01", hoursAgo: 70 },
    { id: 705, status: "picked_up", agent: 1, zone: "SAN-01", hoursAgo: 50 },
    { id: 706, status: "delivered", agent: 2, zone: "HOD-01", billing: "collected", hoursAgo: 90 },
    { id: 707, status: "pending_pickup", agent: 1, zone: "SAN-01", cod: true, hoursAgo: 8 },
    { id: 708, status: "pending_pickup", agent: 1, zone: "SAN-01", hoursAgo: 7 },
    { id: 709, status: "picked_up", agent: 1, zone: "SAN-01", cod: true, hoursAgo: 12 },
    { id: 710, status: "in_transit", agent: 1, zone: "SAN-01", cod: true, hoursAgo: 14 },
    { id: 711, status: "in_transit", agent: 1, zone: "SAN-01", cod: true, hoursAgo: 15 },
    { id: 712, status: "delivered", agent: 1, zone: "SAN-01", cod: true, billing: "pending", hoursAgo: 30 },
    { id: 713, status: "returned", agent: 1, zone: "ADN-01", billing: "waived", hoursAgo: 80 },
    { id: 714, status: "compensated_lost", agent: 1, zone: "SAN-01", billing: "waived", hoursAgo: 120 },
    { id: 715, status: "in_transit", agent: 1, zone: "SAN-01", hoursAgo: 16 },
    { id: 716, status: "pending_pickup", agent: 2, zone: "TAZ-01", master: "SHW-26100716", hoursAgo: 20 },
    { id: 717, status: "pending_pickup", agent: 2, zone: "TAZ-01", master: "SHW-26100716", parent: 716, hoursAgo: 20 },
    { id: 718, status: "pending_pickup", agent: 2, zone: "TAZ-01", master: "SHW-26100716", parent: 716, hoursAgo: 20 },
    { id: 719, status: "label_pending", agent: null, zone: null, carrier: "smsa", hoursAgo: 5 },
  ];

  rows.forEach((r, i) => {
    let m15 = ship.shipments.find((x) => x.id === r.id);
    const order = m15 ? (orders.find((o) => o.id === m15!.order_id) ?? orders[i % orders.length]!) : orders[(20 + i) % orders.length]!;
    if (!m15) {
      m15 = {
        id: r.id,
        waybill: r.carrier === "smsa" ? `29081${r.id}4410` : `SHW-26100${r.id}`,
        order_id: order.id,
        customer_name: order.customer_name,
        status: r.status,
        address: order.address,
        carrier: r.carrier === "smsa" ? "سمسا" : r.carrier === "aramex" ? "أرامكس" : "شروة شيب",
        version: 1,
        zone_code: r.zone,
        created_at: at(r.hoursAgo),
        sla_deadline: ahead(24 + i),
        pickup_location_id: null,
        events: [],
      } satisfies MockShipment;
      ship.shipments.push(m15);
    }
    const fulfillment = 8000 + r.id;
    const zone = zoneBy(r.zone);
    const items = itemsOf(order, fulfillment);
    const weight = items.reduce((sum, it, k) => sum + (((k + 2) % 5) + 1) * 0.3 * it.quantity, 0.18);
    const ext: ShipExt = {
      id: r.id,
      order_id: m15.order_id,
      fulfillment_id: fulfillment,
      carrier_code: r.carrier ?? "sharwa_ship",
      zone_code: r.zone,
      zone_name_snapshot: zone?.name ?? (r.carrier === "aramex" ? "الرياض — أرامكس" : r.carrier === "smsa" ? "جدة — سمسا" : "—"),
      cost_snapshot: zone ? Number(zone.price) : r.carrier ? 35 : 0,
      currency: zone?.currency ?? "SAR",
      actual_weight_snapshot: weight.toFixed(3),
      master_waybill_number: r.master && r.parent ? r.master : null,
      parent_shipment: r.parent ?? null,
      billing_status: r.billing ?? "pending",
      agent_id: r.agent,
      cod_amount: r.cod ? codOf(order, true) : 0,
      items,
      delivered_at: null,
      collected_at: null,
      events: [],
    };
    // Accepted history from `label_pending` to the seeded status.
    const path = pathTo(r.status);
    const start = r.hoursAgo;
    path.forEach((step, k) => {
      const t = at(start - k * 2);
      ext.events.push(event(s, { from: k === 0 ? null : path[k - 1]!, to: step, source: k === 0 ? "system" : r.carrier ? "webhook" : "agent_app", actor: k === 0 ? { type: "system", id: null, name: "النظام" } : r.carrier ? { type: "carrier", id: null, name: r.carrier === "aramex" ? "أرامكس" : "سمسا" } : { type: "agent", id: r.agent, name: agentName(store, r.agent) }, time: t, received: t }));
    });
    if (r.status === "delivered" || r.status === "returned") ext.delivered_at = at(start - path.length);
    if (ext.billing_status === "collected") ext.collected_at = at(start - path.length - 1);
    s.ext.set(r.id, ext);
  });

  // Flags the M15 queues already show, carried into the full log (M15 ↔ M39 coherence).
  const add = (id: number, e: Parameters<typeof event>[1]) => s.ext.get(id)?.events.push(event(s, e));
  const agentActor = (id: number) => ({ type: "agent" as const, id, name: agentName(store, id) });
  add(701, { from: "in_transit", to: "picked_up", source: "agent_app", actor: agentActor(1), time: at(19), received: at(18), rejected: "stale_event", outOfOrder: true });
  add(703, { from: "pending_pickup", to: "delivered", source: "webhook", actor: { type: "carrier", id: null, name: "webhook الناقل" }, time: at(8), received: at(8), rejected: "invalid_transition" });
  add(705, { from: "pending_pickup", to: "picked_up", source: "agent_app", actor: agentActor(1), time: at(31), received: at(30), flagged: true });
  add(706, { from: "delivered", to: "in_transit", source: "webhook", actor: { type: "carrier", id: null, name: "webhook الناقل" }, time: at(49), received: at(49), rejected: "stale_event", outOfOrder: true });
  add(714, { from: "compensated_lost", to: "picked_up", source: "agent_app", actor: agentActor(1), time: at(20), received: at(20), rejected: "compensated_lost_scan" });
  // A late device sync (event_time well before received_at — US-39.3 a2).
  add(710, { from: "picked_up", to: "in_transit", source: "agent_app", actor: agentActor(1), time: at(11.5), received: at(10.2), rejected: "stale_event" });
  // delivered → returned (US-39.3 a3) on 713: the last accepted event is flagged.
  const e713 = s.ext.get(713)!;
  e713.events[e713.events.length - 1]!.flagged_for_review = true;
  const e715 = s.ext.get(715)!;
  e715.events[e715.events.length - 1]!.flagged_for_review = true;

  // ── shifts + custody ────────────────────────────────────────────────────────────
  s.shifts.push({ id: nid(s, "shift", 300), agent_id: 1, vehicle_ref: "دراجة نارية 14", started_at: at(30), ended_at: at(20), handed_over_to: null });
  s.shifts.push({ id: nid(s, "shift", 300), agent_id: 2, vehicle_ref: "هايلكس 7", started_at: at(28), ended_at: at(18), handed_over_to: null });
  s.shifts.push({ id: nid(s, "shift", 300), agent_id: 1, vehicle_ref: "دراجة نارية 14", started_at: at(5), ended_at: null, handed_over_to: null });
  const sh1 = s.shifts[0]!.id;
  const sh2 = s.shifts[1]!.id;
  const open1 = s.shifts[2]!.id;
  const cod712 = s.ext.get(712)!.cod_amount || 180;
  const c = (agent: number, type: CustodyType, amount: number, shipment: number | null, shift: number | null, hoursAgo: number, note = "", reverses: number | null = null) =>
    s.custody.push({ id: nid(s, "custody", 500), agent_id: agent, entry_type: type, amount, currency: "SAR", related_shipment: shipment, related_shift: shift, reverses, note, created_at: at(hoursAgo) });
  c(1, "collected_cod", 240, 706, sh1, 26);
  c(1, "handed_over", -240, null, sh1, 20, "سُلّمت للخزينة");
  c(1, "collected_cod", cod712, 712, sh1, 22);
  c(1, "collected_cod", 95, 713, sh1, 61);
  c(1, "reversed", -95, 713, sh1, 59, "ارتداد بعد التسليم — أُعيد المبلغ للعميل", s.custody[s.custody.length - 1]!.id);
  c(2, "collected_cod", 410, 706, sh2, 48);
  c(2, "written_off", -10, 706, sh2, 47, "فرق فكة");
  void open1;

  // ── AWB queue + rate cards ──────────────────────────────────────────────────────
  s.awb.push({ id: 1, shipment_id: 719, order_id: s.ext.get(719)!.order_id, fulfillment_id: 8719, carrier_code: "smsa", status: "failed", attempts: 5, error_detail: "SMSA: Invalid passkey (401).", updated_at: at(3) });
  s.awb.push({ id: 2, shipment_id: null, order_id: s.ext.get(704)!.order_id, fulfillment_id: 8704, carrier_code: "aramex", status: "pending", attempts: 2, error_detail: "Aramex: timeout بعد 30 ثانية.", updated_at: at(1) });
  s.awb.push({ id: 3, shipment_id: 702, order_id: s.ext.get(702)!.order_id, fulfillment_id: 8702, carrier_code: "aramex", status: "issued", attempts: 1, error_detail: "", updated_at: at(29) });
  s.awb.push({ id: 4, shipment_id: null, order_id: orders[3]!.id, fulfillment_id: 8650, carrier_code: "aramex", status: "processing", attempts: 1, error_detail: "", updated_at: at(0.2) });
  s.rateCards.push(
    { carrier_code: "aramex", zone_code: "SAN-01", currency: "SAR", expected_price: 32, last_confirmed_price: 30, updated_at: at(48) },
    { carrier_code: "aramex", zone_code: "ADN-01", currency: "SAR", expected_price: 44, last_confirmed_price: 36, updated_at: at(6) },
    { carrier_code: "smsa", zone_code: "SAN-01", currency: "SAR", expected_price: 28, last_confirmed_price: 28, updated_at: at(96) },
    { carrier_code: "smsa", zone_code: "TAZ-01", currency: "SAR", expected_price: 39, last_confirmed_price: 33, updated_at: at(12) },
  );
  const shippedAtSeed = new Set([...s.ext.values()].map((e) => e.order_id));
  for (const sh of ship.shipments) shippedAtSeed.add(sh.order_id);
  const free = ordersState(store).orders.filter((o) => PENDING_STATUSES.includes(o.status) && !shippedAtSeed.has(o.id));
  s.heavyOrderId = free[2]?.id ?? null;
  s.noFulfillmentOrderId = free[5]?.id ?? null;
  return s;
}

function pathTo(status: ShipmentStatus): ShipmentStatus[] {
  const order: ShipmentStatus[] = ["label_pending", "pending_pickup", "picked_up", "in_transit", "delivered"];
  if (status === "returned") return [...order, "returned"];
  if (status === "cancelled") return ["label_pending", "cancelled"];
  if (status === "compensated_lost") return ["label_pending", "pending_pickup", "picked_up", "in_transit", "compensated_lost"];
  return order.slice(0, order.indexOf(status) + 1);
}

function event(
  s: ShipState,
  e: { from: ShipmentStatus | null; to: ShipmentStatus; source: EventSource; actor: { type: RichEvent["actor_type"]; id: number | null; name: string }; time: string; received: string; rejected?: RejectionReason; outOfOrder?: boolean; flagged?: boolean; geo?: RichEvent["geo"]; key?: string },
): RichEvent {
  const id = nid(s, "event", 9000);
  return {
    id,
    event_time: e.time,
    received_at: e.received,
    from_status: e.from,
    to_status: e.to,
    source: e.source,
    actor_type: e.actor.type,
    actor_id: e.actor.id,
    actor_name: e.actor.name,
    idempotency_key: e.key ?? `seed-${id}`,
    is_rejected: Boolean(e.rejected),
    rejection_reason: e.rejected ?? null,
    out_of_order: e.outOfOrder ?? false,
    flagged_for_review: e.flagged ?? false,
    geo: e.geo ?? null,
  };
}

export function shipState(store: string | null): ShipState {
  return storeState(store, "sharwa-ship", () => seed(store));
}

function m15Of(store: string | null, id: number) {
  return shippingState(store).shipments.find((x) => x.id === id);
}

// ── the state machine (FR-38.04/05, FR-39.06) ────────────────────────────────────────
export interface TransitionInput {
  to_status?: unknown;
  client_generated_uuid?: unknown;
  event_time?: unknown;
  geo_lat?: unknown;
  geo_lng?: unknown;
  geo_accuracy_m?: unknown;
}

export function transition(
  store: string | null,
  shipmentId: number,
  body: TransitionInput,
  source: EventSource,
  actor: { type: RichEvent["actor_type"]; id: number | null; name: string },
): MockResult<TransitionResponse> {
  const s = shipState(store);
  const ext = s.ext.get(shipmentId);
  const m15 = m15Of(store, shipmentId);
  if (!ext || !m15) return { ok: false, status: 404, body: { detail: "الشحنة غير موجودة." } };
  const to = str(body.to_status);
  const uuid = str(body.client_generated_uuid);
  const errors: Record<string, string[]> = {};
  if (!(SHIPMENT_STATUSES as readonly string[]).includes(to)) errors.to_status = ["حالة غير معروفة."];
  if (!uuid) errors.client_generated_uuid = ["هذا الحقل مطلوب."];
  else if (uuid.length > 64) errors.client_generated_uuid = ["تأكد أن هذا الحقل لا يحتوي على أكثر من 64 حرفاً."];
  const rawTime = str(body.event_time);
  const eventTime = rawTime ? new Date(rawTime) : new Date();
  if (rawTime && Number.isNaN(eventTime.getTime())) errors.event_time = ["صيغة التاريخ غير صحيحة."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  const toStatus = to as ShipmentStatus;
  const key = `${shipmentId}:${toStatus}:${uuid}`;
  const seen = s.statusKeys.get(key);
  if (seen) return { ok: true, data: seen };

  const lat = Number(body.geo_lat);
  const lng = Number(body.geo_lng);
  const acc = body.geo_accuracy_m === undefined || body.geo_accuracy_m === null || body.geo_accuracy_m === "" ? null : Number(body.geo_accuracy_m);
  const geo = Number.isFinite(lat) && Number.isFinite(lng) && body.geo_lat !== undefined && body.geo_lat !== null ? { lat, lng, accuracy_m: acc !== null && Number.isFinite(acc) ? acc : null } : null;

  const current = m15.status;
  const lastAccepted = [...ext.events].filter((e) => !e.is_rejected).sort((a, b) => b.event_time.localeCompare(a.event_time))[0];
  const order = ordersState(store).orders.find((o) => o.id === ext.order_id);
  let reason: RejectionReason | null = null;
  if (current === "compensated_lost") reason = "compensated_lost_scan";
  else if (order?.status === "refunded" && toStatus !== "returned" && toStatus !== "cancelled") reason = "order_already_reversed";
  else if (!ALLOWED_TRANSITIONS[current].includes(toStatus)) reason = "invalid_transition";
  else if (lastAccepted && eventTime.toISOString() < lastAccepted.event_time) reason = "stale_event";

  const flagged = !reason && ((current === "delivered" && toStatus === "returned") || (geo?.accuracy_m ?? 0) > 500);
  const ev = event(s, { from: current, to: toStatus, source, actor, time: eventTime.toISOString(), received: now(), rejected: reason ?? undefined, flagged, geo, key });
  ext.events.push(ev);
  m15.events.push({ id: ev.id, label: M15_LABEL[toStatus], source, occurred_at: ev.event_time, out_of_order: false, flagged_for_review: flagged, is_rejected: Boolean(reason), note: reason ? REJECTION_TEXT[reason] : "" });
  if (!reason) {
    m15.status = toStatus;
    m15.version += 1;
    if (toStatus === "delivered") ext.delivered_at = ev.event_time;
  }
  const res: TransitionResponse = { shipment_id: shipmentId, waybill_number: m15.waybill, status: m15.status, accepted: !reason, rejection_reason: reason, flagged_for_review: flagged || Boolean(lastFlagged(ext)) };
  s.statusKeys.set(key, res);
  return { ok: true, data: res };
}

function lastFlagged(ext: ShipExt) {
  const accepted = ext.events.filter((e) => !e.is_rejected).sort((a, b) => b.event_time.localeCompare(a.event_time));
  return accepted[0]?.flagged_for_review ? accepted[0] : undefined;
}

export const REJECTION_TEXT: Record<RejectionReason, string> = {
  invalid_transition: "انتقال غير مسموح من الحالة الحالية.",
  stale_event: "حدث أقدم من آخر حدث مسجَّل — أُرشِف بلا تغيير.",
  order_already_reversed: "الطلب مسترجَع مسبقاً — لا يُطبَّق الحدث.",
  compensated_lost_scan: "شحنة مُعوَّضة كمفقودة — تواصل مع المشرف.",
};

// ── custody (balance = Σ signed amounts, server-side only) ───────────────────────────
export function balanceOf(store: string | null, agentId: number): number {
  return shipState(store).custody.filter((c) => c.agent_id === agentId).reduce((sum, c) => sum + c.amount, 0);
}
export function openShift(store: string | null, agentId: number): Shift | undefined {
  return shipState(store).shifts.find((x) => x.agent_id === agentId && x.ended_at === null);
}

// ── views ───────────────────────────────────────────────────────────────────────────
function costView(e: ShipExt) {
  return displayMoney(e.cost_snapshot, e.currency);
}

export function shipmentRow(store: string | null, e: ShipExt) {
  const m15 = m15Of(store, e.id)!;
  const s = shipState(store);
  return {
    id: e.id,
    waybill_number: m15.waybill,
    order_id: e.order_id,
    customer_name: m15.customer_name,
    address: m15.address,
    carrier_code: e.carrier_code,
    zone_code: e.zone_code,
    zone_name_snapshot: e.zone_name_snapshot,
    display_cost: costView(e),
    actual_weight_snapshot: e.actual_weight_snapshot,
    status: m15.status,
    billing_status: e.billing_status,
    master_waybill_number: e.master_waybill_number,
    parent_shipment: e.parent_shipment,
    children_count: [...s.ext.values()].filter((x) => x.parent_shipment === e.id).length,
    agent: e.agent_id === null ? null : { id: e.agent_id, name: agentName(store, e.agent_id) },
    flagged_for_review: Boolean(lastFlagged(e)),
    created_at: m15.created_at,
  };
}

export function shipmentDetail(store: string | null, e: ShipExt) {
  const m15 = m15Of(store, e.id)!;
  const s = shipState(store);
  return {
    ...shipmentRow(store, e),
    fulfillment_id: e.fulfillment_id,
    version: m15.version,
    display_cod_amount: displayMoney(e.cod_amount, "SAR"),
    cod_amount: e.cod_amount.toFixed(2),
    delivered_at: e.delivered_at,
    collected_at: e.collected_at,
    allowed_transitions: ALLOWED_TRANSITIONS[m15.status],
    children: [...s.ext.values()].filter((x) => x.parent_shipment === e.id).map((x) => ({ id: x.id, waybill_number: m15Of(store, x.id)!.waybill, status: m15Of(store, x.id)!.status })),
    items: e.items.map((i) => ({ fulfillment_item_id: i.fulfillment_item_id, product_name: i.product_name, quantity: i.quantity, delivered_quantity: i.delivered_quantity, rejection_reason: i.rejection_reason, display_unit_price: displayMoney(i.unit_price, "SAR") })),
    events: [...e.events].sort((a, b) => b.event_time.localeCompare(a.event_time) || b.id - a.id),
  };
}

export function findExt(store: string | null, id: number) {
  return shipState(store).ext.get(id);
}
export function findByFulfillment(store: string | null, fulfillmentId: number) {
  return [...shipState(store).ext.values()].find((e) => e.fulfillment_id === fulfillmentId);
}

// ── M39 dashboard rows ──────────────────────────────────────────────────────────────
export function pendingOrders(store: string | null) {
  if (isEmptyStore(store)) return [];
  const shipped = new Set([...shipState(store).ext.values()].map((e) => e.order_id));
  for (const sh of shippingState(store).shipments) shipped.add(sh.order_id);
  const st = shipState(store);
  const orders = ordersState(store).orders.filter((o) => PENDING_STATUSES.includes(o.status) && !shipped.has(o.id)).slice(0, 8);
  return orders.map((o) => {
    const noFulfillment = o.id === st.noFulfillmentOrderId;
    const preview = noFulfillment ? null : weightPreview(o, o.id === st.heavyOrderId);
    const chargeable = preview ? Number(preview.chargeable) : 0;
    return {
      order_id: o.id,
      customer_name: o.customer_name,
      address: o.address,
      fulfillment_id: noFulfillment ? null : 7000 + o.id,
      weight_preview: preview,
      awb_plan_count: Math.max(1, Math.ceil(chargeable / 25)),
      created_at: o.created_at,
    };
  });
}

export function issueWaybill(store: string | null, orderId: number, b: Body): MockResult<ReturnType<typeof shipmentDetail>> {
  const pending = pendingOrders(store).find((p) => p.order_id === orderId);
  if (!pending) return { ok: false, status: 404, body: { detail: "الطلب غير موجود أو صدرت له بوليصة." } };
  const code = str(b.zone_code);
  if (!code) return { ok: false, status: 400, body: { zone_code: ["يرجى تحديد منطقة الشحن."] } };
  const zone = platformState().zones.find((z) => z.code === code);
  if (!zone || !zone.is_active) return { ok: false, status: 400, body: { zone_code: ["المنطقة غير متاحة."] } };
  const chargeable = Number(pending.weight_preview?.chargeable ?? 0);
  if (chargeable > 25) {
    return { ok: false, status: 400, body: { detail: `الوزن القابل للاحتساب ${chargeable.toFixed(3)} كغ يتجاوز الحد الأقصى للبوليصة لدى المندوب (25.000 كغ).`, reason: "max_weight_per_awb", split_plan: { awb_count: pending.awb_plan_count } } };
  }
  const s = shipState(store);
  const order = ordersState(store).orders.find((o) => o.id === orderId)!;
  const id = Math.max(...[...s.ext.keys(), ...shippingState(store).shipments.map((x) => x.id)]) + 1;
  const created = now();
  const waybill = `SHW-${Date.now().toString().slice(-10)}`;
  shippingState(store).shipments.push({ id, waybill, order_id: orderId, customer_name: order.customer_name, status: "pending_pickup", address: order.address, carrier: "شروة شيب", version: 1, zone_code: zone.code, created_at: created, sla_deadline: new Date(Date.now() + 48 * 3_600_000).toISOString(), pickup_location_id: null, events: [] });
  const fulfillment = pending.fulfillment_id ?? 7000 + orderId;
  const ext: ShipExt = {
    id,
    order_id: orderId,
    fulfillment_id: pending.fulfillment_id,
    carrier_code: "sharwa_ship",
    zone_code: zone.code,
    zone_name_snapshot: zone.name,
    cost_snapshot: Number(zone.price),
    currency: zone.currency,
    actual_weight_snapshot: pending.weight_preview?.actual ?? "0.000",
    master_waybill_number: null,
    parent_shipment: null,
    billing_status: "pending",
    agent_id: null,
    cod_amount: codOf(order, false),
    items: itemsOf(order, fulfillment),
    delivered_at: null,
    collected_at: null,
    events: [],
  };
  ext.events.push(event(s, { from: null, to: "label_pending", source: "system", actor: { type: "system", id: null, name: "النظام" }, time: created, received: created }));
  ext.events.push(event(s, { from: "label_pending", to: "pending_pickup", source: "system", actor: { type: "system", id: null, name: "النظام" }, time: created, received: created }));
  s.ext.set(id, ext);
  return { ok: true, status: 201, data: shipmentDetail(store, ext) };
}

export function listShipments(store: string | null, p: URLSearchParams) {
  const status = p.get("status");
  const billing = p.get("billing_status") ?? p.get("billing");
  const carrier = p.get("carrier");
  const q = (p.get("q") ?? "").trim().toLowerCase();
  const from = p.get("from");
  const to = p.get("to");
  const rows = [...shipState(store).ext.values()]
    .map((e) => shipmentRow(store, e))
    // Children are listed under their master (US-39.2 a3).
    .filter((r) => r.parent_shipment === null)
    .filter((r) => !status || r.status === status)
    .filter((r) => !billing || r.billing_status === billing)
    .filter((r) => !carrier || r.carrier_code === carrier)
    .filter((r) => !q || r.waybill_number.toLowerCase().includes(q) || r.customer_name.toLowerCase().includes(q) || String(r.order_id) === q)
    .filter((r) => !from || r.created_at.slice(0, 10) >= from)
    .filter((r) => !to || r.created_at.slice(0, 10) <= to)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  const page = Math.max(1, Number(p.get("page") ?? 1) || 1);
  const size = Math.min(100, Math.max(1, Number(p.get("page_size") ?? 20) || 20));
  const all = [...shipState(store).ext.values()].filter((e) => e.parent_shipment === null).map((e) => m15Of(store, e.id)!.status);
  return {
    count: rows.length,
    results: rows.slice((page - 1) * size, page * size),
    counts: { pending_pickup: all.filter((x) => x === "pending_pickup").length, in_transit: all.filter((x) => x === "in_transit").length, delivered: all.filter((x) => x === "delivered").length },
  };
}

export function assignShipment(store: string | null, id: number, b: Body): MockResult<ReturnType<typeof shipmentRow>> {
  const e = findExt(store, id);
  if (!e) return { ok: false, status: 404, body: { detail: "الشحنة غير موجودة." } };
  const agent = agentById(store, Number(b.agent_id));
  if (!agent || !agent.is_active) return { ok: false, status: 400, body: { agent_id: ["يرجى اختيار مندوب نشط."] } };
  e.agent_id = agent.id;
  for (const child of shipState(store).ext.values()) if (child.parent_shipment === id) child.agent_id = agent.id;
  return { ok: true, data: shipmentRow(store, e) };
}

export function listAwb(store: string | null) {
  return shipState(store).awb.map((a) => ({ ...a, waybill_number: a.shipment_id === null ? null : (m15Of(store, a.shipment_id)?.waybill ?? null) }));
}
export function retryAwb(store: string | null, id: number): MockResult<ReturnType<typeof listAwb>[number]> {
  const a = shipState(store).awb.find((x) => x.id === id);
  if (!a) return { ok: false, status: 404, body: { detail: "العنصر غير موجود." } };
  if (a.status !== "failed") return { ok: false, status: 409, body: { detail: "إعادة المحاولة متاحة للعناصر الفاشلة فقط." } };
  a.status = "pending";
  a.attempts += 1;
  a.error_detail = "";
  a.updated_at = now();
  return { ok: true, data: { ...a, waybill_number: a.shipment_id === null ? null : (m15Of(store, a.shipment_id)?.waybill ?? null) } };
}

/** «بانتظار تأكيد التسعيرة» when the expected price drifts more than 10% from the last confirmed one. */
export const RATE_DRIFT_THRESHOLD = 0.1;
export function listRateCards(store: string | null) {
  if (isEmptyStore(store)) return [];
  return shipState(store).rateCards.map((r) => {
    const drift = r.last_confirmed_price ? (r.expected_price - r.last_confirmed_price) / r.last_confirmed_price : 0;
    return {
      carrier_code: r.carrier_code,
      zone_code: r.zone_code,
      zone_name: platformState().zones.find((z) => z.code === r.zone_code)?.name ?? r.zone_code,
      currency: r.currency,
      display_expected_price: displayMoney(r.expected_price, r.currency),
      display_last_confirmed_price: displayMoney(r.last_confirmed_price, r.currency),
      drift_percent: `${drift >= 0 ? "+" : "−"}${Math.abs(drift * 100).toFixed(1)}%`,
      awaiting_confirmation: Math.abs(drift) > RATE_DRIFT_THRESHOLD,
      updated_at: r.updated_at,
    };
  });
}

function shiftView(store: string | null, sh: Shift | undefined) {
  return sh ? { id: sh.id, started_at: sh.started_at, vehicle_ref: sh.vehicle_ref } : null;
}

const OPEN: ShipmentStatus[] = ["label_pending", "pending_pickup", "picked_up", "in_transit"];

export function supervisor(store: string | null) {
  const s = shipState(store);
  return {
    agents: agents(store).map((a) => ({
      id: a.id,
      name: a.name,
      is_active: a.is_active,
      open_shift: shiftView(store, openShift(store, a.id)),
      open_shipments: [...s.ext.values()].filter((e) => e.agent_id === a.id && OPEN.includes(m15Of(store, e.id)!.status)).length,
      display_balance: displayMoney(balanceOf(store, a.id), "SAR"),
    })),
    unassigned_new_orders: [...s.ext.values()].filter((e) => e.agent_id === null && e.carrier_code === "sharwa_ship" && OPEN.includes(m15Of(store, e.id)!.status) && e.parent_shipment === null).map((e) => shipmentRow(store, e)),
    reversals: s.custody
      .filter((c) => c.entry_type === "reversed")
      .slice(-100)
      .reverse()
      .map((c) => custodyView(store, c)),
  };
}

export function emergencyReassign(store: string | null, agentId: number, b: Body): MockResult<{ detail: string; moved_shipments: number; display_balance_moved: string }> {
  const from = agentById(store, agentId);
  if (!from) return { ok: false, status: 404, body: { detail: "المندوب غير موجود." } };
  const to = agentById(store, Number(b.new_agent_id));
  if (!to || !to.is_active || to.id === from.id) return { ok: false, status: 400, body: { new_agent_id: ["يرجى اختيار مندوب آخر صالح."] } };
  const s = shipState(store);
  let moved = 0;
  for (const e of s.ext.values()) {
    if (e.agent_id === from.id && OPEN.includes(m15Of(store, e.id)!.status)) {
      e.agent_id = to.id;
      moved += 1;
    }
  }
  const balance = balanceOf(store, from.id);
  if (balance !== 0) {
    const t = now();
    s.custody.push({ id: nid(s, "custody", 500), agent_id: from.id, entry_type: "handed_over", amount: -balance, currency: "SAR", related_shipment: null, related_shift: openShift(store, from.id)?.id ?? null, reverses: null, note: `إعادة إسناد طارئة إلى «${agentName(store, to.id)}»`, created_at: t });
    s.custody.push({ id: nid(s, "custody", 500), agent_id: to.id, entry_type: "handed_over", amount: balance, currency: "SAR", related_shipment: null, related_shift: openShift(store, to.id)?.id ?? null, reverses: null, note: `عهدة منقولة من «${agentName(store, from.id)}»`, created_at: t });
  }
  return { ok: true, data: { detail: `أُعيد إسناد كل شحنات «${agentName(store, from.id)}» إلى «${agentName(store, to.id)}» (شحنات + عهدة).`, moved_shipments: moved, display_balance_moved: displayMoney(balance, "SAR") } };
}

export function listShifts(store: string | null) {
  return [...shipState(store).shifts]
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .map((sh) => ({ ...sh, agent_name: agentName(store, sh.agent_id), handed_over_to_name: sh.handed_over_to === null ? null : agentName(store, sh.handed_over_to) }));
}

export function custodyView(store: string | null, c: CustodyEntry) {
  return {
    id: c.id,
    entry_type: c.entry_type,
    display_amount: displayMoney(Math.abs(c.amount), c.currency),
    sign: c.amount < 0 ? ("-" as const) : ("+" as const),
    currency: c.currency,
    related_shipment: c.related_shipment === null ? null : { id: c.related_shipment, waybill_number: m15Of(store, c.related_shipment)?.waybill ?? null },
    related_shift: c.related_shift,
    reverses: c.reverses,
    agent_name: agentName(store, c.agent_id),
    note: c.note,
    created_at: c.created_at,
  };
}

// ── M38 agent rows ──────────────────────────────────────────────────────────────────
export function agentMe(store: string | null, agentId: number) {
  const a = agentById(store, agentId)!;
  return { agent: { id: a.id, name: agentName(store, a.id) }, open_shift: shiftView(store, openShift(store, a.id)), display_balance: displayMoney(balanceOf(store, a.id), "SAR"), currency: "SAR" as const };
}

export function agentShipments(store: string | null, agentId: number, p: URLSearchParams) {
  const status = p.get("status");
  const mine = [...shipState(store).ext.values()].filter((e) => e.agent_id === agentId);
  const rows = mine
    .map((e) => {
      const m15 = m15Of(store, e.id)!;
      return {
        id: e.id,
        waybill_number: m15.waybill,
        status: m15.status,
        customer_name: m15.customer_name,
        address: m15.address,
        display_cod_amount: displayMoney(e.cod_amount, "SAR"),
        fulfillment_id: e.fulfillment_id,
        flagged_for_review: Boolean(lastFlagged(e)),
        items: e.items.map((i) => ({ fulfillment_item_id: i.fulfillment_item_id, product_name: i.product_name, quantity: i.quantity })),
      };
    })
    .sort((a, b) => a.id - b.id);
  const MAIN = ["pending_pickup", "picked_up", "in_transit", "delivered"];
  const counts = { pending_pickup: 0, picked_up: 0, in_transit: 0, delivered: 0, other: 0 } as Record<string, number>;
  for (const r of rows) counts[MAIN.includes(r.status) ? r.status : "other"]! += 1;
  const filtered = !status ? rows : status === "other" ? rows.filter((r) => !MAIN.includes(r.status)) : rows.filter((r) => r.status === status);
  return { count: filtered.length, counts, results: filtered };
}

export function agentShipmentDetail(store: string | null, agentId: number, id: number) {
  const e = findExt(store, id);
  if (!e || e.agent_id !== agentId) return null;
  const d = shipmentDetail(store, e);
  return { ...d, customer_name: d.customer_name, address: d.address };
}

export function agentCustody(store: string | null, agentId: number, p: URLSearchParams) {
  const rows = shipState(store)
    .custody.filter((c) => c.agent_id === agentId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
    .map((c) => custodyView(store, c));
  const page = Math.max(1, Number(p.get("page") ?? 1) || 1);
  return { count: rows.length, display_balance: displayMoney(balanceOf(store, agentId), "SAR"), results: rows.slice((page - 1) * 50, page * 50) };
}

export function startShift(store: string | null, agentId: number, b: Body): MockResult<{ shift_id: number; agent: { id: number; name: string }; started_at: string; closed_previous_shift_id: number | null }> {
  const s = shipState(store);
  const prev = openShift(store, agentId);
  const t = now();
  if (prev) prev.ended_at = t;
  const sh: Shift = { id: nid(s, "shift", 300), agent_id: agentId, vehicle_ref: str(b.vehicle_ref).slice(0, 50), started_at: t, ended_at: null, handed_over_to: null };
  s.shifts.push(sh);
  return { ok: true, status: 201, data: { shift_id: sh.id, agent: { id: agentId, name: agentName(store, agentId) }, started_at: sh.started_at, closed_previous_shift_id: prev?.id ?? null } };
}

export function endShift(store: string | null, agentId: number, b: Body): MockResult<{ shift_id: number; ended_at: string } | { new_shift_id: number; handed_over_to: { id: number; name: string }; balance: string }> {
  const s = shipState(store);
  const shiftId = Number(b.shift_id);
  if (!Number.isInteger(shiftId)) return { ok: false, status: 400, body: { shift_id: ["معرّف المناوبة غير صالح."] } };
  const sh = s.shifts.find((x) => x.id === shiftId && x.agent_id === agentId);
  if (!sh) return { ok: false, status: 404, body: { detail: "المناوبة غير موجودة." } };
  if (sh.ended_at) return { ok: false, status: 400, body: { shift_id: ["هذه المناوبة مغلقة مسبقاً."] } };
  const t = now();
  const hasNew = b.new_agent_id !== undefined && b.new_agent_id !== null && b.new_agent_id !== "";
  if (!hasNew) {
    sh.ended_at = t;
    return { ok: true, data: { shift_id: sh.id, ended_at: t } };
  }
  const newId = Number(b.new_agent_id);
  if (!Number.isInteger(newId) || newId === agentId) return { ok: false, status: 400, body: { new_agent_id: ["اختر مندوباً آخر."] } };
  const target = agentById(store, newId);
  if (!target) return { ok: false, status: 404, body: { detail: "المندوب غير موجود." } };
  if (!target.is_active) return { ok: false, status: 400, body: { new_agent_id: ["هذا المندوب غير نشط."] } };
  sh.ended_at = t;
  sh.handed_over_to = newId;
  const balance = balanceOf(store, agentId);
  const prevTarget = openShift(store, newId);
  if (prevTarget) prevTarget.ended_at = t;
  const ns: Shift = { id: nid(s, "shift", 300), agent_id: newId, vehicle_ref: str(b.vehicle_ref) || sh.vehicle_ref, started_at: t, ended_at: null, handed_over_to: null };
  s.shifts.push(ns);
  if (balance !== 0) {
    s.custody.push({ id: nid(s, "custody", 500), agent_id: agentId, entry_type: "handed_over", amount: -balance, currency: "SAR", related_shipment: null, related_shift: sh.id, reverses: null, note: `تسليم إلى «${agentName(store, newId)}»`, created_at: t });
    s.custody.push({ id: nid(s, "custody", 500), agent_id: newId, entry_type: "handed_over", amount: balance, currency: "SAR", related_shipment: null, related_shift: ns.id, reverses: null, note: `استلام من «${agentName(store, agentId)}»`, created_at: t });
  }
  // The open shipments follow the custody (M38 US-38.1).
  for (const e of s.ext.values()) if (e.agent_id === agentId && OPEN.includes(m15Of(store, e.id)!.status)) e.agent_id = newId;
  return { ok: true, data: { new_shift_id: ns.id, handed_over_to: { id: newId, name: agentName(store, newId) }, balance: displayMoney(balance, "SAR") } };
}

export function scanPickup(store: string | null, agentId: number, fulfillmentId: number, b: Body): MockResult<{ ok: true; fulfillment_id: number }> {
  const e = findByFulfillment(store, fulfillmentId);
  if (!e || e.agent_id !== agentId) return { ok: false, status: 404, body: { detail: "التجهيز غير موجود." } };
  const code = str(b.scanned_code);
  if (!code) return { ok: false, status: 400, body: { scanned_code: ["هذا الحقل مطلوب."] } };
  const m15 = m15Of(store, e.id)!;
  if (m15.status === "compensated_lost") return { ok: false, status: 400, body: { detail: REJECTION_TEXT.compensated_lost_scan, rejection_reason: "compensated_lost_scan" } };
  if (code !== m15.waybill && code !== String(fulfillmentId)) return { ok: false, status: 400, body: { detail: "الباركود الممسوح لا يطابق هذه الشحنة.", scan_mismatch: true } };
  return { ok: true, data: { ok: true, fulfillment_id: fulfillmentId } };
}

export function partialDelivery(store: string | null, agentId: number, fulfillmentId: number, b: Body): MockResult<PartialResponse> {
  const s = shipState(store);
  const e = findByFulfillment(store, fulfillmentId);
  if (!e || e.agent_id !== agentId) return { ok: false, status: 404, body: { detail: "التجهيز غير موجود." } };
  const uuid = str(b.client_generated_uuid);
  if (!uuid) return { ok: false, status: 400, body: { client_generated_uuid: ["هذا الحقل مطلوب."] } };
  const seen = s.partialKeys.get(uuid);
  if (seen) return { ok: true, data: { ...seen, duplicate: true } };
  const lines = Array.isArray(b.line_items) ? (b.line_items as Body[]) : [];
  if (!lines.length) return { ok: false, status: 400, body: { line_items: ["أرسل بنود الشحنة."] } };
  const errors: string[] = [];
  const decided = e.items.map((item) => {
    const line = lines.find((l) => Number(l.fulfillment_item_id) === item.fulfillment_item_id);
    if (!line) {
      errors.push(`البند «${item.product_name}» غير مرسل.`);
      return null;
    }
    const q = Number(line.delivered_quantity);
    if (!Number.isInteger(q) || q < 0 || q > item.quantity) errors.push(`كمية «${item.product_name}» بين 0 و ${item.quantity}.`);
    if (q < item.quantity && !str(line.rejection_reason)) errors.push(`اذكر سبب الرفض لـ «${item.product_name}».`);
    return { item, q, reason: str(line.rejection_reason) };
  });
  if (errors.length) return { ok: false, status: 400, body: { line_items: errors } };
  const m15 = m15Of(store, e.id)!;
  if (m15.status !== "in_transit") return { ok: false, status: 409, body: { detail: "رُفض التسليم.", rejection_reason: m15.status === "compensated_lost" ? "compensated_lost_scan" : "invalid_transition" } };
  const shift = openShift(store, agentId);
  const anyDelivered = decided.some((d) => d!.q > 0);
  const subtotal = e.items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0) || 1;
  const deliveredValue = decided.reduce((sum, d) => sum + d!.item.unit_price * d!.q, 0);
  const collected = e.cod_amount ? Math.round(e.cod_amount * (deliveredValue / subtotal) * 100) / 100 : 0;
  if (collected > 0 && !shift) return { ok: false, status: 400, body: { detail: "ابدأ مناوبتك أولاً لتسجيل التحصيل في العهدة." } };
  for (const d of decided) {
    d!.item.delivered_quantity = d!.q;
    d!.item.rejection_reason = d!.reason;
  }
  const result = transition(store, e.id, { to_status: anyDelivered ? "delivered" : "returned", client_generated_uuid: `partial-${uuid}`.slice(0, 64), event_time: b.event_time, geo_lat: b.geo_lat, geo_lng: b.geo_lng, geo_accuracy_m: b.geo_accuracy_m }, "agent_app", { type: "agent", id: agentId, name: agentName(store, agentId) });
  if (collected > 0) s.custody.push({ id: nid(s, "custody", 500), agent_id: agentId, entry_type: "collected_cod", amount: collected, currency: "SAR", related_shipment: e.id, related_shift: shift?.id ?? null, reverses: null, note: "", created_at: now() });
  const res: PartialResponse = {
    collected_amount: collected.toFixed(2),
    display_collected_amount: displayMoney(collected, "SAR"),
    currency: "SAR",
    delivered: decided.filter((d) => d!.q > 0).length,
    rejected: decided.filter((d) => d!.q < d!.item.quantity).length,
    duplicate: false,
    status: result.ok ? result.data.status : m15.status,
  };
  s.partialKeys.set(uuid, res);
  return { ok: true, data: res };
}
