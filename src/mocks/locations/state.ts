import type { MockResult } from "@/lib/bff/mock-route";
import { catalog } from "@/mocks/catalog/state";
import { isEmptyStore } from "@/mocks/empty-store";
import { inventoryState } from "@/mocks/inventory/state";
import { ordersState } from "@/mocks/orders/state";
import { readSettings, setMultiLocation } from "@/mocks/settings/state";
import { FIXTURE_NOW, nextId, storeState } from "@/mocks/store-state";

/**
 * Locations (M22, `[NEEDS BACKEND]`) — the per-store seed every other module reads:
 * M21 (location inventory), M18 (staff × location assignments), M24 (restock location),
 * M06 (`source_location`). The two ids of the M06 seed (1 = المستودع الرئيسي, 2 = فرع الرياض)
 * are kept, so order lines and location inventory agree.
 *
 * `display_type` is what the SERVER computes from the flags + ownership (M22 FR-22.02); the
 * fixture mirrors the backend's derivation once, here, and the UI never recomputes it.
 */
export const LOCATION_FLAGS = [
  "stores_inventory",
  "ships_to_customer",
  "is_transient",
  "is_mobile",
  "is_virtual",
  "serves_walk_in_customers",
  "has_pos_terminal",
  "is_pickup_point",
] as const;
export type LocationFlag = (typeof LOCATION_FLAGS)[number];
export const OWNERSHIPS = ["owned", "franchise", "third_party_3pl", "dropship_supplier"] as const;
export type Ownership = (typeof OWNERSHIPS)[number];
export const LOCATION_ROLES = ["manager", "cashier", "warehouse_operator", "driver", "pickup_agent"] as const;
export type LocationRole = (typeof LOCATION_ROLES)[number];

export interface MockOperatingHours {
  weekday: number; // 0 = Sunday … 6 = Saturday (discovery 02 §16 Gotcha 4)
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

export interface MockLocation {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  address_text: string;
  city: string;
  latitude: string | null;
  longitude: string | null;
  phone: string;
  parent_location: number | null;
  flags: Record<LocationFlag, boolean>;
  ownership: Ownership;
  operating_hours: MockOperatingHours[];
  locker: { provider: string; locker_code: string; capacity: number } | null;
  franchise: { franchisee_name: string; contract_ends_at: string | null } | null;
  dropship_supplier: { channel: "whatsapp" | "email" | "api_webhook"; contact: string } | null;
  vehicle: { plate_number: string; driver_phone: string } | null;
  external_refs: Array<{ system: string; ref: string }>;
  created_at: string;
  updated_at: string;
}

export interface MockLocationAssignment {
  id: number;
  location_id: number;
  staff_id: number;
  role: LocationRole;
}

export interface MockRoutingRule {
  id: number;
  priority: number;
  applies_to_category: number | null;
  applies_to_city: string | null;
  preferred_location: number;
}

export interface LocationsState {
  multi_location_enabled: boolean;
  locations: MockLocation[];
  assignments: MockLocationAssignment[];
  routing_rules: MockRoutingRule[];
}

const flags = (on: LocationFlag[]): Record<LocationFlag, boolean> =>
  Object.fromEntries(LOCATION_FLAGS.map((f) => [f, on.includes(f)])) as Record<LocationFlag, boolean>;

const hours = (open: string, close: string, closed: number[] = [5]): MockOperatingHours[] =>
  Array.from({ length: 7 }, (_, weekday) => ({ weekday, opens_at: closed.includes(weekday) ? null : open, closes_at: closed.includes(weekday) ? null : close, is_closed: closed.includes(weekday) }));

const at = (daysAgo: number) => new Date(FIXTURE_NOW - daysAgo * 86_400_000).toISOString();

function seed(store: string | null): LocationsState {
  if (isEmptyStore(store)) return { multi_location_enabled: false, locations: [], assignments: [], routing_rules: [] };
  const base = (id: number, code: string, name: string, city: string, extra: Partial<MockLocation>): MockLocation => ({
    id,
    code,
    name,
    is_active: true,
    address_text: "",
    city,
    latitude: null,
    longitude: null,
    phone: "967770000033",
    parent_location: null,
    flags: flags([]),
    ownership: "owned",
    operating_hours: [],
    locker: null,
    franchise: null,
    dropship_supplier: null,
    vehicle: null,
    external_refs: [],
    created_at: at(400),
    updated_at: at(12),
    ...extra,
  });
  return {
    multi_location_enabled: true,
    locations: [
      base(1, "WH-01", "المستودع الرئيسي", "الرياض", { address_text: "المنطقة الصناعية الثانية، الرياض", latitude: "24.6245", longitude: "46.7980", flags: flags(["stores_inventory", "ships_to_customer"]) }),
      base(2, "BR-RUH-01", "فرع الرياض", "الرياض", { address_text: "شارع التحلية، العليا", latitude: "24.6911", longitude: "46.6855", flags: flags(["stores_inventory", "serves_walk_in_customers", "has_pos_terminal", "is_pickup_point"]), operating_hours: hours("09:00", "23:00") }),
      base(3, "BR-JED-02", "فرع جدة", "جدة", { address_text: "حي الروضة، طريق الأمير سلطان", latitude: "21.5810", longitude: "39.1500", flags: flags(["stores_inventory", "ships_to_customer", "serves_walk_in_customers", "has_pos_terminal"]), operating_hours: hours("10:00", "23:30") }),
      base(4, "PUDO-RUH-03", "خزانة استلام — الملقا", "الرياض", { address_text: "مجمع الملقا التجاري، المدخل 2", flags: flags(["is_pickup_point"]), parent_location: 2, locker: { provider: "QuickBox", locker_code: "RUH-ML-17", capacity: 24 }, operating_hours: hours("08:00", "00:00", []) }),
      base(5, "VAN-01", "مركبة التوصيل 1", "الرياض", { flags: flags(["stores_inventory", "is_mobile", "is_transient", "ships_to_customer"]), vehicle: { plate_number: "ر س ب 4821", driver_phone: "967770000045" } }),
      base(6, "DS-ATTAR", "مورد العطور — دروبشيبينج", "صنعاء", { flags: flags(["is_virtual", "ships_to_customer"]), ownership: "dropship_supplier", dropship_supplier: { channel: "whatsapp", contact: "967771234500" } }),
      base(7, "3PL-DMM", "مستودع الدمام المشترك", "الدمام", { address_text: "ميناء الملك عبدالعزيز، بوابة 4", flags: flags(["stores_inventory", "ships_to_customer"]), ownership: "third_party_3pl", is_active: false, external_refs: [{ system: "wms", ref: "DMM-00412" }] }),
    ],
    assignments: [
      { id: 1, location_id: 2, staff_id: 2, role: "cashier" },
      { id: 2, location_id: 1, staff_id: 3, role: "warehouse_operator" },
      { id: 3, location_id: 3, staff_id: 4, role: "manager" },
    ],
    routing_rules: [
      { id: 1, priority: 1, applies_to_category: 5, applies_to_city: "جدة", preferred_location: 3 },
      { id: 2, priority: 2, applies_to_category: null, applies_to_city: "جدة", preferred_location: 3 },
      { id: 3, priority: 3, applies_to_category: 6, applies_to_city: null, preferred_location: 1 },
      { id: 4, priority: 4, applies_to_category: null, applies_to_city: "الدمام", preferred_location: 7 },
      { id: 5, priority: 5, applies_to_category: null, applies_to_city: null, preferred_location: 1 },
    ],
  };
}

export function locationsState(store: string | null): LocationsState {
  return storeState(store, "locations", () => seed(store));
}

export function nextLocationId(store: string | null, entity: "location" | "assignment" | "rule"): number {
  return nextId(store, `locations:${entity}`, entity === "location" ? 100 : 500);
}

/** The server's derivation of «نوع العرض» (M22 §5) — Arabic, never recomputed in the UI. */
export function displayType(l: Pick<MockLocation, "flags" | "ownership">): string {
  const f = l.flags;
  if (l.ownership === "dropship_supplier") return "مورد دروبشيبينج";
  if (f.is_mobile) return "مركبة متنقلة";
  if (l.ownership === "third_party_3pl") return "مستودع مشترك (3PL)";
  if (f.is_pickup_point && !f.stores_inventory && !f.serves_walk_in_customers) return "خزانة PUDO";
  if (f.stores_inventory && f.serves_walk_in_customers && f.ships_to_customer) return "موقع هجين";
  if (f.stores_inventory && !f.serves_walk_in_customers) return "مستودع مغلق";
  if (f.serves_walk_in_customers) return "فرع تجزئة";
  if (f.is_pickup_point) return "نقطة استلام";
  return "موقع";
}

/** Active locations as `{id, name}` — what M21/M18/M24 pickers need. */
export function listLocationRefs(store: string | null): Array<{ id: number; name: string; code: string; is_active: boolean }> {
  return locationsState(store).locations.map((l) => ({ id: l.id, name: l.name, code: l.code, is_active: l.is_active }));
}

export function getLocation(store: string | null, id: number): MockLocation | undefined {
  return locationsState(store).locations.find((l) => l.id === id);
}

export function multiLocationEnabled(store: string | null): boolean {
  return locationsState(store).multi_location_enabled;
}

// ───────────────────────────── M22 contract (T120) ─────────────────────────────

export const STAFF_OPTIONS = [
  { id: 2, full_name: "سارة الحربي", phone: "967770000001" },
  { id: 3, full_name: "خالد المطيري", phone: "967770000003" },
  { id: 4, full_name: "منى القحطاني", phone: "967770000004" },
  { id: 5, full_name: "عمر باوزير", phone: "967770000005" },
] as const;

type Body = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function productsCount(store: string | null, locationId: number): number {
  const rows = inventoryState(store).rows.filter((r) => r.location_id === locationId && Number(r.quantity_on_hand) > 0);
  return new Set(rows.map((r) => r.product_id)).size;
}

export function listItem(store: string | null, l: MockLocation) {
  return {
    id: l.id,
    code: l.code,
    name: l.name,
    city: l.city,
    display_type: displayType(l),
    ownership: l.ownership,
    is_active: l.is_active,
    parent_location: l.parent_location,
    flags: l.flags,
    products_count: productsCount(store, l.id),
  };
}

export function locationDetail(store: string | null, l: MockLocation) {
  return { ...l, display_type: displayType(l), products_count: productsCount(store, l.id) };
}

/** `GET /api/v1/locations/?q&flag&ownership&is_active` — parents first, children right after their parent. */
export function listLocations(store: string | null, params: URLSearchParams) {
  const all = locationsState(store).locations;
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const flag = params.get("flag") as LocationFlag | null;
  const ownership = params.get("ownership");
  const active = params.get("is_active");
  const match = (l: MockLocation) =>
    (!q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q) || l.city.toLowerCase().includes(q)) &&
    (!flag || !(LOCATION_FLAGS as readonly string[]).includes(flag) || l.flags[flag]) &&
    (!ownership || l.ownership === ownership) &&
    (!active || String(l.is_active) === active);
  const ordered: MockLocation[] = [];
  for (const parent of all.filter((l) => l.parent_location === null)) {
    ordered.push(parent, ...all.filter((c) => c.parent_location === parent.id));
  }
  for (const orphan of all) if (!ordered.includes(orphan)) ordered.push(orphan);
  const results = ordered.filter(match).map((l) => listItem(store, l));
  return { count: results.length, results, multi_location_enabled: locationsState(store).multi_location_enabled };
}

/** `POST /api/v1/locations/mode/` `{enabled, merge?}` — mirrors M34's switch so both screens agree. */
export function setLocationsMode(store: string | null, storeHost: string, body: Body): MockResult<{ multi_location_enabled: boolean }> {
  const res = setMultiLocation(store, storeHost, body);
  if (!res.ok) return res;
  locationsState(store).multi_location_enabled = res.data.multi_location_enabled;
  return { ok: true, data: { multi_location_enabled: res.data.multi_location_enabled } };
}

const HOURS_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateLocation(store: string | null, body: Body, current: MockLocation | null): MockResult<Partial<MockLocation>> {
  const e: Record<string, string[]> = {};
  const patch: Partial<MockLocation> = {};
  const has = (k: string) => k in body;
  if (has("name") || !current) {
    const name = str(body.name);
    if (!name) e.name = ["اسم الموقع مطلوب."];
    else patch.name = name;
  }
  if (has("code") || !current) {
    const code = str(body.code).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{1,19}$/.test(code)) e.code = ["الكود أحرف لاتينية وأرقام وشرطات (2–20)."];
    else if (locationsState(store).locations.some((l) => l.code === code && l.id !== current?.id)) e.code = ["هذا الكود مستخدم لموقع آخر."];
    else patch.code = code;
  }
  for (const k of ["address_text", "city", "phone"] as const) if (has(k)) patch[k] = str(body[k]);
  if (has("is_active")) patch.is_active = body.is_active === true;
  if (has("parent_location")) {
    const p = body.parent_location === null || body.parent_location === "" ? null : Number(body.parent_location);
    if (p !== null && (!Number.isInteger(p) || p === current?.id || !locationsState(store).locations.some((l) => l.id === p))) e.parent_location = ["الموقع الأب غير صالح."];
    else patch.parent_location = p;
  }
  for (const k of ["latitude", "longitude"] as const) {
    if (!has(k)) continue;
    const v = str(body[k]);
    if (!v) {
      patch[k] = null;
      continue;
    }
    const n = Number(v);
    const limit = k === "latitude" ? 90 : 180;
    if (!Number.isFinite(n) || Math.abs(n) > limit) e[k] = [k === "latitude" ? "خط العرض بين -90 و90." : "خط الطول بين -180 و180."];
    else patch[k] = n.toFixed(6).replace(/0+$/, "").replace(/\.$/, ".0");
  }
  if (has("flags")) {
    const f = body.flags as Record<string, unknown>;
    if (!f || typeof f !== "object") e.flags = ["الأعلام غير صالحة."];
    else patch.flags = Object.fromEntries(LOCATION_FLAGS.map((k) => [k, f[k] === true])) as Record<LocationFlag, boolean>;
  }
  if (has("ownership")) {
    if (!(OWNERSHIPS as readonly string[]).includes(str(body.ownership))) e.ownership = ["الملكية غير صالحة."];
    else patch.ownership = str(body.ownership) as Ownership;
  }
  const flagsAfter = patch.flags ?? current?.flags ?? flags([]);
  const ownershipAfter = patch.ownership ?? current?.ownership ?? "owned";
  if (has("operating_hours")) {
    const rows = Array.isArray(body.operating_hours) ? (body.operating_hours as Body[]) : [];
    const out: MockOperatingHours[] = [];
    for (const r of rows) {
      const wd = Number(r.weekday);
      if (!Number.isInteger(wd) || wd < 0 || wd > 6) {
        e.operating_hours = ["يوم غير صالح (0 = الأحد … 6 = السبت)."];
        break;
      }
      const closed = r.is_closed === true;
      const o = closed ? null : str(r.opens_at);
      const c = closed ? null : str(r.closes_at);
      if (!closed && (!HOURS_RE.test(o ?? "") || !HOURS_RE.test(c ?? ""))) {
        e.operating_hours = ["أدخل الساعات بصيغة HH:MM أو علّم اليوم مغلقاً."];
        break;
      }
      out.push({ weekday: wd, opens_at: o, closes_at: c, is_closed: closed });
    }
    patch.operating_hours = flagsAfter.is_pickup_point || flagsAfter.serves_walk_in_customers ? out : [];
  }
  // Conditional detail sections are dropped when their trigger is off (FR-22.03).
  if (has("locker")) patch.locker = flagsAfter.is_pickup_point && body.locker && typeof body.locker === "object" ? { provider: str((body.locker as Body).provider), locker_code: str((body.locker as Body).locker_code), capacity: Number((body.locker as Body).capacity) || 0 } : null;
  if (has("franchise")) patch.franchise = ownershipAfter === "franchise" && body.franchise && typeof body.franchise === "object" ? { franchisee_name: str((body.franchise as Body).franchisee_name), contract_ends_at: str((body.franchise as Body).contract_ends_at) || null } : null;
  if (has("dropship_supplier")) {
    const d = body.dropship_supplier as Body | null;
    if (ownershipAfter === "dropship_supplier" && d && typeof d === "object") {
      const channel = str(d.channel);
      if (!["whatsapp", "email", "api_webhook"].includes(channel)) e.dropship_supplier = ["قناة التواصل غير صالحة."];
      else patch.dropship_supplier = { channel: channel as "whatsapp" | "email" | "api_webhook", contact: str(d.contact) };
    } else patch.dropship_supplier = null;
  }
  if (has("vehicle")) patch.vehicle = flagsAfter.is_mobile && body.vehicle && typeof body.vehicle === "object" ? { plate_number: str((body.vehicle as Body).plate_number), driver_phone: str((body.vehicle as Body).driver_phone) } : null;
  if (has("external_refs")) patch.external_refs = Array.isArray(body.external_refs) ? (body.external_refs as Body[]).map((r) => ({ system: str(r.system), ref: str(r.ref) })).filter((r) => r.system && r.ref) : [];
  if (flagsAfter.is_virtual) {
    patch.latitude = null;
    patch.longitude = null;
  }
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  return { ok: true, data: patch };
}

export function createLocation(store: string | null, body: Body): MockResult<ReturnType<typeof locationDetail>> {
  const v = validateLocation(store, body, null);
  if (!v.ok) return v;
  const now = new Date().toISOString();
  const l: MockLocation = {
    id: nextLocationId(store, "location"),
    code: "",
    name: "",
    is_active: true,
    address_text: "",
    city: "",
    latitude: null,
    longitude: null,
    phone: "",
    parent_location: null,
    flags: flags([]),
    ownership: "owned",
    operating_hours: [],
    locker: null,
    franchise: null,
    dropship_supplier: null,
    vehicle: null,
    external_refs: [],
    created_at: now,
    updated_at: now,
    ...v.data,
  };
  locationsState(store).locations.push(l);
  return { ok: true, data: locationDetail(store, l), status: 201 };
}

export function patchLocation(store: string | null, id: number, body: Body): MockResult<ReturnType<typeof locationDetail>> {
  const l = getLocation(store, id);
  if (!l) return { ok: false, status: 404, body: { detail: "الموقع غير موجود." } };
  const v = validateLocation(store, body, l);
  if (!v.ok) return v;
  Object.assign(l, v.data, { updated_at: new Date().toISOString() });
  return { ok: true, data: locationDetail(store, l) };
}

/** `GET /api/v1/locations/<id>/deactivation-impact/` (FR-22.08). */
export function deactivationImpact(store: string | null, id: number): { on_hand_total: string; open_fulfillments: number } {
  const onHand = inventoryState(store).rows.filter((r) => r.location_id === id).reduce((s, r) => s + Number(r.quantity_on_hand), 0);
  const open = ordersState(store).orders.filter((o) => (o.status === "new" || o.status === "awaiting_payment") && o.lines.some((l) => l.location_id === id)).length;
  return { on_hand_total: onHand.toFixed(3), open_fulfillments: open };
}

// Staff assignments (US-22.5) — the same array M18's matrix writes.
export function listAssignments(store: string | null, locationId: number) {
  return locationsState(store)
    .assignments.filter((a) => a.location_id === locationId)
    .map((a) => ({ ...a, staff: STAFF_OPTIONS.find((s) => s.id === a.staff_id) ?? { id: a.staff_id, full_name: `موظف #${a.staff_id}`, phone: "" } }));
}

export function addAssignment(store: string | null, locationId: number, body: Body): MockResult<ReturnType<typeof listAssignments>[number]> {
  if (!getLocation(store, locationId)) return { ok: false, status: 404, body: { detail: "الموقع غير موجود." } };
  const staffId = Number(body.staff_id);
  const role = str(body.role) as LocationRole;
  if (!STAFF_OPTIONS.some((s) => s.id === staffId)) return { ok: false, status: 400, body: { staff_id: ["اختر موظفاً."] } };
  if (!(LOCATION_ROLES as readonly string[]).includes(role)) return { ok: false, status: 400, body: { role: ["اختر دوراً تشغيلياً."] } };
  const state = locationsState(store);
  const existing = state.assignments.find((a) => a.location_id === locationId && a.staff_id === staffId);
  if (existing) {
    existing.role = role;
    return { ok: true, data: listAssignments(store, locationId).find((a) => a.id === existing.id)! };
  }
  const a: MockLocationAssignment = { id: nextLocationId(store, "assignment"), location_id: locationId, staff_id: staffId, role };
  state.assignments.push(a);
  return { ok: true, data: listAssignments(store, locationId).find((x) => x.id === a.id)!, status: 201 };
}

export function removeAssignment(store: string | null, locationId: number, assignmentId: number): MockResult<null> {
  const state = locationsState(store);
  const i = state.assignments.findIndex((a) => a.id === assignmentId && a.location_id === locationId);
  if (i < 0) return { ok: false, status: 404, body: { detail: "التعيين غير موجود." } };
  state.assignments.splice(i, 1);
  return { ok: true, data: null, status: 204 };
}

// Routing rules (US-22.6).
export function ruleView(store: string | null, r: MockRoutingRule) {
  const loc = getLocation(store, r.preferred_location);
  const cat = r.applies_to_category ? catalog(store).categories.find((c) => c.id === r.applies_to_category) : null;
  return {
    ...r,
    category_name: cat?.name ?? null,
    location: loc ? { id: loc.id, code: loc.code, name: loc.name, is_active: loc.is_active } : null,
  };
}

export function listRules(store: string | null) {
  return [...locationsState(store).routing_rules].sort((a, b) => a.priority - b.priority).map((r) => ruleView(store, r));
}

function validateRule(store: string | null, body: Body): MockResult<Omit<MockRoutingRule, "id" | "priority">> {
  const e: Record<string, string[]> = {};
  const loc = Number(body.preferred_location);
  if (!getLocation(store, loc)) e.preferred_location = ["اختر الموقع المفضَّل."];
  const cat = body.applies_to_category ? Number(body.applies_to_category) : null;
  if (cat !== null && !catalog(store).categories.some((c) => c.id === cat)) e.applies_to_category = ["التصنيف غير موجود."];
  const city = str(body.applies_to_city) || null;
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  return { ok: true, data: { applies_to_category: cat, applies_to_city: city, preferred_location: loc } };
}

export function createRule(store: string | null, body: Body): MockResult<ReturnType<typeof ruleView>> {
  const v = validateRule(store, body);
  if (!v.ok) return v;
  const state = locationsState(store);
  const r: MockRoutingRule = { id: nextLocationId(store, "rule"), priority: state.routing_rules.length + 1, ...v.data };
  state.routing_rules.push(r);
  return { ok: true, data: ruleView(store, r), status: 201 };
}

export function patchRule(store: string | null, id: number, body: Body): MockResult<ReturnType<typeof ruleView>> {
  const r = locationsState(store).routing_rules.find((x) => x.id === id);
  if (!r) return { ok: false, status: 404, body: { detail: "القاعدة غير موجودة." } };
  const v = validateRule(store, { applies_to_category: r.applies_to_category, applies_to_city: r.applies_to_city, preferred_location: r.preferred_location, ...body });
  if (!v.ok) return v;
  Object.assign(r, v.data);
  return { ok: true, data: ruleView(store, r) };
}

export function deleteRule(store: string | null, id: number): MockResult<null> {
  const state = locationsState(store);
  const i = state.routing_rules.findIndex((x) => x.id === id);
  if (i < 0) return { ok: false, status: 404, body: { detail: "القاعدة غير موجودة." } };
  state.routing_rules.splice(i, 1);
  state.routing_rules.sort((a, b) => a.priority - b.priority).forEach((r, idx) => (r.priority = idx + 1));
  return { ok: true, data: null, status: 204 };
}

/** `POST reorder/ {ordered_ids}` → `{ok, reordered}` — the server renumbers `priority` (US-22.6.1). */
export function reorderRules(store: string | null, ordered: unknown): MockResult<{ ok: true; reordered: number; results: ReturnType<typeof listRules> }> {
  const state = locationsState(store);
  const ids = Array.isArray(ordered) ? ordered.map(Number) : [];
  const known = new Set(state.routing_rules.map((r) => r.id));
  if (ids.length !== known.size || ids.some((id) => !known.has(id)) || new Set(ids).size !== ids.length) {
    return { ok: false, status: 400, body: { ordered_ids: ["أرسل كل معرّفات القواعد بترتيبها الكامل."] } };
  }
  ids.forEach((id, i) => (state.routing_rules.find((r) => r.id === id)!.priority = i + 1));
  return { ok: true, data: { ok: true, reordered: ids.length, results: listRules(store) } };
}

/** `GET preview/?city&category` — the first matching rule wins (US-22.6.1). */
export function previewRouting(store: string | null, city: string, category: number | null) {
  const rules = listRules(store);
  const hit = rules.find((r) => (!r.applies_to_city || r.applies_to_city === city) && (!r.applies_to_category || r.applies_to_category === category));
  const fallback = locationsState(store).locations.find((l) => l.is_active && l.flags.ships_to_customer) ?? null;
  const target = hit?.location ?? (fallback ? { id: fallback.id, code: fallback.code, name: fallback.name, is_active: fallback.is_active } : null);
  const catName = category ? (catalog(store).categories.find((c) => c.id === category)?.name ?? null) : null;
  const single = locationsState(store).locations.filter((l) => l.is_active).length <= 1;
  return { rule_id: hit?.id ?? null, location: target, city, category_name: catName, single_location: single };
}

export function settingsWeekStart(store: string | null, storeHost: string): "sunday" | "monday" {
  return readSettings(store, storeHost).week_start_day;
}
