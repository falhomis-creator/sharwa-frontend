import type { MockResult } from "@/lib/bff/mock-route";
import { addDecimal, compareDecimal, subDecimal } from "@/lib/decimal";
import { includesNormalized } from "@/lib/i18n/normalize";
import { seeded } from "@/mocks/_fixtures";
import { approvalsState, createApproval } from "@/mocks/approvals/state";
import { toVariant } from "@/mocks/catalog/products";
import { catalog } from "@/mocks/catalog/state";
import type { MockProduct, MockVariant } from "@/mocks/catalog/seed";
import { isEmptyStore } from "@/mocks/empty-store";
import { listLocationRefs, multiLocationEnabled } from "@/mocks/locations/state";
import { ordersState } from "@/mocks/orders/state";
import { FIXTURE_NOW, nextId, seedOf, storeState } from "@/mocks/store-state";

/**
 * The stock ledger (M21 `StockMovement`, append-only) and per-location quantities (M22
 * `LocationInventory`) over the catalogue fixture. ONE chain of truth (M21 FR-21.03):
 * `LocationInventory → ProductVariant.stock → Product.stock`. The catalogue's own `stock`
 * stays the source when multi-location is off; when it is on, the location rows are the
 * source and the catalogue stock is their sum.
 *
 * Shared by M21 (the inventory table, the ledger, adjustments), M22 (the location's
 * inventory tab), M24 (`refund_restock`), M06 (`sale` / `cancel_restock`) and M23.
 */
export const MOVEMENT_REASONS = ["sale", "cancel_restock", "refund_restock", "manual_adjust", "restock", "po_received"] as const;
export type MovementReason = (typeof MOVEMENT_REASONS)[number];
export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
  sale: "بيع",
  cancel_restock: "إعادة بعد إلغاء",
  refund_restock: "إعادة بعد استرجاع",
  manual_adjust: "تعديل يدوي",
  restock: "إعادة تعبئة",
  po_received: "استلام أمر شراء",
};
/** The reasons a person may pick (M21 FR-21.04/05). */
export const MANUAL_MOVEMENT_REASONS = ["manual_adjust", "restock"] as const;

export interface MockLocationInventory {
  product_id: number;
  variant_id: number | null;
  location_id: number;
  quantity_on_hand: string;
  quantity_reserved: string;
  quarantine_quantity: string;
  reorder_point: string;
}

export interface MockMovement {
  id: number;
  product_id: number;
  variant_id: number | null;
  location_id: number | null;
  delta: string; // signed, 3 decimals
  quantity_after: string;
  reason: MovementReason;
  note: string | null;
  reference: { type: "order" | "return" | "purchase_order" | "approval"; id: number; label: string } | null;
  actor: string;
  created_at: string;
}

export interface MockReservation {
  id: number;
  product_id: number;
  variant_id: number | null;
  location_id: number | null;
  quantity: string;
  status: "active" | "consumed" | "released";
  reference: { type: "order" | "cart" | "b2b_draft"; id: number | string; label: string };
  created_at: string;
}

export interface MockInventoryItem {
  id: number;
  product_id: number;
  serial_number: string;
  status: "available" | "reserved" | "sold";
  location_id: number | null;
  order_id: number | null;
}

interface InventoryState {
  rows: MockLocationInventory[];
  movements: MockMovement[];
  reservations: MockReservation[];
  items: MockInventoryItem[];
}

const q3 = (n: number | string) => Number(n).toFixed(3);
const at = (hoursAgo: number) => new Date(FIXTURE_NOW - hoursAgo * 3_600_000).toISOString();

function seed(store: string | null): InventoryState {
  const state: InventoryState = { rows: [], movements: [], reservations: [], items: [] };
  if (isEmptyStore(store)) return state;
  const rnd = seeded(seedOf(store) + 21);
  const cat = catalog(store);
  const locations = listLocationRefs(store).filter((l) => l.is_active && l.id !== 6); // the dropship supplier holds nothing
  const stockLocations = locations.slice(0, 3); // WH-01, BR-RUH-01, BR-JED-02
  let mid = 0;
  const movement = (m: Omit<MockMovement, "id">) => {
    mid++;
    state.movements.push({ id: mid, ...m });
  };

  for (const p of cat.products) {
    const variants = cat.variants.filter((v) => v.product_id === p.id);
    const units: Array<{ variant: MockVariant | null; stock: string }> = variants.length ? variants.map((v) => ({ variant: v, stock: v.stock })) : [{ variant: null, stock: p.stock }];
    for (const u of units) {
      const total = Number(u.stock);
      // Split the catalogue stock across the three stocking locations (60 / 25 / 15 %).
      const shares = [0.6, 0.25, 0.15];
      let left = total;
      stockLocations.forEach((loc, i) => {
        const part = i === stockLocations.length - 1 ? left : Math.floor(total * shares[i]!);
        left -= part;
        const reserved = part > 3 && rnd() < 0.3 ? Math.min(part, Math.ceil(rnd() * 2)) : 0;
        const quarantine = part > 5 && rnd() < 0.12 ? 1 : 0;
        state.rows.push({
          product_id: p.id,
          variant_id: u.variant?.id ?? null,
          location_id: loc.id,
          quantity_on_hand: q3(part),
          quantity_reserved: q3(reserved),
          quarantine_quantity: q3(quarantine),
          reorder_point: q3(p.low_stock_threshold ?? 3),
        });
      });
    }
  }

  // A ledger of recent movements: sales from the order fixture, a few manual ones.
  const orders = [...ordersState(store).orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 40);
  for (const o of orders) {
    for (const line of o.lines) {
      if (!line.product_id) continue;
      const p = cat.products.find((x) => x.id === line.product_id);
      if (!p) continue;
      movement({
        product_id: p.id,
        variant_id: null,
        location_id: line.location_id,
        delta: `-${q3(line.quantity)}`,
        quantity_after: q3(Number(p.stock)),
        reason: o.status === "cancelled" ? "cancel_restock" : "sale",
        note: null,
        reference: { type: "order", id: o.id, label: `#${o.id}` },
        actor: "النظام",
        created_at: o.created_at,
      });
      if (o.status === "refunded") {
        movement({ product_id: p.id, variant_id: null, location_id: line.location_id, delta: q3(line.quantity), quantity_after: q3(Number(p.stock) + Number(line.quantity)), reason: "refund_restock", note: null, reference: { type: "return", id: o.id, label: `استرجاع #${o.id}` }, actor: "النظام", created_at: o.created_at });
      }
    }
  }
  const manual = cat.products.slice(0, 6);
  manual.forEach((p, i) => {
    movement({ product_id: p.id, variant_id: null, location_id: 1, delta: q3(12 + i * 3), quantity_after: q3(Number(p.stock)), reason: i % 2 ? "restock" : "po_received", note: i % 2 ? "شحنة المورد الأسبوعية" : null, reference: i % 2 ? null : { type: "purchase_order", id: 30 + i, label: `PO-${30 + i}` }, actor: i % 2 ? "خالد المطيري" : "النظام", created_at: at(20 + i * 7) });
  });
  movement({ product_id: manual[1]!.id, variant_id: null, location_id: 2, delta: "-2.000", quantity_after: q3(Number(manual[1]!.stock)), reason: "manual_adjust", note: "عبوتان مفتوحتان للعرض", reference: null, actor: "سارة الحربي", created_at: at(5) });
  state.movements.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Active reservations: the open orders' lines.
  let rid = 0;
  for (const o of orders.filter((x) => x.status === "new" || x.status === "awaiting_payment").slice(0, 8)) {
    for (const line of o.lines.slice(0, 1)) {
      if (!line.product_id) continue;
      rid++;
      state.reservations.push({ id: rid, product_id: line.product_id, variant_id: null, location_id: line.location_id, quantity: q3(line.quantity), status: "active", reference: { type: "order", id: o.id, label: `#${o.id}` }, created_at: o.created_at });
    }
  }
  state.reservations.push({ id: ++rid, product_id: manual[0]!.id, variant_id: null, location_id: 1, quantity: "1.000", status: "released", reference: { type: "cart", id: "c-8f21", label: "سلة متروكة" }, created_at: at(40) });
  state.reservations.push({ id: ++rid, product_id: manual[2]!.id, variant_id: null, location_id: 1, quantity: "5.000", status: "consumed", reference: { type: "b2b_draft", id: 17, label: "مسودة جملة #17" }, created_at: at(90) });

  // Serialised units for the serialised products.
  let iid = 0;
  for (const p of cat.products.filter((x) => x.is_serialized)) {
    const n = Math.max(3, Math.round(Number(p.stock)));
    for (let i = 0; i < n + 2; i++) {
      iid++;
      state.items.push({ id: iid, product_id: p.id, serial_number: `SN-${p.id}-${String(1000 + i)}`, status: i >= n ? "sold" : i === 0 ? "reserved" : "available", location_id: i % 3 === 2 ? 2 : 1, order_id: i >= n ? orders[i % orders.length]?.id ?? null : null });
    }
  }
  return state;
}

export function inventoryState(store: string | null): InventoryState {
  return storeState(store, "inventory", () => seed(store));
}

const available = (r: MockLocationInventory) => subDecimal(subDecimal(r.quantity_on_hand, r.quantity_reserved, 3), r.quarantine_quantity, 3);

/** Location rows for one unit (M22 US-22.4) or all units of a location. */
export function locationRows(store: string | null, locationId: number): Array<MockLocationInventory & { quantity_available: string }> {
  return inventoryState(store)
    .rows.filter((r) => r.location_id === locationId)
    .map((r) => ({ ...r, quantity_available: available(r) }));
}

export function unitRows(store: string | null, productId: number, variantId: number | null): Array<MockLocationInventory & { quantity_available: string }> {
  return inventoryState(store)
    .rows.filter((r) => r.product_id === productId && r.variant_id === variantId)
    .map((r) => ({ ...r, quantity_available: available(r) }));
}

export function productOf(store: string | null, productId: number): { product: MockProduct | undefined; variants: MockVariant[] } {
  const cat = catalog(store);
  const product = cat.products.find((p) => p.id === productId);
  return { product, variants: cat.variants.filter((v) => v.product_id === productId) };
}

/**
 * `POST /api/v1/inventory/adjustments/` `{product_id, variant_id?, location_id?, delta?, new_quantity?, reason, note}`
 * → `{stock, movement_id}` (M21 US-21.2). Writes the ledger, the location row (when
 * multi-location) and mirrors the new total onto the catalogue so M04/M09 agree.
 */
export function adjustStock(
  store: string | null,
  body: Record<string, unknown>,
  actor: string,
  reference: MockMovement["reference"] = null,
): MockResult<{ stock: string; location_stock: string | null; movement_id: number; quantity_available: string | null }> {
  const productId = Number(body.product_id);
  const variantId = body.variant_id ? Number(body.variant_id) : null;
  const { product, variants } = productOf(store, productId);
  if (!product) return { ok: false, status: 404, body: { detail: "المنتج غير موجود." } };
  const variant = variantId ? variants.find((v) => v.id === variantId) : undefined;
  if (variantId && !variant) return { ok: false, status: 404, body: { detail: "المتغير غير موجود." } };
  if (variants.length && !variant) return { ok: false, status: 400, body: { variant_id: ["المخزون يُدار على المتغيرات — حدد المتغير."] } };
  const reason = String(body.reason ?? "");
  const manual = (MANUAL_MOVEMENT_REASONS as readonly string[]).includes(reason);
  const system = (MOVEMENT_REASONS as readonly string[]).includes(reason) && !manual;
  if (!manual && !(system && reference)) return { ok: false, status: 400, body: { reason: ["السبب يجب أن يكون manual_adjust أو restock."] } };
  if (product.is_serialized) return { ok: false, status: 400, body: { detail: "المنتجات المسلسلة تُدار بالوحدات." } };
  if (product.is_bundle) return { ok: false, status: 400, body: { detail: "مخزون الحزمة محسوب من المكوّنات." } };
  if (product.is_auction) return { ok: false, status: 400, body: { detail: "مخزون المزاد ثابت على 1." } };

  const multi = multiLocationEnabled(store);
  const locationId = body.location_id ? Number(body.location_id) : null;
  if (multi && !locationId) return { ok: false, status: 400, body: { location_id: ["حدد الموقع."] } };
  const current = multi
    ? inventoryState(store).rows.find((r) => r.product_id === productId && r.variant_id === (variant?.id ?? null) && r.location_id === locationId)
    : null;
  if (multi && !current) return { ok: false, status: 400, body: { location_id: ["لا مخزون لهذا المنتج في الموقع — عيّنه من صفحة الموقع."] } };
  const base = multi ? current!.quantity_on_hand : variant ? variant.stock : product.stock;

  let delta: string;
  if (body.new_quantity !== undefined && body.new_quantity !== null && body.new_quantity !== "") {
    const nq = String(body.new_quantity);
    if (!/^-?\d+(\.\d{1,3})?$/.test(nq)) return { ok: false, status: 400, body: { new_quantity: ["الكمية رقم حتى 3 خانات عشرية."] } };
    delta = subDecimal(q3(nq), q3(base), 3);
  } else {
    const d = String(body.delta ?? "");
    if (!/^[+-]?\d+(\.\d{1,3})?$/.test(d)) return { ok: false, status: 400, body: { delta: ["الفرق رقم حتى 3 خانات عشرية."] } };
    delta = q3(d);
  }
  if (Number(delta) === 0) return { ok: false, status: 400, body: { delta: ["لا تغيير في الكمية."] } };
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (manual && Number(delta) < 0 && !note) return { ok: false, status: 400, body: { note: ["الملاحظة مطلوبة عند تخفيض الكمية."] } };
  const after = addDecimal(q3(base), delta, 3);
  if (compareDecimal(after, "0") < 0 && !product.allow_backorder) return { ok: false, status: 400, body: { delta: ["الكمية لا يمكن أن تصبح سالبة."] } };

  // Apply: location row (if any) and the catalogue mirror.
  if (current) current.quantity_on_hand = after;
  if (variant) variant.stock = multi ? q3(inventoryState(store).rows.filter((r) => r.variant_id === variant.id).reduce((s, r) => s + Number(r.quantity_on_hand), 0)) : after;
  const totalForProduct = variants.length
    ? q3(variants.reduce((s, v) => s + Number(v.stock), 0))
    : multi
      ? q3(inventoryState(store).rows.filter((r) => r.product_id === productId && r.variant_id === null).reduce((s, r) => s + Number(r.quantity_on_hand), 0))
      : after;
  product.stock = totalForProduct;
  product.updated_at = new Date().toISOString();
  const movement: MockMovement = {
    id: nextId(store, "stock-movement", 10_000),
    product_id: productId,
    variant_id: variant?.id ?? null,
    location_id: locationId,
    delta,
    quantity_after: after,
    reason: reason as MovementReason,
    note: note || null,
    reference,
    actor,
    created_at: new Date().toISOString(),
  };
  inventoryState(store).movements.unshift(movement);
  return { ok: true, data: { stock: product.stock, location_stock: current ? current.quantity_on_hand : null, movement_id: movement.id, quantity_available: current ? available(current) : null } };
}

/** `PATCH /api/v1/locations/<id>/inventory/<unit>/` `{reorder_point?, quarantine_quantity?}` (M22 §7). */
export function patchLocationRow(
  store: string | null,
  locationId: number,
  productId: number,
  variantId: number | null,
  body: Record<string, unknown>,
): MockResult<MockLocationInventory & { quantity_available: string }> {
  let row = inventoryState(store).rows.find((r) => r.location_id === locationId && r.product_id === productId && r.variant_id === variantId);
  if (!row) {
    const { product } = productOf(store, productId);
    if (!product) return { ok: false, status: 404, body: { detail: "المنتج غير موجود." } };
    row = { product_id: productId, variant_id: variantId, location_id: locationId, quantity_on_hand: "0.000", quantity_reserved: "0.000", quarantine_quantity: "0.000", reorder_point: q3(product.low_stock_threshold ?? 3) };
    inventoryState(store).rows.push(row);
  }
  for (const key of ["reorder_point", "quarantine_quantity"] as const) {
    if (body[key] === undefined) continue;
    const v = String(body[key]);
    if (!/^\d+(\.\d{1,3})?$/.test(v)) return { ok: false, status: 400, body: { [key]: ["رقم حتى 3 خانات عشرية."] } };
    row[key] = q3(v);
  }
  if (compareDecimal(available(row), "0") < 0) return { ok: false, status: 400, body: { quarantine_quantity: ["الحجر يتجاوز الكمية الفعلية."] } };
  return { ok: true, data: { ...row, quantity_available: available(row) } };
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// M21 read models (T117): the table, the ledger, the units, the reservations, the counters,
// the write-off requests. All over the state above; nothing here mutates stock except
// `adjustStock` (above) and the approval flow (M18) once a write-off is approved.
// ─────────────────────────────────────────────────────────────────────────────────────────

export type StockStatus = "in_stock" | "low" | "out" | "backorder";

export interface InventoryLocationCell {
  on_hand: string;
  reserved: string;
  quarantine: string;
  available: string;
}

export interface InventoryUnitRow {
  product_id: number;
  variant_id: number | null;
  name: string;
  variant_label: string | null;
  sku: string;
  barcode: string | null;
  unit: string;
  stock: string;
  low_stock_threshold: number;
  allow_backorder: boolean;
  is_serialized: boolean;
  is_bundle: boolean;
  is_auction: boolean;
  category_id: number | null;
  cost_price: string | null;
  price: string;
  status: StockStatus;
  location: InventoryLocationCell | null;
  reserved_total: string;
}

export interface InventoryProductRow extends InventoryUnitRow {
  variants: InventoryUnitRow[];
}

export interface InventoryListResponse {
  count: number;
  page: number;
  page_size: number;
  multi_location: boolean;
  source: "location" | "catalog";
  results: InventoryProductRow[];
}

function statusOf(stock: string, threshold: number, allowBackorder: boolean): StockStatus {
  const n = Number(stock);
  if (n <= 0) return allowBackorder ? "backorder" : "out";
  if (n <= threshold) return "low";
  return "in_stock";
}

function cellFor(store: string | null, productId: number, variantId: number | null, locationId: number | null): InventoryLocationCell | null {
  if (!locationId) return null;
  const row = inventoryState(store).rows.find((r) => r.product_id === productId && r.variant_id === variantId && r.location_id === locationId);
  if (!row) return null;
  return { on_hand: row.quantity_on_hand, reserved: row.quantity_reserved, quarantine: row.quarantine_quantity, available: available(row) };
}

function reservedTotal(store: string | null, productId: number, variantId: number | null): string {
  return q3(
    inventoryState(store)
      .reservations.filter((r) => r.status === "active" && r.product_id === productId && r.variant_id === variantId)
      .reduce((s, r) => s + Number(r.quantity), 0),
  );
}

function unitRow(store: string | null, p: MockProduct, v: MockVariant | null, locationId: number | null): InventoryUnitRow {
  const cat = catalog(store);
  const cell = cellFor(store, p.id, v?.id ?? null, locationId);
  const threshold = p.low_stock_threshold ?? 3;
  const stock = cell ? cell.available : v ? v.stock : p.stock;
  return {
    product_id: p.id,
    variant_id: v?.id ?? null,
    name: p.name,
    variant_label: v ? toVariant(cat, p, v).label : null,
    sku: v ? v.sku : p.sku,
    barcode: v ? null : p.barcode || null,
    unit: p.unit,
    stock: v ? v.stock : p.stock,
    low_stock_threshold: threshold,
    allow_backorder: p.allow_backorder,
    is_serialized: p.is_serialized,
    is_bundle: p.is_bundle,
    is_auction: p.is_auction,
    category_id: p.category_id,
    cost_price: p.cost_price,
    price: p.price,
    status: statusOf(stock, threshold, p.allow_backorder),
    location: cell,
    reserved_total: reservedTotal(store, p.id, v?.id ?? null),
  };
}

/** `GET /api/v1/inventory/?q&status&location&category&is_serialized&page&page_size` (M21 §7). */
export function listInventory(store: string | null, params: URLSearchParams): InventoryListResponse {
  const cat = catalog(store);
  const multi = multiLocationEnabled(store);
  const locationId = multi && params.get("location") ? Number(params.get("location")) : null;
  const q = (params.get("q") ?? "").trim();
  const status = params.get("status") as StockStatus | null;
  const category = params.get("category") ? Number(params.get("category")) : null;
  const serialized = params.get("is_serialized");
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(params.get("page_size") ?? 50) || 50));

  const rows: InventoryProductRow[] = [];
  for (const p of cat.products.filter((x) => !x.archived_at)) {
    if (category && p.category_id !== category) continue;
    if (serialized === "true" && !p.is_serialized) continue;
    if (serialized === "false" && p.is_serialized) continue;
    const variants = cat.variants.filter((v) => v.product_id === p.id);
    const parent = unitRow(store, p, null, locationId);
    const children = variants.map((v) => unitRow(store, p, v, locationId));
    if (variants.length) {
      // The parent shows the sum; its status follows the worst variant.
      const sum = (pick: (r: InventoryUnitRow) => string) => q3(children.reduce((s, r) => s + Number(pick(r)), 0));
      parent.stock = sum((r) => r.stock);
      if (locationId) {
        const cells = children.map((r) => r.location).filter((c): c is InventoryLocationCell => Boolean(c));
        parent.location = cells.length
          ? { on_hand: q3(cells.reduce((s, c) => s + Number(c.on_hand), 0)), reserved: q3(cells.reduce((s, c) => s + Number(c.reserved), 0)), quarantine: q3(cells.reduce((s, c) => s + Number(c.quarantine), 0)), available: q3(cells.reduce((s, c) => s + Number(c.available), 0)) }
          : null;
      }
      const order: StockStatus[] = ["out", "backorder", "low", "in_stock"];
      parent.status = order.find((s) => children.some((c) => c.status === s)) ?? "in_stock";
      parent.reserved_total = sum((r) => r.reserved_total);
    }
    const haystack = [p.name, p.sku, p.barcode, ...children.map((c) => c.sku)];
    if (q && !haystack.some((h) => h && includesNormalized(h, q))) continue;
    if (status) {
      const anyMatch = parent.status === status || children.some((c) => c.status === status);
      if (!anyMatch) continue;
    }
    rows.push({ ...parent, variants: children });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const start = (page - 1) * pageSize;
  return { count: rows.length, page, page_size: pageSize, multi_location: multi, source: locationId ? "location" : "catalog", results: rows.slice(start, start + pageSize) };
}

export function inventoryCounters(store: string | null): { low: number; out: number; backorder: number; in_stock: number; pending_writeoffs: number } {
  const all = listInventory(store, new URLSearchParams({ page_size: "100", page: "1" }));
  // Count products by their own status (the parent row), across every page.
  const everything = listInventory(store, new URLSearchParams({ page_size: "100" }));
  const total = everything.count;
  const pages = Math.ceil(total / 100);
  const statuses: StockStatus[] = [];
  for (let p = 1; p <= pages; p++) {
    const res = p === 1 ? all : listInventory(store, new URLSearchParams({ page_size: "100", page: String(p) }));
    statuses.push(...res.results.map((r) => r.status));
  }
  const count = (s: StockStatus) => statuses.filter((x) => x === s).length;
  return {
    low: count("low"),
    out: count("out"),
    backorder: count("backorder"),
    in_stock: count("in_stock"),
    pending_writeoffs: approvalsState(store).items.filter((a) => a.request_type === "stock_writeoff" && a.status === "pending").length,
  };
}

export interface MovementRow {
  id: number;
  product_id: number;
  product_name: string;
  variant_id: number | null;
  variant_label: string | null;
  location_id: number | null;
  location_name: string | null;
  delta: string;
  quantity_after: string;
  reason: MovementReason;
  note: string | null;
  reference: MockMovement["reference"];
  actor: string;
  created_at: string;
}

function decorateMovement(store: string | null, m: MockMovement): MovementRow {
  const cat = catalog(store);
  const p = cat.products.find((x) => x.id === m.product_id);
  const v = m.variant_id ? cat.variants.find((x) => x.id === m.variant_id) : undefined;
  const loc = m.location_id ? listLocationRefs(store).find((l) => l.id === m.location_id) : undefined;
  return {
    id: m.id,
    product_id: m.product_id,
    product_name: p?.name ?? `منتج #${m.product_id}`,
    variant_id: m.variant_id,
    variant_label: p && v ? toVariant(cat, p, v).label : null,
    location_id: m.location_id,
    location_name: loc?.name ?? null,
    delta: m.delta,
    quantity_after: m.quantity_after,
    reason: m.reason,
    note: m.note,
    reference: m.reference,
    actor: m.actor,
    created_at: m.created_at,
  };
}

/** `GET /api/v1/inventory/movements/?product&variant&location&reason&from&to&page` (M21 US-21.3). */
export function listMovements(store: string | null, params: URLSearchParams): { count: number; net_delta: string; results: MovementRow[] } {
  const product = params.get("product") ? Number(params.get("product")) : null;
  const variant = params.get("variant") ? Number(params.get("variant")) : null;
  const location = params.get("location") ? Number(params.get("location")) : null;
  const reason = params.get("reason");
  const from = params.get("from");
  const to = params.get("to");
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(params.get("page_size") ?? 50) || 50));
  const all = inventoryState(store).movements.filter((m) => {
    if (product && m.product_id !== product) return false;
    if (variant && m.variant_id !== variant) return false;
    if (location && m.location_id !== location) return false;
    if (reason && m.reason !== reason) return false;
    if (from && m.created_at.slice(0, 10) < from) return false;
    if (to && m.created_at.slice(0, 10) > to) return false;
    return true;
  });
  const net = q3(all.reduce((s, m) => s + Number(m.delta), 0));
  const start = (page - 1) * pageSize;
  return { count: all.length, net_delta: net, results: all.slice(start, start + pageSize).map((m) => decorateMovement(store, m)) };
}

export interface ItemRow extends MockInventoryItem {
  product_name: string;
  location_name: string | null;
}

/** `GET /api/v1/inventory/items/?product&status&q` (US-21.5). */
export function listItems(store: string | null, params: URLSearchParams): { count: number; results: ItemRow[] } {
  const cat = catalog(store);
  const product = params.get("product") ? Number(params.get("product")) : null;
  const status = params.get("status");
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const refs = listLocationRefs(store);
  const results = inventoryState(store)
    .items.filter((i) => (!product || i.product_id === product) && (!status || i.status === status) && (!q || i.serial_number.toLowerCase().includes(q)))
    .map((i) => ({ ...i, product_name: cat.products.find((p) => p.id === i.product_id)?.name ?? `منتج #${i.product_id}`, location_name: refs.find((l) => l.id === i.location_id)?.name ?? null }));
  return { count: results.length, results };
}

export interface ReservationRow extends MockReservation {
  product_name: string;
  variant_label: string | null;
  location_name: string | null;
}

/** `GET /api/v1/inventory/reservations/?status&product` (US-21.6). */
export function listReservations(store: string | null, params: URLSearchParams): { count: number; results: ReservationRow[] } {
  const cat = catalog(store);
  const status = params.get("status");
  const product = params.get("product") ? Number(params.get("product")) : null;
  const refs = listLocationRefs(store);
  const results = inventoryState(store)
    .reservations.filter((r) => (!status || r.status === status) && (!product || r.product_id === product))
    .map((r) => {
      const p = cat.products.find((x) => x.id === r.product_id);
      const v = r.variant_id ? cat.variants.find((x) => x.id === r.variant_id) : undefined;
      return { ...r, product_name: p?.name ?? `منتج #${r.product_id}`, variant_label: p && v ? toVariant(cat, p, v).label : null, location_name: refs.find((l) => l.id === r.location_id)?.name ?? null };
    });
  return { count: results.length, results };
}

/** CSV of the current table filter (FR-21.11) — the same rows the page shows. */
export function inventoryCsv(store: string | null, params: URLSearchParams): string {
  const p = new URLSearchParams(params);
  p.set("page_size", "100");
  const header = ["product_id", "variant_id", "name", "variant", "sku", "unit", "stock", "low_stock_threshold", "status"];
  const lines = [header.join(",")];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  let page = 1;
  for (;;) {
    p.set("page", String(page));
    const res = listInventory(store, p);
    for (const r of res.results) {
      const units = r.variants.length ? r.variants : [r];
      for (const u of units) lines.push([u.product_id, u.variant_id ?? "", u.name, u.variant_label ?? "", u.sku, u.unit, u.stock, u.low_stock_threshold, u.status].map(esc).join(","));
    }
    if (page * res.page_size >= res.count) break;
    page++;
  }
  return "﻿" + lines.join("\n");
}

export interface WriteoffRow {
  id: number;
  status: "pending" | "approved" | "rejected";
  product_id: number;
  product_name: string;
  variant_id: number | null;
  variant_label: string | null;
  location_id: number | null;
  location_name: string | null;
  quantity: string;
  note: string;
  requester_name: string;
  created_at: string;
  decided_at: string | null;
}

function writeoffRow(store: string | null, a: ReturnType<typeof approvalsState>["items"][number]): WriteoffRow {
  const cat = catalog(store);
  const pl = a.payload as { product_id?: number; product_name?: string; variant_id?: number | null; variant_label?: string | null; location_id?: number | null; quantity?: string; note?: string };
  const refs = listLocationRefs(store);
  return {
    id: a.id,
    status: a.status,
    product_id: Number(pl.product_id ?? 0),
    product_name: pl.product_name ?? cat.products.find((p) => p.id === pl.product_id)?.name ?? "",
    variant_id: pl.variant_id ?? null,
    variant_label: pl.variant_label ?? null,
    location_id: pl.location_id ?? null,
    location_name: pl.location_id ? (refs.find((l) => l.id === pl.location_id)?.name ?? null) : null,
    quantity: q3(pl.quantity ?? 0),
    note: pl.note ?? "",
    requester_name: a.requester_name,
    created_at: a.created_at,
    decided_at: a.decided_at,
  };
}

export function listWriteoffs(store: string | null): { count: number; results: WriteoffRow[] } {
  const rows = approvalsState(store).items.filter((a) => a.request_type === "stock_writeoff").map((a) => writeoffRow(store, a));
  return { count: rows.length, results: rows };
}

/** `POST /api/v1/approvals/` `{request_type: stock_writeoff, product_id, variant_id?, location_id?, quantity, note}` (US-21.7). */
export function requestWriteoff(
  store: string | null,
  body: Record<string, unknown>,
  requester: { id: number | null; name: string },
): MockResult<WriteoffRow> {
  const productId = Number(body.product_id);
  const { product, variants } = productOf(store, productId);
  if (!product) return { ok: false, status: 404, body: { product_id: ["المنتج غير موجود."] } };
  const variantId = body.variant_id ? Number(body.variant_id) : null;
  const variant = variantId ? variants.find((v) => v.id === variantId) : undefined;
  if (variants.length && !variant) return { ok: false, status: 400, body: { variant_id: ["حدد المتغير."] } };
  const qty = String(body.quantity ?? "");
  if (!/^\d+(\.\d{1,3})?$/.test(qty) || Number(qty) <= 0) return { ok: false, status: 400, body: { quantity: ["أدخل كمية أكبر من صفر."] } };
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!note) return { ok: false, status: 400, body: { note: ["الملاحظة مطلوبة لطلب الإعدام."] } };
  const multi = multiLocationEnabled(store);
  const locationId = body.location_id ? Number(body.location_id) : null;
  if (multi && !locationId) return { ok: false, status: 400, body: { location_id: ["حدد الموقع."] } };
  const available = multi ? (cellFor(store, productId, variant?.id ?? null, locationId)?.on_hand ?? "0.000") : variant ? variant.stock : product.stock;
  if (compareDecimal(q3(qty), q3(available)) > 0) return { ok: false, status: 400, body: { quantity: [`الكمية تتجاوز المتاح (${q3(available)}).`] } };
  const cat = catalog(store);
  const label = variant ? toVariant(cat, product, variant).label : null;
  const a = createApproval(store, {
    request_type: "stock_writeoff",
    payload: { product_id: productId, product_name: product.name, variant_id: variant?.id ?? null, variant_label: label, location_id: locationId, quantity: q3(qty), note },
    summary: `إعدام ${q3(qty)} × ${product.name}${label ? ` (${label})` : ""} — ${note}`,
    entity: { kind: "product", id: productId, label: product.name, available: true },
    requester_id: requester.id,
    requester_name: requester.name,
  });
  return { ok: true, status: 201, data: writeoffRow(store, a) };
}
