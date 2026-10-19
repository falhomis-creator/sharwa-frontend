import type { MockResult } from "@/lib/bff/mock-route";
import { displayMoney } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, nextId, storeState } from "@/mocks/store-state";
import { catalog } from "@/mocks/catalog/state";
import { adjustStock, patchLocationRow } from "@/mocks/inventory/state";
import { listLocationRefs, multiLocationEnabled } from "@/mocks/locations/state";
import { approvalsState, createApproval, type MockApproval } from "@/mocks/approvals/state";
import { hashStore, rng, str, type Body } from "@/mocks/procurement/kit";

/**
 * M23 mock server state — suppliers and purchase orders (`[NEEDS BACKEND]`, §7).
 * Receiving writes the M21 ledger through `adjustStock(reason=po_received)` so the stock
 * movement is visible in M21 with a reference back to the order (SC-23.2); submitting
 * creates the M18 `po_approval` request, and a decision taken there is reconciled here
 * the next time the order is read (one source of truth: the approval).
 */
export const PO_STATUSES = ["draft", "pending_approval", "approved", "partially_received", "received", "cancelled"] as const;
export type PoStatus = (typeof PO_STATUSES)[number];

export interface MockSupplier {
  id: number;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  tax_number: string;
  notes: string;
  is_active: boolean;
  created_at: string;
}

export interface MockPoLine {
  id: number;
  product_id: number;
  variant_id: number | null;
  product_name: string;
  sku: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: string;
}

export interface MockPoEvent {
  id: number;
  kind: "created" | "updated" | "submitted" | "approved" | "rejected" | "received" | "cancelled";
  text: string;
  actor: string;
  at: string;
  quantities?: Array<{ sku: string; quantity: number }>;
}

export interface MockPo {
  id: number;
  number: string;
  supplier_id: number;
  location_id: number;
  status: PoStatus;
  notes: string;
  version: number;
  lines: MockPoLine[];
  approval_id: number | null;
  approver: string | null;
  timeline: MockPoEvent[];
  created_at: string;
  updated_at: string;
}

interface ProcurementState {
  suppliers: MockSupplier[];
  orders: MockPo[];
}

const at = (hoursAgo: number) => new Date(FIXTURE_NOW - hoursAgo * 3_600_000).toISOString();

const SUPPLIER_SEED: Array<Omit<MockSupplier, "id" | "created_at" | "is_active">> = [
  { name: "مؤسسة البن اليمني", contact_name: "عبدالله الحداد", phone: "967771234501", email: "orders@yemenicoffee.example", address: "صنعاء — شارع حدة", tax_number: "300112233400003", notes: "توريد أسبوعي كل أحد." },
  { name: "شركة التغليف الحديث", contact_name: "ريم السالم", phone: "966551234502", email: "sales@modernpack.example", address: "الرياض — حي السلي", tax_number: "", notes: "" },
  { name: "مصنع العطور الشرقية", contact_name: "فهد العمري", phone: "966551234503", email: "", address: "جدة — المنطقة الصناعية", tax_number: "300998877600003", notes: "الحد الأدنى للطلب 50 قطعة." },
  { name: "موزع الإلكترونيات المتحد", contact_name: "سامي النهدي", phone: "967771234504", email: "b2b@united-elec.example", address: "عدن — المعلا", tax_number: "", notes: "" },
  { name: "مزارع الوادي", contact_name: "أم خالد", phone: "967771234505", email: "", address: "حضرموت — سيئون", tax_number: "", notes: "عسل دوعني موسمي." },
  { name: "مورد الأقمشة الذهبي", contact_name: "ماجد باوزير", phone: "966551234506", email: "info@golden-fabric.example", address: "مكة — العزيزية", tax_number: "", notes: "" },
];

function eligibleProducts(store: string | null) {
  const cat = catalog(store);
  return cat.products
    .filter((p) => !p.is_serialized && !p.is_bundle && !p.is_auction && !p.archived_at)
    .map((p) => {
      const variant = cat.variants.find((v) => v.product_id === p.id) ?? null;
      return { product: p, variant };
    });
}

function seed(store: string | null): ProcurementState {
  if (isEmptyStore(store)) return { suppliers: [], orders: [] };
  const rnd = rng(hashStore(store) ^ 0x2323);
  const suppliers: MockSupplier[] = SUPPLIER_SEED.map((s, i) => ({ ...s, id: i + 1, is_active: i !== 5, created_at: at(24 * (200 - i * 20)) }));
  const products = eligibleProducts(store);
  const locations = listLocationRefs(store).filter((l) => l.is_active);
  const locId = (i: number) => locations[i % Math.max(1, locations.length)]?.id ?? 1;
  const orders: MockPo[] = [];
  // 40 orders spread over the six statuses (US-23.5).
  const plan: PoStatus[] = [
    ...Array<PoStatus>(7).fill("draft"),
    ...Array<PoStatus>(6).fill("pending_approval"),
    ...Array<PoStatus>(8).fill("approved"),
    ...Array<PoStatus>(6).fill("partially_received"),
    ...Array<PoStatus>(9).fill("received"),
    ...Array<PoStatus>(4).fill("cancelled"),
  ];
  let lineId = 1;
  let evId = 1;
  plan.forEach((status, i) => {
    const id = i + 1;
    const supplier = suppliers[i % 5]!;
    const created = 24 * (60 - i) + 5;
    const lines: MockPoLine[] = [];
    const count = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < count && products.length; k++) {
      const { product, variant } = products[(i * 3 + k) % products.length]!;
      const ordered = 5 + Math.floor(rnd() * 20);
      const cost = (Number(product.cost_price ?? product.price) * 0.6 || 10 + rnd() * 50).toFixed(2);
      const received = status === "received" ? ordered : status === "partially_received" ? Math.max(1, Math.floor(ordered / 3)) : 0;
      lines.push({
        id: lineId++,
        product_id: product.id,
        variant_id: variant?.id ?? null,
        product_name: product.name,
        sku: variant?.sku ?? product.sku,
        quantity_ordered: ordered,
        quantity_received: received,
        unit_cost: cost,
      });
    }
    const timeline: MockPoEvent[] = [{ id: evId++, kind: "created", text: "أُنشئ أمر الشراء كمسودة.", actor: "مالك المتجر", at: at(created) }];
    if (status !== "draft" && status !== "cancelled") timeline.push({ id: evId++, kind: "submitted", text: "أُرسل للموافقة.", actor: "مالك المتجر", at: at(created - 2) });
    if (["approved", "partially_received", "received"].includes(status)) timeline.push({ id: evId++, kind: "approved", text: "اعتُمد الأمر.", actor: "مالك المتجر", at: at(created - 4) });
    if (status === "partially_received" || status === "received")
      timeline.push({ id: evId++, kind: "received", text: status === "received" ? "استُلمت كل الكميات." : "استلام جزئي.", actor: "مالك المتجر", at: at(created - 20), quantities: lines.map((l) => ({ sku: l.sku, quantity: l.quantity_received })) });
    if (status === "cancelled") timeline.push({ id: evId++, kind: "cancelled", text: "أُلغي الأمر.", actor: "مالك المتجر", at: at(created - 3) });
    orders.push({
      id,
      number: `PO-${String(id).padStart(4, "0")}`,
      supplier_id: supplier.id,
      location_id: locId(i),
      status,
      notes: "",
      version: 1,
      lines,
      approval_id: null,
      approver: ["approved", "partially_received", "received"].includes(status) ? "مالك المتجر" : null,
      timeline,
      created_at: at(created),
      updated_at: at(Math.max(1, created - 20)),
    });
  });
  // The M18 fixture already holds a pending `po_approval` for order #31 — keep them one record.
  const po31 = orders.find((o) => o.id === 31);
  const linked = approvalsState(store).items.find((a) => a.request_type === "po_approval" && a.entity?.id === 31);
  if (po31 && linked) {
    po31.status = linked.status === "approved" ? "approved" : linked.status === "rejected" ? "draft" : "pending_approval";
    po31.approval_id = linked.id;
    if (linked.entity) linked.entity.available = true;
  }
  // The other seeded pending orders get their M18 request too.
  for (const o of orders) {
    if (o.status === "pending_approval" && o.approval_id === null) o.approval_id = -1; // created lazily (see reconcile)
  }
  return { suppliers, orders };
}

export function procurementState(store: string | null): ProcurementState {
  return storeState(store, "procurement", () => seed(store));
}

const supplierName = (store: string | null, id: number) => procurementState(store).suppliers.find((s) => s.id === id)?.name ?? "مورد محذوف";
const locationRef = (store: string | null, id: number) => {
  const l = listLocationRefs(store).find((x) => x.id === id);
  return { id, name: l?.name ?? "الموقع الافتراضي" };
};

function lineTotal(l: MockPoLine) {
  return Number(l.unit_cost) * l.quantity_ordered;
}

function poTotal(o: MockPo) {
  return o.lines.reduce((s, l) => s + lineTotal(l), 0);
}

// ── approvals (M18) ─────────────────────────────────────────────────────────────────

function approvalFor(store: string | null, o: MockPo, requester: { id: number | null; name: string }): MockApproval {
  return createApproval(store, {
    request_type: "po_approval",
    requester_id: requester.id,
    requester_name: requester.name,
    approver_role: "معتمِد المشتريات",
    payload: { purchase_order_id: o.id, display_total: displayMoney(poTotal(o)), supplier: supplierName(store, o.supplier_id) },
    summary: `اعتماد ${o.number} — ${supplierName(store, o.supplier_id)}`,
    entity: { kind: "purchase_order", id: o.id, label: o.number, available: true },
  });
}

/** Bring the order in line with its M18 request (decided there, or seeded without one). */
function reconcile(store: string | null, o: MockPo) {
  if (o.status !== "pending_approval") return;
  if (o.approval_id === -1) {
    o.approval_id = approvalFor(store, o, { id: null, name: "مالك المتجر" }).id;
    return;
  }
  const a = approvalsState(store).items.find((x) => x.id === o.approval_id);
  if (!a || a.status === "pending") return;
  applyDecision(store, o, a.status === "approved" ? "approve" : "reject", a.decided_by ?? "معتمِد");
}

function applyDecision(store: string | null, o: MockPo, decision: "approve" | "reject", actor: string) {
  o.status = decision === "approve" ? "approved" : "draft";
  o.approver = decision === "approve" ? actor : null;
  o.version += 1;
  o.updated_at = new Date().toISOString();
  pushEvent(store, o, decision === "approve" ? "approved" : "rejected", decision === "approve" ? "اعتُمد الأمر." : "رُفض الأمر وأُعيد مسودة.", actor);
}

function pushEvent(store: string | null, o: MockPo, kind: MockPoEvent["kind"], text: string, actor: string, quantities?: MockPoEvent["quantities"]) {
  o.timeline.push({ id: nextId(store, "po-event", 1000), kind, text, actor, at: new Date().toISOString(), quantities });
}

// ── views ───────────────────────────────────────────────────────────────────────────

export function supplierView(store: string | null, s: MockSupplier) {
  const orders = procurementState(store).orders.filter((o) => o.supplier_id === s.id);
  return { ...s, orders_count: orders.length, open_orders_count: orders.filter((o) => o.status !== "cancelled").length };
}

export function poListItem(store: string | null, o: MockPo) {
  reconcile(store, o);
  return {
    id: o.id,
    number: o.number,
    supplier: { id: o.supplier_id, name: supplierName(store, o.supplier_id) },
    location: locationRef(store, o.location_id),
    status: o.status,
    display_total: displayMoney(poTotal(o)),
    lines_count: o.lines.length,
    created_at: o.created_at,
  };
}

export function poDetail(store: string | null, o: MockPo) {
  reconcile(store, o);
  const products = catalog(store).products;
  const approval = o.approval_id && o.approval_id > 0 ? approvalsState(store).items.find((a) => a.id === o.approval_id) : undefined;
  return {
    ...poListItem(store, o),
    notes: o.notes,
    version: o.version,
    updated_at: o.updated_at,
    multi_location: multiLocationEnabled(store),
    lines: o.lines.map((l) => ({
      id: l.id,
      product_id: l.product_id,
      variant_id: l.variant_id,
      product_name: l.product_name,
      sku: l.sku,
      quantity_ordered: l.quantity_ordered,
      quantity_received: l.quantity_received,
      unit_cost: l.unit_cost,
      display_unit_cost: displayMoney(Number(l.unit_cost)),
      display_line_total: displayMoney(lineTotal(l)),
      product_deleted: !products.some((p) => p.id === l.product_id),
    })),
    approval: approval ? { id: approval.id, status: approval.status, approver: approval.decided_by, approver_role: approval.approver_role } : null,
    approver: o.approver,
    timeline: [...o.timeline].sort((a, b) => b.at.localeCompare(a.at)),
  };
}

// ── suppliers ───────────────────────────────────────────────────────────────────────

export function listSuppliers(store: string | null, params: URLSearchParams) {
  const q = (params.get("q") ?? "").trim();
  return procurementState(store)
    .suppliers.filter((s) => !q || s.name.includes(q) || s.phone.includes(q) || s.contact_name.includes(q))
    .sort((a, b) => b.id - a.id)
    .map((s) => supplierView(store, s));
}

function validateSupplier(b: Body, partial: boolean): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (!partial || "name" in b) {
    const name = str(b.name);
    if (!name) errors.name = ["اسم المورد مطلوب."];
    else if (name.length > 150) errors.name = ["الاسم أطول من 150 حرفاً."];
  }
  if ("phone" in b && str(b.phone) && !/^\d{9,15}$/.test(str(b.phone))) errors.phone = ["رقم الهاتف أرقام فقط بالصيغة الدولية."];
  if ("email" in b && str(b.email) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str(b.email))) errors.email = ["بريد إلكتروني غير صالح."];
  return errors;
}

export function createSupplier(store: string | null, b: Body): MockResult<ReturnType<typeof supplierView>> {
  const errors = validateSupplier(b, false);
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  const s: MockSupplier = {
    id: nextId(store, "supplier", 100),
    name: str(b.name),
    contact_name: str(b.contact_name),
    phone: str(b.phone),
    email: str(b.email),
    address: str(b.address),
    tax_number: str(b.tax_number),
    notes: str(b.notes),
    is_active: b.is_active === undefined ? true : b.is_active === true,
    created_at: new Date().toISOString(),
  };
  procurementState(store).suppliers.push(s);
  return { ok: true, status: 201, data: supplierView(store, s) };
}

export function updateSupplier(store: string | null, id: number, b: Body): MockResult<ReturnType<typeof supplierView>> {
  const s = procurementState(store).suppliers.find((x) => x.id === id);
  if (!s) return { ok: false, status: 404, body: { detail: "المورد غير موجود." } };
  const errors = validateSupplier(b, true);
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  for (const k of ["name", "contact_name", "phone", "email", "address", "tax_number", "notes"] as const) if (k in b) s[k] = str(b[k]);
  if ("is_active" in b) s.is_active = b.is_active === true;
  return { ok: true, data: supplierView(store, s) };
}

export function deleteSupplier(store: string | null, id: number): MockResult<null> {
  const state = procurementState(store);
  const s = state.suppliers.find((x) => x.id === id);
  if (!s) return { ok: false, status: 404, body: { detail: "المورد غير موجود." } };
  const linked = state.orders.filter((o) => o.supplier_id === id && o.status !== "cancelled").length;
  if (linked) return { ok: false, status: 409, body: { detail: `لا يمكن حذف المورد: مرتبط بـ ${linked} أمر شراء غير ملغى.`, orders_count: linked } };
  state.suppliers = state.suppliers.filter((x) => x.id !== id);
  return { ok: true, status: 204, data: null };
}

// ── purchase orders ─────────────────────────────────────────────────────────────────

export function listPurchaseOrders(store: string | null, params: URLSearchParams) {
  const status = params.get("status");
  const supplier = Number(params.get("supplier") ?? 0);
  const location = Number(params.get("location") ?? 0);
  const from = params.get("from");
  const to = params.get("to");
  const q = (params.get("q") ?? "").trim().toLowerCase();
  return procurementState(store)
    .orders.filter((o) => {
      reconcile(store, o);
      if (status && o.status !== status) return false;
      if (supplier && o.supplier_id !== supplier) return false;
      if (location && o.location_id !== location) return false;
      if (from && o.created_at.slice(0, 10) < from) return false;
      if (to && o.created_at.slice(0, 10) > to) return false;
      if (q && !o.number.toLowerCase().includes(q) && !supplierName(store, o.supplier_id).includes(q) && !o.lines.some((l) => l.sku.toLowerCase().includes(q))) return false;
      return true;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((o) => poListItem(store, o));
}

export function getPo(store: string | null, id: number) {
  return procurementState(store).orders.find((o) => o.id === id);
}

function parseLines(store: string | null, raw: unknown): MockResult<MockPoLine[]> {
  if (!Array.isArray(raw)) return { ok: false, status: 400, body: { lines: ["السطور مطلوبة."] } };
  const cat = catalog(store);
  const lines: MockPoLine[] = [];
  const errors: Record<string, string[]> = {};
  raw.forEach((r, i) => {
    const row = (r ?? {}) as Body;
    const product = cat.products.find((p) => p.id === Number(row.product_id));
    if (!product) {
      errors[`lines.${i}.product_id`] = ["المنتج غير موجود."];
      return;
    }
    const variants = cat.variants.filter((v) => v.product_id === product.id);
    const variant = row.variant_id ? variants.find((v) => v.id === Number(row.variant_id)) : undefined;
    if (variants.length && !variant) {
      errors[`lines.${i}.variant_id`] = ["حدد المتغير."];
      return;
    }
    if (product.is_serialized || product.is_bundle || product.is_auction) {
      errors[`lines.${i}.product_id`] = ["هذا المنتج لا يُستلم بأمر شراء (مسلسل/حزمة/مزاد)."];
      return;
    }
    const qty = Number(row.quantity_ordered);
    if (!Number.isInteger(qty) || qty < 1) errors[`lines.${i}.quantity_ordered`] = ["الكمية عدد صحيح موجب."];
    if (!/^\d+(\.\d{1,2})?$/.test(str(row.unit_cost))) errors[`lines.${i}.unit_cost`] = ["تكلفة الوحدة رقم حتى خانتين عشريتين."];
    lines.push({
      id: nextId(store, "po-line", 1000),
      product_id: product.id,
      variant_id: variant?.id ?? null,
      product_name: product.name,
      sku: variant?.sku ?? product.sku,
      quantity_ordered: qty,
      quantity_received: 0,
      unit_cost: Number(str(row.unit_cost) || 0).toFixed(2),
    });
  });
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  return { ok: true, data: lines };
}

function resolveLocation(store: string | null, b: Body): number | null {
  const refs = listLocationRefs(store).filter((l) => l.is_active);
  if (!multiLocationEnabled(store)) return refs[0]?.id ?? 1;
  const id = Number(b.location_id);
  return refs.some((l) => l.id === id) ? id : null;
}

export function createPo(store: string | null, b: Body, actor: string): MockResult<ReturnType<typeof poDetail>> {
  const state = procurementState(store);
  const errors: Record<string, string[]> = {};
  const supplier = state.suppliers.find((s) => s.id === Number(b.supplier_id));
  if (!supplier) errors.supplier_id = ["اختر المورد."];
  else if (!supplier.is_active) errors.supplier_id = ["المورد غير نشط."];
  const location = resolveLocation(store, b);
  if (!location) errors.location_id = ["اختر موقع الاستلام."];
  const lines = parseLines(store, b.lines ?? []);
  if (!lines.ok) Object.assign(errors, lines.body);
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  const id = nextId(store, "po", state.orders.length + 100);
  const now = new Date().toISOString();
  const o: MockPo = {
    id,
    number: `PO-${String(id).padStart(4, "0")}`,
    supplier_id: supplier!.id,
    location_id: location!,
    status: "draft",
    notes: str(b.notes),
    version: 1,
    lines: lines.ok ? lines.data : [],
    approval_id: null,
    approver: null,
    timeline: [{ id: nextId(store, "po-event", 1000), kind: "created", text: "أُنشئ أمر الشراء كمسودة.", actor, at: now }],
    created_at: now,
    updated_at: now,
  };
  state.orders.push(o);
  return { ok: true, status: 201, data: poDetail(store, o) };
}

export function updatePo(store: string | null, id: number, b: Body, actor: string): MockResult<ReturnType<typeof poDetail>> {
  const o = getPo(store, id);
  if (!o) return { ok: false, status: 404, body: { detail: "أمر الشراء غير موجود." } };
  if (o.status !== "draft") return { ok: false, status: 409, body: { detail: "التعديل متاح للمسودة فقط." } };
  if (b.version !== undefined && Number(b.version) !== o.version) return { ok: false, status: 409, body: { detail: "حُدِّث الأمر من مستخدم آخر.", version: o.version } };
  const errors: Record<string, string[]> = {};
  if ("supplier_id" in b) {
    const s = procurementState(store).suppliers.find((x) => x.id === Number(b.supplier_id));
    if (!s) errors.supplier_id = ["اختر المورد."];
    else o.supplier_id = s.id;
  }
  if ("location_id" in b) {
    const loc = resolveLocation(store, b);
    if (!loc) errors.location_id = ["اختر موقع الاستلام."];
    else o.location_id = loc;
  }
  if ("lines" in b) {
    const lines = parseLines(store, b.lines);
    if (!lines.ok) Object.assign(errors, lines.body);
    else o.lines = lines.data;
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  if ("notes" in b) o.notes = str(b.notes);
  o.version += 1;
  o.updated_at = new Date().toISOString();
  pushEvent(store, o, "updated", "عُدّلت المسودة.", actor);
  return { ok: true, data: poDetail(store, o) };
}

export function submitPo(store: string | null, id: number, b: Body, requester: { id: number | null; name: string }): MockResult<{ status: PoStatus; approval_id: number; version: number }> {
  const o = getPo(store, id);
  if (!o) return { ok: false, status: 404, body: { detail: "أمر الشراء غير موجود." } };
  if (o.status !== "draft") return { ok: false, status: 409, body: { detail: "الإرسال متاح للمسودة فقط." } };
  if (b.version !== undefined && Number(b.version) !== o.version) return { ok: false, status: 409, body: { detail: "حُدِّث الأمر من مستخدم آخر.", version: o.version } };
  if (!o.lines.length) return { ok: false, status: 400, body: { lines: ["أضف سطراً واحداً على الأقل."] } };
  o.status = "pending_approval";
  o.approval_id = approvalFor(store, o, requester).id;
  o.version += 1;
  o.updated_at = new Date().toISOString();
  pushEvent(store, o, "submitted", `أُرسل للموافقة (طلب #${o.approval_id}).`, requester.name);
  return { ok: true, data: { status: o.status, approval_id: o.approval_id, version: o.version } };
}

export function resolvePo(store: string | null, id: number, b: Body, actor: string): MockResult<ReturnType<typeof poDetail>> {
  const o = getPo(store, id);
  if (!o) return { ok: false, status: 404, body: { detail: "أمر الشراء غير موجود." } };
  reconcile(store, o);
  if (Number(b.version) !== o.version) return { ok: false, status: 409, body: { detail: "حُدِّث الأمر من مستخدم آخر.", version: o.version } };
  if (o.status !== "pending_approval") return { ok: false, status: 409, body: { detail: "الأمر ليس بانتظار الموافقة." } };
  if (b.decision !== "approve" && b.decision !== "reject") return { ok: false, status: 400, body: { decision: ["القرار approve أو reject."] } };
  const a = approvalsState(store).items.find((x) => x.id === o.approval_id);
  if (a && a.status === "pending") {
    a.status = b.decision === "approve" ? "approved" : "rejected";
    a.decided_by = actor;
    a.decided_at = new Date().toISOString();
    a.version += 1;
  }
  applyDecision(store, o, b.decision, actor);
  return { ok: true, data: poDetail(store, o) };
}

export function receivePo(store: string | null, id: number, b: Body, actor: string): MockResult<ReturnType<typeof poDetail>> {
  const o = getPo(store, id);
  if (!o) return { ok: false, status: 404, body: { detail: "أمر الشراء غير موجود." } };
  if (Number(b.version) !== o.version) return { ok: false, status: 409, body: { detail: "حُدِّث الأمر من مستخدم آخر.", version: o.version } };
  if (o.status !== "approved" && o.status !== "partially_received") return { ok: false, status: 409, body: { detail: "الاستلام متاح للأوامر المعتمدة فقط." } };
  const raw = Array.isArray(b.lines) ? (b.lines as Body[]) : [];
  const plan: Array<{ line: MockPoLine; qty: number }> = [];
  const errors: Record<string, string[]> = {};
  raw.forEach((r, i) => {
    const line = o.lines.find((l) => l.id === Number(r.line_id));
    const qty = Number(r.quantity_received_now);
    if (!line) {
      errors[`lines.${i}.line_id`] = ["السطر غير موجود في الأمر."];
      return;
    }
    if (!Number.isInteger(qty) || qty < 0) {
      errors[`lines.${i}.quantity_received_now`] = ["الكمية عدد صحيح غير سالب."];
      return;
    }
    if (qty > line.quantity_ordered - line.quantity_received) {
      errors[`lines.${i}.quantity_received_now`] = [`تتجاوز المتبقي (${line.quantity_ordered - line.quantity_received}).`];
      return;
    }
    if (qty > 0) plan.push({ line, qty });
  });
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  if (!plan.length) return { ok: false, status: 400, body: { lines: ["أدخل كمية مستلمة لسطر واحد على الأقل."] } };
  const multi = multiLocationEnabled(store);
  for (const { line, qty } of plan) {
    if (multi) patchLocationRow(store, o.location_id, line.product_id, line.variant_id, {});
    const r = adjustStock(
      store,
      { product_id: line.product_id, variant_id: line.variant_id ?? undefined, location_id: multi ? o.location_id : undefined, delta: String(qty), reason: "po_received" },
      actor,
      { type: "purchase_order", id: o.id, label: o.number },
    );
    if (!r.ok) return { ok: false, status: r.status, body: r.body };
    line.quantity_received += qty;
  }
  o.status = o.lines.every((l) => l.quantity_received >= l.quantity_ordered) ? "received" : "partially_received";
  o.version += 1;
  o.updated_at = new Date().toISOString();
  pushEvent(store, o, "received", o.status === "received" ? "استُلمت كل الكميات." : "استلام جزئي.", actor, plan.map((p) => ({ sku: p.line.sku, quantity: p.qty })));
  return { ok: true, data: poDetail(store, o) };
}

export function cancelPo(store: string | null, id: number, b: Body, actor: string): MockResult<ReturnType<typeof poDetail>> {
  const o = getPo(store, id);
  if (!o) return { ok: false, status: 404, body: { detail: "أمر الشراء غير موجود." } };
  if (Number(b.version) !== o.version) return { ok: false, status: 409, body: { detail: "حُدِّث الأمر من مستخدم آخر.", version: o.version } };
  if (o.status === "received" || o.status === "cancelled") return { ok: false, status: 409, body: { detail: "لا يمكن إلغاء أمر مستلَم أو ملغى." } };
  const a = o.approval_id && o.approval_id > 0 ? approvalsState(store).items.find((x) => x.id === o.approval_id) : undefined;
  if (a && a.status === "pending") {
    a.status = "rejected";
    a.note = "أُلغي أمر الشراء.";
    a.decided_by = actor;
    a.decided_at = new Date().toISOString();
    a.version += 1;
  }
  o.status = "cancelled";
  o.version += 1;
  o.updated_at = new Date().toISOString();
  pushEvent(store, o, "cancelled", "أُلغي الأمر.", actor);
  return { ok: true, data: poDetail(store, o) };
}

/** Line picker (§7 last row): products + variants with SKU, searched by name or SKU. */
export function searchLineProducts(store: string | null, q: string) {
  const needle = q.trim().toLowerCase();
  const cat = catalog(store);
  const out: Array<{ product_id: number; variant_id: number | null; name: string; sku: string; display_cost: string; cost: string }> = [];
  for (const p of cat.products) {
    if (p.is_serialized || p.is_bundle || p.is_auction || p.archived_at) continue;
    const variants = cat.variants.filter((v) => v.product_id === p.id);
    const units = variants.length ? variants.map((v) => ({ variant_id: v.id as number | null, sku: v.sku, label: `${p.name} — ${v.sku}` })) : [{ variant_id: null, sku: p.sku, label: p.name }];
    for (const u of units) {
      if (needle && !u.label.toLowerCase().includes(needle) && !u.sku.toLowerCase().includes(needle)) continue;
      const cost = Number(p.cost_price ?? Number(p.price) * 0.6).toFixed(2);
      out.push({ product_id: p.id, variant_id: u.variant_id, name: u.label, sku: u.sku, cost, display_cost: displayMoney(Number(cost)) });
      if (out.length >= 20) return out;
    }
  }
  return out;
}

export function formOptions(store: string | null) {
  return {
    multi_location: multiLocationEnabled(store),
    locations: listLocationRefs(store).filter((l) => l.is_active).map((l) => ({ id: l.id, name: l.name })),
    suppliers: procurementState(store).suppliers.filter((s) => s.is_active).map((s) => ({ id: s.id, name: s.name })),
  };
}
