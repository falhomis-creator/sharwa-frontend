import type { MockResult } from "@/lib/bff/mock-route";
import { isDecimal } from "@/lib/decimal";
import { displayMoney, isoDaysAgo, type Currency } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { getLocation, listLocationRefs } from "@/mocks/locations/state";
import { DELIVERY_METHODS, PICKUP_LOCATIONS, ordersState } from "@/mocks/orders/state";
import { patchShipping, readSettings } from "@/mocks/settings/state";
import { staffState } from "@/mocks/staff/state";
import { FIXTURE_NOW, nextId, storeState } from "@/mocks/store-state";
import { platformState } from "@/mocks/platform/state";

/**
 * M15 — الشحن والمناطق والمندوبون (T108). Every row is `[NEEDS BACKEND]` (M15 §7): one
 * per-store bag on `globalThis` like the other dashboard fixtures. Delivery methods and
 * pickup locations are seeded from the M06 constants (`DELIVERY_METHODS`,
 * `PICKUP_LOCATIONS` — same ids and names) so the orders screens stay coherent. From then
 * on THIS state is the one source: the storefront checkout (M12), the tracking page (M41)
 * and the M06 order detail read methods and pickups through `checkoutDeliveryMethods`,
 * `checkoutPickups` and `findPickup` below (decision 2026-10-19, Phase 5 open item 6).
 * The fee fields are NOT duplicated: they live in the M34 settings mock.
 * Money is formatted here (`display_*`, explicit currency) — the UI never formats it.
 */
type Body = Record<string, unknown>;

export const CARRIER_CODES = ["aramex", "smsa"] as const;
export type CarrierCode = (typeof CARRIER_CODES)[number];
export const SHIPMENT_STATUSES = ["label_pending", "pending_pickup", "picked_up", "in_transit", "delivered", "returned", "cancelled", "compensated_lost"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export type EventSource = "webhook" | "agent_app" | "merchant_manual" | "system";

export interface MockDeliveryMethod {
  id: number;
  name: string;
  price: string;
  estimated_time: string;
  is_active: boolean;
  is_sharwa_official: boolean;
}
export interface MockPickup {
  id: number;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  sort_order: number;
}
export interface MockProvider {
  id: number;
  name: string;
  phone_number: string;
  is_active: boolean;
  max_weight_per_awb: string;
  max_items_per_awb: number;
  accepts_hazardous: boolean;
  volumetric_divisor: number;
  carrier_code: "" | CarrierCode;
  staff_account: number | null;
}
export interface MockCarrier {
  code: CarrierCode;
  credentials: Record<string, string>;
  last_error: string | null;
  last_event_at: string | null;
  last_event_waybill: string | null;
}
export interface MockPackaging {
  id: number;
  name: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;
  empty_weight_g: number;
  is_default: boolean;
}
export interface MockRestrictedZone {
  id: number;
  name: string;
  reason: string;
  is_active: boolean;
  polygon_points: Array<[number, number]>;
}
export interface MockSlaRule {
  id: number;
  zone_code: string | null;
  delivery_method_id: number | null;
  sla_hours: number;
}
export interface MockReviewItem {
  order_id: number;
  customer_name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  reason: "outside_zone" | "restricted_polygon";
  restricted_zone_id: number | null;
  created_at: string;
}
export interface MockShipmentEvent {
  id: number;
  label: string;
  source: EventSource;
  occurred_at: string;
  out_of_order: boolean;
  flagged_for_review: boolean;
  is_rejected: boolean;
  note: string;
}
export interface MockShipment {
  id: number;
  waybill: string;
  order_id: number;
  customer_name: string;
  status: ShipmentStatus;
  address: string;
  carrier: string;
  version: number;
  zone_code: string | null;
  created_at: string;
  sla_deadline: string;
  pickup_location_id: number | null;
  events: MockShipmentEvent[];
}

export interface ShippingState {
  methods: MockDeliveryMethod[];
  pickups: MockPickup[];
  providers: MockProvider[];
  carriers: Record<CarrierCode, MockCarrier>;
  packaging: MockPackaging[];
  restricted: MockRestrictedZone[];
  sla: MockSlaRule[];
  review: MockReviewItem[];
  shipments: MockShipment[];
}

// ── Carrier adapters' credential_fields (FR-15.02: the form is built from these) ─────
export const CARRIER_META: Record<CarrierCode, { name: string; fields: Array<{ name: string; label: string; is_secret: boolean; required: boolean }> }> = {
  aramex: {
    name: "أرامكس",
    fields: [
      { name: "account_number", label: "رقم الحساب", is_secret: false, required: true },
      { name: "username", label: "اسم المستخدم", is_secret: false, required: true },
      { name: "password", label: "كلمة المرور", is_secret: true, required: true },
      { name: "account_pin", label: "الرقم السري للحساب (PIN)", is_secret: true, required: true },
      { name: "account_entity", label: "الكيان (Entity)", is_secret: false, required: false },
    ],
  },
  smsa: {
    name: "سمسا",
    fields: [
      { name: "customer_id", label: "رقم العميل", is_secret: false, required: true },
      { name: "passkey", label: "مفتاح المرور (Passkey)", is_secret: true, required: true },
    ],
  },
};

// ── Sharwa Ship zones (platform, read-only — M20 manages them) ───────────────────────
export interface SharwaZone {
  code: string;
  name: string;
  price: string;
  currency: Currency;
  volumetric_divisor: number;
  center_latitude: string;
  center_longitude: string;
  radius_km: string;
  is_active: boolean;
  sort_order: number;
}
/** The zones M20 manages in the console (`platformState().zones`) — one source, read-only here. */
export function listZones(store: string | null) {
  const rows: SharwaZone[] = isEmptyStore(store)
    ? []
    : [...platformState().zones]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((z) => ({ code: z.code, name: z.name, price: z.price, currency: z.currency, volumetric_divisor: z.volumetric_divisor, center_latitude: z.center_latitude, center_longitude: z.center_longitude, radius_km: z.radius_km, is_active: z.is_active, sort_order: z.sort_order }));
  return rows.map((z) => ({ ...z, display_price: displayMoney(Number(z.price), z.currency) }));
}

const at = (hoursAgo: number) => new Date(FIXTURE_NOW - hoursAgo * 3_600_000).toISOString();
const ahead = (hours: number) => new Date(FIXTURE_NOW + hours * 3_600_000).toISOString();

function seed(store: string | null): ShippingState {
  const empty: ShippingState = {
    methods: [],
    pickups: [],
    providers: [],
    carriers: { aramex: { code: "aramex", credentials: {}, last_error: null, last_event_at: null, last_event_waybill: null }, smsa: { code: "smsa", credentials: {}, last_error: null, last_event_at: null, last_event_waybill: null } },
    packaging: [],
    restricted: [],
    sla: [],
    review: [],
    shipments: [],
  };
  if (isEmptyStore(store)) return empty;
  const methodPrices: Record<number, string> = { 1: "2500.00", 2: "1500.00" };
  const state: ShippingState = {
    ...empty,
    methods: [
      ...DELIVERY_METHODS.map((m) => ({ id: m.id, name: m.name, price: methodPrices[m.id] ?? "2000.00", estimated_time: m.estimated_time, is_active: true, is_sharwa_official: m.id === 1 })),
      { id: 3, name: "شحن بين المدن", price: "4000.00", estimated_time: "3-5 أيام", is_active: false, is_sharwa_official: false },
    ],
    pickups: [
      ...PICKUP_LOCATIONS.map((p, i) => ({ id: p.id, name: p.name, address: p.address, phone: i === 0 ? "966551200300" : "966552400800", is_active: true, sort_order: i + 1 })),
      { id: 3, name: "نقطة استلام عدن — كريتر", address: "شارع الملكة أروى، كريتر", phone: "967770000033", is_active: false, sort_order: 3 },
    ],
    providers: [
      { id: 1, name: "سارة الحربي — مندوبة الرياض", phone_number: "967770000001", is_active: true, max_weight_per_awb: "25.000", max_items_per_awb: 10, accepts_hazardous: false, volumetric_divisor: 5000, carrier_code: "", staff_account: 2 },
      { id: 2, name: "خالد المطيري", phone_number: "967771020304", is_active: true, max_weight_per_awb: "40.000", max_items_per_awb: 20, accepts_hazardous: true, volumetric_divisor: 5000, carrier_code: "", staff_account: 3 },
      { id: 3, name: "عمر باوزير", phone_number: "967733445566", is_active: false, max_weight_per_awb: "20.000", max_items_per_awb: 8, accepts_hazardous: false, volumetric_divisor: 5000, carrier_code: "", staff_account: 5 },
      { id: 4, name: "أرامكس — حساب المتجر", phone_number: "966920000000", is_active: true, max_weight_per_awb: "70.000", max_items_per_awb: 50, accepts_hazardous: true, volumetric_divisor: 5000, carrier_code: "aramex", staff_account: null },
      { id: 5, name: "سمسا إكسبرس", phone_number: "966920009999", is_active: true, max_weight_per_awb: "30.000", max_items_per_awb: 30, accepts_hazardous: false, volumetric_divisor: 6000, carrier_code: "smsa", staff_account: null },
    ],
    carriers: {
      aramex: { code: "aramex", credentials: { account_number: "45796", username: "noor.api", password: "s3cr3t-aramex", account_pin: "543543", account_entity: "RUH" }, last_error: null, last_event_at: isoDaysAgo(9, 14), last_event_waybill: "44012873365" },
      smsa: { code: "smsa", credentials: {}, last_error: null, last_event_at: null, last_event_waybill: null },
    },
    packaging: [
      { id: 1, name: "علبة صغيرة — عطور", length_cm: "20.0", width_cm: "15.0", height_cm: "10.0", empty_weight_g: 180, is_default: true },
      { id: 2, name: "كرتون متوسط", length_cm: "40.0", width_cm: "30.0", height_cm: "20.0", empty_weight_g: 450, is_default: false },
      { id: 3, name: "مغلف مبطّن", length_cm: "32.0", width_cm: "24.0", height_cm: "3.0", empty_weight_g: 60, is_default: false },
    ],
    restricted: [
      { id: 1, name: "منطقة عسكرية — شمال صنعاء", reason: "لا يُسمح بالتوصيل", is_active: true, polygon_points: [[15.47, 44.15], [15.5, 44.24], [15.44, 44.27], [15.42, 44.18]] },
      { id: 2, name: "الميناء — عدن", reason: "دخول بتصريح فقط", is_active: true, polygon_points: [[12.8, 44.94], [12.82, 44.99], [12.79, 45.0]] },
    ],
    sla: [
      { id: 1, zone_code: "SAN-01", delivery_method_id: 1, sla_hours: 24 },
      { id: 2, zone_code: "ADN-01", delivery_method_id: 1, sla_hours: 48 },
      { id: 3, zone_code: null, delivery_method_id: 2, sla_hours: 12 },
    ],
  };
  // Zone review & shipments reference real M06 orders (read only).
  const orders = ordersState(store).orders;
  const open = orders.filter((o) => o.status !== "cancelled");
  const cancelled = orders.find((o) => o.status === "cancelled");
  const reviewSeed: Array<Omit<MockReviewItem, "order_id" | "customer_name" | "created_at">> = [
    { address: "قرية بيت بوس، طريق حدة", city: "صنعاء", latitude: 15.27, longitude: 44.4, reason: "outside_zone", restricted_zone_id: null },
    { address: "حي الجراف الشمالي", city: "صنعاء", latitude: 15.46, longitude: 44.2, reason: "restricted_polygon", restricted_zone_id: 1 },
    { address: "شارع المعلا الرئيسي قرب الميناء", city: "عدن", latitude: 12.805, longitude: 44.975, reason: "restricted_polygon", restricted_zone_id: 2 },
    { address: "مدينة إب — شارع العدين", city: "إب", latitude: 13.97, longitude: 44.18, reason: "outside_zone", restricted_zone_id: null },
  ];
  state.review = reviewSeed.map((r, i) => {
    const o = open[i] ?? open[0]!;
    return { ...r, order_id: o.id, customer_name: o.customer_name, created_at: at(6 + i * 9) };
  });
  if (cancelled) state.review.push({ address: "الحوطة — لحج", city: "لحج", latitude: 13.05, longitude: 44.88, reason: "outside_zone", restricted_zone_id: null, order_id: cancelled.id, customer_name: cancelled.customer_name, created_at: at(40) });

  const ev = (id: number, label: string, source: EventSource, hoursAgo: number, flags: Partial<Pick<MockShipmentEvent, "out_of_order" | "flagged_for_review" | "is_rejected">> = {}, note = ""): MockShipmentEvent => ({
    id,
    label,
    source,
    occurred_at: at(hoursAgo),
    out_of_order: false,
    flagged_for_review: false,
    is_rejected: false,
    ...flags,
    note,
  });
  const shipRows: Array<Omit<MockShipment, "order_id" | "customer_name" | "version">> = [
    { id: 701, waybill: "SHW-26100701", status: "in_transit", address: "صنعاء، شارع الزبيري، عمارة 12", carrier: "شروة شيب", zone_code: "SAN-01", created_at: at(40), sla_deadline: at(16), pickup_location_id: null, events: [ev(1, "قيد التوصيل", "agent_app", 20), ev(2, "تم الاستلام", "agent_app", 18, { out_of_order: true }, "وصل حدث الاستلام بعد «قيد التوصيل».")] },
    { id: 702, waybill: "44012873365", status: "in_transit", address: "الرياض، حي النرجس، شارع 14", carrier: "أرامكس", zone_code: null, created_at: at(30), sla_deadline: ahead(10), pickup_location_id: null, events: [ev(3, "خرج للتوصيل", "webhook", 4, { flagged_for_review: true }, "موقع الحدث يبعد 140 كم عن العنوان.")] },
    { id: 703, waybill: "SHW-26100703", status: "pending_pickup", address: "عدن، المنصورة، بلوك 5", carrier: "شروة شيب", zone_code: "ADN-01", created_at: at(60), sla_deadline: at(12), pickup_location_id: null, events: [ev(4, "تم التسليم", "webhook", 8, { is_rejected: true }, "توقيع X-Carrier-Signature غير صحيح.")] },
    { id: 704, waybill: "SHW-26100704", status: "label_pending", address: "تعز، شارع جمال", carrier: "شروة شيب", zone_code: "TAZ-01", created_at: at(70), sla_deadline: at(22), pickup_location_id: null, events: [] },
    { id: 705, waybill: "SHW-26100705", status: "picked_up", address: "صنعاء، حدة، جوار مول السعيدة", carrier: "شروة شيب", zone_code: "SAN-01", created_at: at(50), sla_deadline: at(26), pickup_location_id: null, events: [ev(5, "تم الاستلام", "agent_app", 30, { flagged_for_review: true }, "المندوب سجّل الاستلام خارج مناوبته.")] },
    { id: 706, waybill: "SHW-26100706", status: "delivered", address: "الحديدة، شارع صنعاء", carrier: "شروة شيب", zone_code: "HOD-01", created_at: at(90), sla_deadline: at(60), pickup_location_id: null, events: [ev(6, "تم التسليم", "webhook", 50), ev(7, "قيد التوصيل", "webhook", 49, { out_of_order: true }, "حدث أقدم وصل بعد التسليم — لم يُطبَّق.")] },
  ];
  state.shipments = shipRows.map((s, i) => {
    const o = open[10 + i] ?? open[i]!;
    return { ...s, order_id: o.id, customer_name: o.customer_name, version: 1 };
  });
  return state;
}

export function shippingState(store: string | null): ShippingState {
  return storeState(store, "shipping", () => seed(store));
}

// ── read model for the storefront and the orders screens ────────────────────────────
/** Active methods in the order M15 lists them; `price` is a YER_NEW decimal string. */
export function checkoutDeliveryMethods(store: string | null): MockDeliveryMethod[] {
  return shippingState(store).methods.filter((m) => m.is_active);
}

/** Active pickup points, in the merchant's `sort_order`. */
export function checkoutPickups(store: string | null): MockPickup[] {
  return shippingState(store)
    .pickups.filter((p) => p.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** Any pickup by id, active or not — an order placed before it was disabled still names it. */
export function findPickup(store: string | null, id: number | null | undefined): MockPickup | undefined {
  if (id === null || id === undefined) return undefined;
  return shippingState(store).pickups.find((p) => p.id === id);
}

// ── helpers ──────────────────────────────────────────────────────────────────────────
const str = (v: unknown) => (typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v).trim());
const bool = (v: unknown) => v === true || v === "true";
const has = (b: Body, k: string) => Object.prototype.hasOwnProperty.call(b, k);
type Errors = Record<string, string[]>;
function fail(e: Errors): MockResult<never> | null {
  return Object.keys(e).length ? { ok: false, status: 400, body: e } : null;
}
const notFound = (what: string): MockResult<never> => ({ ok: false, status: 404, body: { detail: `${what} غير موجود.` } });

export function paginate<T>(rows: T[], params: URLSearchParams): { count: number; results: T[] } {
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const size = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 50) || 50));
  return { count: rows.length, results: rows.slice((page - 1) * size, page * size) };
}

// ── settings (maps onto M34 — no duplicate state) ────────────────────────────────────
export function shippingSettings(store: string | null, host: string) {
  const s = readSettings(store, host);
  return {
    default_delivery_fee: s.default_delivery_fee,
    free_shipping_threshold: s.free_shipping_threshold,
    display_default_delivery_fee: s.display_default_delivery_fee,
    display_free_shipping_threshold: s.display_free_shipping_threshold,
    currency: "YER_NEW" as const,
    store_display_currency: s.currency,
  };
}

export function patchShippingSettings(store: string | null, host: string, body: Body): MockResult<ReturnType<typeof shippingSettings>> {
  const r = patchShipping(store, host, body);
  if (!r.ok) return r;
  return { ok: true, data: shippingSettings(store, host) };
}

// ── delivery methods ─────────────────────────────────────────────────────────────────
function methodView(m: MockDeliveryMethod) {
  return { ...m, currency: "YER_NEW" as const, display_price: displayMoney(Number(m.price), "YER_NEW") };
}

export function listMethods(store: string | null, params: URLSearchParams) {
  let rows = shippingState(store).methods;
  const active = params.get("is_active");
  if (active) rows = rows.filter((m) => String(m.is_active) === active);
  return paginate(rows.map(methodView), params);
}

function validateMethod(b: Body, partial: boolean): Errors {
  const e: Errors = {};
  if ((!partial || has(b, "name")) && !str(b.name)) e.name = ["أدخل اسم الطريقة."];
  if ((!partial || has(b, "name")) && str(b.name).length > 100) e.name = ["100 حرف على الأكثر."];
  if (!partial || has(b, "price")) {
    const p = str(b.price);
    if (!isDecimal(p) || Number(p) < 0) e.price = ["أدخل سعراً صحيحاً (مثال: 1500.00)."];
  }
  if ((!partial || has(b, "estimated_time")) && str(b.estimated_time).length > 50) e.estimated_time = ["50 حرفاً على الأكثر."];
  return e;
}

export function createMethod(store: string | null, b: Body): MockResult<ReturnType<typeof methodView>> {
  const err = fail(validateMethod(b, false));
  if (err) return err;
  const m: MockDeliveryMethod = { id: nextId(store, "delivery-method", 10), name: str(b.name), price: Number(str(b.price)).toFixed(2), estimated_time: str(b.estimated_time), is_active: has(b, "is_active") ? bool(b.is_active) : true, is_sharwa_official: false };
  shippingState(store).methods.push(m);
  return { ok: true, status: 201, data: methodView(m) };
}

export function patchMethod(store: string | null, id: number, b: Body): MockResult<ReturnType<typeof methodView>> {
  const m = shippingState(store).methods.find((x) => x.id === id);
  if (!m) return notFound("طريقة التوصيل");
  if (m.is_sharwa_official) return { ok: false, status: 403, body: { detail: "طرق شروة شيب الرسمية للقراءة فقط — تُدار من المنصة." } };
  const err = fail(validateMethod(b, true));
  if (err) return err;
  if (has(b, "name")) m.name = str(b.name);
  if (has(b, "price")) m.price = Number(str(b.price)).toFixed(2);
  if (has(b, "estimated_time")) m.estimated_time = str(b.estimated_time);
  if (has(b, "is_active")) m.is_active = bool(b.is_active);
  return { ok: true, data: methodView(m) };
}

export function deleteMethod(store: string | null, id: number): MockResult<null> {
  const s = shippingState(store);
  const m = s.methods.find((x) => x.id === id);
  if (!m) return notFound("طريقة التوصيل");
  if (m.is_sharwa_official) return { ok: false, status: 403, body: { detail: "طرق شروة شيب الرسمية لا تُحذف." } };
  s.methods = s.methods.filter((x) => x.id !== id);
  s.sla = s.sla.filter((r) => r.delivery_method_id !== id);
  return { ok: true, status: 204, data: null };
}

// ── pickup locations ─────────────────────────────────────────────────────────────────
/** M22 locations flagged `is_pickup_point` — shown as a hint, never merged (US-15.2.2). */
function pickupPointLocations(store: string | null) {
  return listLocationRefs(store)
    .map((r) => getLocation(store, r.id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l?.flags.is_pickup_point))
    .map((l) => ({ id: l.id, code: l.code, name: l.name }));
}

export function listPickups(store: string | null, params: URLSearchParams) {
  let rows = [...shippingState(store).pickups].sort((a, b) => a.sort_order - b.sort_order);
  const active = params.get("is_active");
  if (active) rows = rows.filter((p) => String(p.is_active) === active);
  return { ...paginate(rows, params), pickup_point_locations: pickupPointLocations(store) };
}

const PHONE_RE = /^(967|966)\d{8,9}$/;
function validatePickup(b: Body, partial: boolean): Errors {
  const e: Errors = {};
  if ((!partial || has(b, "name")) && !str(b.name)) e.name = ["أدخل اسم نقطة الاستلام."];
  if ((!partial || has(b, "address")) && !str(b.address)) e.address = ["أدخل العنوان."];
  if ((!partial || has(b, "phone")) && str(b.phone) && !PHONE_RE.test(str(b.phone))) e.phone = ["رقم يمني أو سعودي بالصيغة الدولية (967… أو 966…)."];
  return e;
}

export function createPickup(store: string | null, b: Body): MockResult<MockPickup> {
  const err = fail(validatePickup(b, false));
  if (err) return err;
  const s = shippingState(store);
  const p: MockPickup = { id: nextId(store, "pickup", 10), name: str(b.name), address: str(b.address), phone: str(b.phone), is_active: has(b, "is_active") ? bool(b.is_active) : true, sort_order: s.pickups.length + 1 };
  s.pickups.push(p);
  return { ok: true, status: 201, data: p };
}

export function patchPickup(store: string | null, id: number, b: Body): MockResult<MockPickup> {
  const p = shippingState(store).pickups.find((x) => x.id === id);
  if (!p) return notFound("نقطة الاستلام");
  const err = fail(validatePickup(b, true));
  if (err) return err;
  if (has(b, "name")) p.name = str(b.name);
  if (has(b, "address")) p.address = str(b.address);
  if (has(b, "phone")) p.phone = str(b.phone);
  if (has(b, "is_active")) p.is_active = bool(b.is_active);
  return { ok: true, data: p };
}

export function deletePickup(store: string | null, id: number): MockResult<null> {
  const s = shippingState(store);
  if (!s.pickups.some((x) => x.id === id)) return notFound("نقطة الاستلام");
  s.pickups = s.pickups.filter((x) => x.id !== id).sort((a, b) => a.sort_order - b.sort_order);
  s.pickups.forEach((p, i) => (p.sort_order = i + 1));
  return { ok: true, status: 204, data: null };
}

export function reorderPickups(store: string | null, ordered: unknown): MockResult<{ ok: true; reordered: number; results: MockPickup[] }> {
  const s = shippingState(store);
  const ids = Array.isArray(ordered) ? ordered.map(Number) : [];
  const known = new Set(s.pickups.map((p) => p.id));
  if (ids.length !== known.size || ids.some((id) => !known.has(id))) return { ok: false, status: 400, body: { ordered_ids: ["أرسل كل نقاط الاستلام بالترتيب الجديد."] } };
  ids.forEach((id, i) => {
    const p = s.pickups.find((x) => x.id === id)!;
    p.sort_order = i + 1;
  });
  const results = [...s.pickups].sort((a, b) => a.sort_order - b.sort_order);
  return { ok: true, data: { ok: true, reordered: ids.length, results } };
}

// ── providers (agents = carrier_code empty, companies = set) ─────────────────────────
export function staffOptions(store: string | null) {
  return staffState(store)
    .staff.filter((s) => s.id >= 2 && s.id <= 5)
    .map((s) => ({ id: s.id, full_name: s.full_name, phone: s.phone, is_terminated: Boolean(s.terminated_at) }));
}

export function carrierConnection(store: string | null, code: CarrierCode): "not_connected" | "connected" | "error" {
  const c = shippingState(store).carriers[code];
  if (c.last_error) return "error";
  const required = CARRIER_META[code].fields.filter((f) => f.required);
  return required.every((f) => c.credentials[f.name]) ? "connected" : "not_connected";
}

function providerView(store: string | null, p: MockProvider) {
  const staff = p.staff_account === null ? null : staffOptions(store).find((s) => s.id === p.staff_account) ?? null;
  return {
    ...p,
    kind: p.carrier_code ? ("company" as const) : ("agent" as const),
    staff_account_name: staff?.full_name ?? null,
    staff_account_terminated: staff?.is_terminated ?? false,
    carrier_connection: p.carrier_code ? carrierConnection(store, p.carrier_code) : null,
  };
}

export function listProviders(store: string | null, params: URLSearchParams) {
  const all = shippingState(store).providers;
  const kind = params.get("kind");
  const rows = kind === "companies" ? all.filter((p) => p.carrier_code) : kind === "agents" ? all.filter((p) => !p.carrier_code) : all;
  return { ...paginate(rows.map((p) => providerView(store, p)), params), counts: { agents: all.filter((p) => !p.carrier_code).length, companies: all.filter((p) => p.carrier_code).length } };
}

function validateProvider(store: string | null, b: Body, partial: boolean): Errors {
  const e: Errors = {};
  if ((!partial || has(b, "name")) && !str(b.name)) e.name = ["أدخل الاسم."];
  if ((!partial || has(b, "phone_number")) && !PHONE_RE.test(str(b.phone_number))) e.phone_number = ["رقم يمني أو سعودي بالصيغة الدولية (967… أو 966…)."];
  if (!partial || has(b, "max_weight_per_awb")) {
    const w = str(b.max_weight_per_awb);
    if (!isDecimal(w) || Number(w) <= 0) e.max_weight_per_awb = ["أدخل وزناً أكبر من صفر بالكيلوغرام."];
  }
  if ((!partial || has(b, "max_items_per_awb")) && !(Number.isInteger(Number(b.max_items_per_awb)) && Number(b.max_items_per_awb) >= 1)) e.max_items_per_awb = ["عدد صحيح ≥ 1."];
  if ((!partial || has(b, "volumetric_divisor")) && !(Number.isInteger(Number(b.volumetric_divisor)) && Number(b.volumetric_divisor) >= 1000 && Number(b.volumetric_divisor) <= 10000)) e.volumetric_divisor = ["بين 1000 و 10000 (عادة 5000)."];
  if (has(b, "carrier_code") && !["", ...CARRIER_CODES].includes(str(b.carrier_code))) e.carrier_code = ["اختر من القائمة."];
  if (has(b, "staff_account") && b.staff_account !== null && b.staff_account !== "") {
    const s = staffOptions(store).find((x) => x.id === Number(b.staff_account));
    if (!s) e.staff_account = ["الموظف غير موجود."];
    else if (s.is_terminated) e.staff_account = ["حساب هذا الموظف مُنهى — اختر موظفاً نشطاً."];
    if (str(b.carrier_code)) e.staff_account = ["الربط بموظف للمندوب الداخلي فقط (بلا شركة شحن)."];
  }
  return e;
}

function applyProvider(p: MockProvider, b: Body) {
  if (has(b, "name")) p.name = str(b.name);
  if (has(b, "phone_number")) p.phone_number = str(b.phone_number);
  if (has(b, "is_active")) p.is_active = bool(b.is_active);
  if (has(b, "max_weight_per_awb")) p.max_weight_per_awb = Number(str(b.max_weight_per_awb)).toFixed(3);
  if (has(b, "max_items_per_awb")) p.max_items_per_awb = Number(b.max_items_per_awb);
  if (has(b, "accepts_hazardous")) p.accepts_hazardous = bool(b.accepts_hazardous);
  if (has(b, "volumetric_divisor")) p.volumetric_divisor = Number(b.volumetric_divisor);
  if (has(b, "carrier_code")) p.carrier_code = str(b.carrier_code) as MockProvider["carrier_code"];
  if (has(b, "staff_account")) p.staff_account = b.staff_account === null || b.staff_account === "" ? null : Number(b.staff_account);
  if (p.carrier_code) p.staff_account = null;
}

export function createProvider(store: string | null, b: Body): MockResult<ReturnType<typeof providerView>> {
  const err = fail(validateProvider(store, b, false));
  if (err) return err;
  const p: MockProvider = { id: nextId(store, "provider", 10), name: "", phone_number: "", is_active: true, max_weight_per_awb: "0", max_items_per_awb: 1, accepts_hazardous: false, volumetric_divisor: 5000, carrier_code: "", staff_account: null };
  applyProvider(p, b);
  shippingState(store).providers.push(p);
  return { ok: true, status: 201, data: providerView(store, p) };
}

export function patchProvider(store: string | null, id: number, b: Body): MockResult<ReturnType<typeof providerView>> {
  const p = shippingState(store).providers.find((x) => x.id === id);
  if (!p) return notFound("الجهة");
  const err = fail(validateProvider(store, { carrier_code: p.carrier_code, ...b }, true));
  if (err) return err;
  applyProvider(p, b);
  return { ok: true, data: providerView(store, p) };
}

export function deleteProvider(store: string | null, id: number): MockResult<null> {
  const s = shippingState(store);
  if (!s.providers.some((x) => x.id === id)) return notFound("الجهة");
  s.providers = s.providers.filter((x) => x.id !== id);
  return { ok: true, status: 204, data: null };
}

// ── carriers ─────────────────────────────────────────────────────────────────────────
/** Never returns a secret value — only `has_value` (SC-15.4). */
export function carrierView(store: string | null, host: string, code: CarrierCode) {
  const c = shippingState(store).carriers[code];
  const meta = CARRIER_META[code];
  return {
    carrier_code: code,
    name: meta.name,
    connection: carrierConnection(store, code),
    is_connected: carrierConnection(store, code) === "connected",
    last_error: c.last_error,
    fields: meta.fields.map((f) => ({ ...f, value: f.is_secret ? null : (c.credentials[f.name] ?? ""), has_value: Boolean(c.credentials[f.name]) })),
    webhook_url: `https://${host || "store.sharwa.app"}/api/v1/webhooks/carrier/${code}/`,
    signature_header: "X-Carrier-Signature",
    last_event_at: c.last_event_at,
    last_event_waybill: c.last_event_waybill,
    no_events_warning: carrierConnection(store, code) !== "not_connected" && (!c.last_event_at || FIXTURE_NOW - Date.parse(c.last_event_at) > 7 * 86_400_000),
  };
}

export function listCarriers(store: string | null, host: string) {
  return CARRIER_CODES.map((c) => carrierView(store, host, c));
}

export function putCredentials(store: string | null, host: string, code: CarrierCode, b: Body): MockResult<ReturnType<typeof carrierView>> {
  const c = shippingState(store).carriers[code];
  const e: Errors = {};
  const next: Record<string, string> = { ...c.credentials };
  for (const f of CARRIER_META[code].fields) {
    const v = str(b[f.name]);
    if (f.is_secret && !v) {
      if (f.required && !c.credentials[f.name]) e[f.name] = ["هذا الحقل مطلوب."];
      continue; // write-only: an empty secret keeps the stored one
    }
    if (f.required && !v) e[f.name] = ["هذا الحقل مطلوب."];
    next[f.name] = v;
  }
  const err = fail(e);
  if (err) return err;
  c.credentials = next;
  c.last_error = null;
  return { ok: true, data: carrierView(store, host, code) };
}

export function testCarrier(store: string | null, code: CarrierCode): MockResult<{ ok: boolean; message: string }> {
  const c = shippingState(store).carriers[code];
  if (carrierConnection(store, code) === "not_connected" && !c.last_error) return { ok: false, status: 400, body: { detail: "أدخل بيانات الاعتماد واحفظها قبل اختبار الاتصال." } };
  const name = CARRIER_META[code].name;
  const id = code === "aramex" ? c.credentials.account_number : c.credentials.customer_id;
  if (!id || !/^\d{4,}$/.test(id)) {
    c.last_error = `رفضت ${name} بيانات الاعتماد: ${code === "aramex" ? "رقم الحساب" : "رقم العميل"} غير معروف.`;
    return { ok: true, data: { ok: false, message: c.last_error } };
  }
  c.last_error = null;
  return { ok: true, data: { ok: true, message: `نجح الاتصال — ${name} تعرّفت على الحساب ${id}.` } };
}

// ── packaging profiles ───────────────────────────────────────────────────────────────
export function listPackaging(store: string | null, params: URLSearchParams) {
  return paginate(shippingState(store).packaging, params);
}

function validatePackaging(b: Body, partial: boolean): Errors {
  const e: Errors = {};
  if ((!partial || has(b, "name")) && !str(b.name)) e.name = ["أدخل اسم الملف."];
  for (const k of ["length_cm", "width_cm", "height_cm"]) {
    if (!partial || has(b, k)) {
      const v = str(b[k]);
      if (!isDecimal(v) || Number(v) <= 0) e[k] = ["بُعد أكبر من صفر بالسنتيمتر."];
    }
  }
  if ((!partial || has(b, "empty_weight_g")) && !(Number.isInteger(Number(b.empty_weight_g)) && Number(b.empty_weight_g) >= 0)) e.empty_weight_g = ["وزن صحيح بالغرام."];
  return e;
}

function applyPackaging(s: ShippingState, p: MockPackaging, b: Body) {
  if (has(b, "name")) p.name = str(b.name);
  for (const k of ["length_cm", "width_cm", "height_cm"] as const) if (has(b, k)) p[k] = Number(str(b[k])).toFixed(1);
  if (has(b, "empty_weight_g")) p.empty_weight_g = Number(b.empty_weight_g);
  if (has(b, "is_default")) p.is_default = bool(b.is_default);
  if (p.is_default) s.packaging.forEach((x) => x !== p && (x.is_default = false));
}

export function createPackaging(store: string | null, b: Body): MockResult<MockPackaging> {
  const err = fail(validatePackaging(b, false));
  if (err) return err;
  const s = shippingState(store);
  const p: MockPackaging = { id: nextId(store, "packaging", 10), name: "", length_cm: "0", width_cm: "0", height_cm: "0", empty_weight_g: 0, is_default: s.packaging.length === 0 };
  s.packaging.push(p);
  applyPackaging(s, p, b);
  return { ok: true, status: 201, data: p };
}

export function patchPackaging(store: string | null, id: number, b: Body): MockResult<MockPackaging> {
  const s = shippingState(store);
  const p = s.packaging.find((x) => x.id === id);
  if (!p) return notFound("ملف التغليف");
  const err = fail(validatePackaging(b, true));
  if (err) return err;
  applyPackaging(s, p, b);
  return { ok: true, data: p };
}

export function deletePackaging(store: string | null, id: number): MockResult<null> {
  const s = shippingState(store);
  if (!s.packaging.some((x) => x.id === id)) return notFound("ملف التغليف");
  s.packaging = s.packaging.filter((x) => x.id !== id);
  return { ok: true, status: 204, data: null };
}
