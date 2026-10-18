import { addDecimal, compareDecimal, mulDecimal } from "@/lib/decimal";
import { includesNormalized } from "@/lib/i18n/normalize";
import type { MockResult } from "@/lib/bff/mock-route";
import { displayMoney, int, pick, seeded } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, nextId, seedOf, storeState } from "@/mocks/store-state";
import { catalog } from "@/mocks/catalog/state";
import { ordersState, type MockLine, type MockOrder } from "@/mocks/orders/state";
import { listLocationRefs } from "@/mocks/locations/state";
import { adjustStock } from "@/mocks/inventory/state";
import { appendWalletTransaction, walletByPhone } from "@/mocks/wallets/state";

/**
 * M24 fixture state. Two families:
 * - Ready rows (`/api/v1/returns/*`, `/api/v1/warehouse/returns/*`) answered by the
 *   passthrough fixtures in `./passthrough.ts` with EXACTLY the §7 shapes;
 * - `[NEEDS BACKEND]` rows (RMA list/detail, the legacy `OrderRefund` log) answered by
 *   `mockRoute` adapters under `/api/bff/{returns,orders/refunds}`.
 *
 * Orders come from the M06 fixture: each order line is treated as a `FulfillmentItem`
 * (id = line id). Only `completed` orders are returnable (`refunded` ones answer with
 * `remaining=0`); any other order has no fulfilment items yet → `items/` answers `[]`.
 *
 * Fixture behaviours the checks rely on:
 * - the FIRST seeded `requested` return is `refund_method=cash` on location 2 → approving it
 *   there answers 400 `{detail: "CashLiquidityError: …"}` (another location succeeds);
 * - the SECOND seeded `requested` return is «contended»: the first decision from a browser
 *   meets a concurrent edit (the server version moves on) → 409; the passthrough marks that
 *   browser with a mock cookie so its «تحديث ثم إعادة المحاولة» then succeeds, while every
 *   fresh browser (each visual-check viewport) sees the conflict again.
 */

export const RETURN_STATUSES = ["requested", "approved", "rejected", "processing", "completed"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export const RETURN_REFUND_METHODS = ["original_payment", "cash", "wallet", "store_credit"] as const;
export type ReturnRefundMethod = (typeof RETURN_REFUND_METHODS)[number];
export const RMA_REASONS = ["customer_rejected", "damaged", "wrong_item", "bundle_partial_return"] as const;
export type RmaReason = (typeof RMA_REASONS)[number];
export const RMA_STATUSES = ["requested", "in_transit_back", "received_at_warehouse", "qa_pending", "restocked", "rejected_disposal", "closed"] as const;
export type RmaStatus = (typeof RMA_STATUSES)[number];
export const FEE_PAYERS = ["customer", "merchant", "platform"] as const;
export type FeePayer = (typeof FEE_PAYERS)[number];
export const QA_DECISIONS = ["restocked", "rejected_disposal"] as const;

const RETURN_REASONS = ["المقاس غير مناسب", "المنتج وصل تالفاً", "وصل صنف غير المطلوب", "لم يعجب العميل", "تأخر التوصيل فرفض العميل"];

interface MockReturnLine {
  id: number;
  fulfillment_item_id: number;
  quantity_returned: number;
  refund_amount_allocated: string;
  restock: boolean;
}

interface MockReturnEvent {
  id: number;
  at: string;
  text: string;
  actor: string | null;
}

interface MockReturn {
  id: number;
  order_id: number;
  reason: string;
  refund_method: ReturnRefundMethod;
  status: ReturnStatus;
  version: number;
  location_id: number | null;
  line_items: MockReturnLine[];
  decision_note: string | null;
  created_at: string;
  updated_at: string;
  events: MockReturnEvent[];
  /** Fixture only: a decision from a new browser meets a concurrent edit (409). */
  contended: boolean;
}

interface MockRma {
  id: number;
  order_id: number;
  fulfillment_item_id: number;
  reason: RmaReason;
  status: RmaStatus;
  fee_payer: FeePayer;
  destination_location_id: number;
  quantity: number;
  created_at: string;
  events: Array<{ to_status: RmaStatus; at: string; actor: string }>;
  restock_movement_id: number | null;
}

interface ReturnsState {
  returns: MockReturn[];
  rmas: MockRma[];
}

const iso = (msAgo: number) => new Date(FIXTURE_NOW - msAgo).toISOString();
const now = () => new Date(Math.max(Date.now(), FIXTURE_NOW + 1000)).toISOString();
const HOUR = 3_600_000;

function lineAmount(line: MockLine, qty: number) {
  return mulDecimal(line.price, String(qty));
}

function seed(store: string | null): ReturnsState {
  const state: ReturnsState = { returns: [], rmas: [] };
  if (isEmptyStore(store)) return state;
  const rnd = seeded(seedOf(store) + 241);
  const completed = ordersState(store).orders.filter((o) => o.status === "completed");
  const plan: ReturnStatus[] = [
    "requested", "requested", "requested", "approved", "requested", "completed", "processing", "rejected",
    "requested", "completed", "approved", "rejected", "requested", "completed", "processing", "completed",
    "approved", "rejected",
  ];
  let lineId = 1;
  let eventId = 1;
  plan.forEach((status, i) => {
    const order = completed[i * 2];
    if (!order) return;
    const id = 5001 + i;
    const hoursAgo = 3 + i * 17 + int(rnd, 0, 6);
    const lines = order.lines.slice(0, Math.min(order.lines.length, i % 3 === 0 ? 2 : 1));
    const items: MockReturnLine[] = lines.map((l) => {
      const qty = Math.max(1, Math.min(Number(l.quantity), int(rnd, 1, 2)));
      return { id: lineId++, fulfillment_item_id: l.id, quantity_returned: qty, refund_amount_allocated: lineAmount(l, qty), restock: i % 4 !== 2 };
    });
    const firstRequested = i === 0;
    const created = iso(hoursAgo * HOUR);
    const r: MockReturn = {
      id,
      order_id: order.id,
      reason: pick(rnd, RETURN_REASONS),
      refund_method: firstRequested ? "cash" : i === 1 ? "wallet" : pick(rnd, RETURN_REFUND_METHODS),
      status,
      version: status === "requested" ? 1 : 2 + (status === "processing" ? 1 : status === "completed" ? 2 : 0),
      location_id: firstRequested ? 2 : (lines[0]?.location_id ?? 1),
      line_items: items,
      decision_note: status === "rejected" ? "تجاوز مدة الإرجاع المسموحة (14 يوماً)." : null,
      created_at: created,
      updated_at: created,
      events: [],
      contended: i === 1,
    };
    const ev = (h: number, text: string, actor: string | null) => r.events.push({ id: eventId++, at: iso(Math.max(0.1, h) * HOUR), text, actor });
    ev(hoursAgo, "أُنشئ طلب الإرجاع.", "سارة الحربي");
    if (status !== "requested") {
      ev(hoursAgo - 1, status === "rejected" ? `رُفض الإرجاع: ${r.decision_note}` : "اعتُمد الإرجاع.", "مالك المتجر");
      r.updated_at = iso(Math.max(0.1, hoursAgo - 1) * HOUR);
    }
    if (status === "processing" || status === "completed") ev(hoursAgo - 1.2, "بدأت معالجة الاسترجاع المالي.", null);
    if (status === "completed") ev(hoursAgo - 2, "اكتمل الاسترجاع وأُعيد المخزون للسطور المحددة.", null);
    r.events.sort((a, b) => b.at.localeCompare(a.at));
    state.returns.push(r);
  });

  // RMAs: from other completed orders, most of them on their way back to the main warehouse.
  const rmaPlan: RmaStatus[] = [
    "in_transit_back", "in_transit_back", "in_transit_back", "qa_pending", "requested", "in_transit_back",
    "restocked", "in_transit_back", "closed", "qa_pending", "in_transit_back", "rejected_disposal",
    "in_transit_back", "requested", "in_transit_back", "closed", "qa_pending", "in_transit_back",
    "restocked", "in_transit_back", "rejected_disposal", "requested", "in_transit_back", "closed",
  ];
  rmaPlan.forEach((status, i) => {
    const order = completed[1 + i * 2] ?? completed[i];
    const line = order?.lines[0];
    if (!order || !line) return;
    const id = 801 + i;
    const hoursAgo = 2 + i * 13 + int(rnd, 0, 5);
    const steps: RmaStatus[] = ["requested"];
    const path: RmaStatus[] =
      status === "closed"
        ? ["in_transit_back", "received_at_warehouse", "qa_pending", i % 2 ? "rejected_disposal" : "restocked", "closed"]
        : status === "restocked" || status === "rejected_disposal"
          ? ["in_transit_back", "received_at_warehouse", "qa_pending", status]
          : status === "qa_pending"
            ? ["in_transit_back", "received_at_warehouse", "qa_pending"]
            : status === "in_transit_back"
              ? ["in_transit_back"]
              : [];
    steps.push(...path);
    const rma: MockRma = {
      id,
      order_id: order.id,
      fulfillment_item_id: line.id,
      reason: i % 7 === 3 ? "bundle_partial_return" : pick(rnd, ["customer_rejected", "customer_rejected", "damaged", "wrong_item"] as const),
      status,
      fee_payer: pick(rnd, FEE_PAYERS),
      // One in-transit RMA is headed to Jeddah: scanning it at the main warehouse is a mismatch.
      destination_location_id: i === 5 ? 3 : 1,
      quantity: Math.min(Number(line.quantity), 1 + (i % 2)),
      created_at: iso(hoursAgo * HOUR),
      events: steps.map((s, k) => ({ to_status: s, at: iso(Math.max(0.1, hoursAgo - k * 6) * HOUR), actor: k === 0 ? "سارة الحربي" : s === "in_transit_back" ? "شركة الشحن" : s === "received_at_warehouse" || s === "qa_pending" ? "خالد المطيري" : "مالك المتجر" })),
      restock_movement_id: null,
    };
    state.rmas.push(rma);
  });
  return state;
}

export function returnsState(store: string | null): ReturnsState {
  return storeState(store, "returns:v2", () => seed(store));
}

// ── Lookups ─────────────────────────────────────────────────────────────────────────

function locationRef(store: string | null, id: number | null) {
  if (id === null) return null;
  const l = listLocationRefs(store).find((x) => x.id === id);
  return l ? { id: l.id, name: l.name } : { id, name: `موقع ${id}` };
}

function orderOf(store: string | null, id: number): MockOrder | undefined {
  return ordersState(store).orders.find((o) => o.id === id);
}

function productDeleted(store: string | null, line: MockLine) {
  if (line.product_id === null) return true;
  return !catalog(store).products.some((p) => p.id === line.product_id);
}

/** Units of a fulfilment item already claimed by a non-rejected return. */
function returnedQty(store: string | null, fulfillmentItemId: number, exceptReturn?: number) {
  let sum = 0;
  for (const r of returnsState(store).returns) {
    if (r.status === "rejected" || r.id === exceptReturn) continue;
    for (const li of r.line_items) if (li.fulfillment_item_id === fulfillmentItemId) sum += li.quantity_returned;
  }
  return sum;
}

function normalizeQuery(q: string) {
  const digits = q.replace(/\D/g, "");
  // A local «0777…» matches the stored international 967/966 forms.
  const intl = digits.startsWith("0") ? [`967${digits.slice(1)}`, `966${digits.slice(1)}`] : [];
  return { text: q.trim(), digits, intl };
}

function matchesQuery(q: ReturnType<typeof normalizeQuery>, fields: { ids: number[]; phone: string; name: string }) {
  if (!q.text) return true;
  if (q.digits && q.digits.length === q.text.replace(/[\s#-]/g, "").length) {
    if (fields.ids.some((id) => String(id).includes(q.digits))) return true;
    if (fields.phone.includes(q.digits) || q.intl.some((p) => fields.phone.startsWith(p))) return true;
    return false;
  }
  return includesNormalized(fields.name, q.text);
}

// ── ReturnRequest views (Ready contract shapes) ─────────────────────────────────────

function totalOf(r: MockReturn) {
  return r.line_items.reduce((acc, l) => addDecimal(acc, l.refund_amount_allocated), "0");
}

function returnListItem(store: string | null, r: MockReturn) {
  const o = orderOf(store, r.order_id);
  return {
    id: r.id,
    order_id: r.order_id,
    customer_name: o?.customer_name ?? "—",
    customer_phone: o?.customer_phone ?? "",
    lines_count: r.line_items.length,
    display_amount: displayMoney(Number(totalOf(r))),
    reason: r.reason,
    refund_method: r.refund_method,
    status: r.status,
    location: locationRef(store, r.location_id),
    version: r.version,
    created_at: r.created_at,
  };
}

export function returnDetail(store: string | null, r: MockReturn) {
  const o = orderOf(store, r.order_id);
  return {
    ...returnListItem(store, r),
    decision_note: r.decision_note,
    updated_at: r.updated_at,
    line_items: r.line_items.map((li) => {
      const line = o?.lines.find((l) => l.id === li.fulfillment_item_id);
      return {
        id: li.id,
        fulfillment_item_id: li.fulfillment_item_id,
        product_id: line?.product_id ?? null,
        product_name: line?.product_name ?? "عنصر محذوف",
        sku: line?.sku ?? null,
        quantity_returned: li.quantity_returned,
        refund_amount_allocated: li.refund_amount_allocated,
        display_refund_amount: displayMoney(Number(li.refund_amount_allocated)),
        restock: li.restock,
        product_deleted: line ? productDeleted(store, line) : true,
      };
    }),
    timeline: r.events.map((e) => ({ id: e.id, at: e.at, text: e.text, actor: e.actor })),
  };
}

export function listReturns(store: string | null, params: URLSearchParams) {
  const status = params.get("status");
  const q = normalizeQuery(params.get("q") ?? "");
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const rows = returnsState(store)
    .returns.filter((r) => !status || r.status === status)
    .filter((r) => {
      const o = orderOf(store, r.order_id);
      return matchesQuery(q, { ids: [r.id, r.order_id], phone: o?.customer_phone ?? "", name: o?.customer_name ?? "" });
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const PAGE = 20;
  const start = (page - 1) * PAGE;
  if (start > 0 && start >= rows.length) return { ok: false as const, status: 404, body: { detail: "صفحة غير صالحة." } };
  const base = `/api/v1/returns/`;
  const link = (p: number) => {
    const sp = new URLSearchParams(params);
    sp.set("page", String(p));
    return `${base}?${sp.toString()}`;
  };
  return {
    ok: true as const,
    data: {
      count: rows.length,
      next: start + PAGE < rows.length ? link(page + 1) : null,
      previous: page > 1 ? link(page - 1) : null,
      results: rows.slice(start, start + PAGE).map((r) => returnListItem(store, r)),
    },
  };
}

export function getReturn(store: string | null, id: number) {
  return returnsState(store).returns.find((r) => r.id === id);
}

/** `GET /api/v1/returns/order/<order_id>/items/`. */
export function returnableItems(store: string | null, orderId: number): MockResult<unknown[]> {
  const o = orderOf(store, orderId);
  if (!o) return { ok: false, status: 404, body: { detail: "الطلب غير موجود." } };
  if (o.status !== "completed" && o.status !== "refunded") return { ok: true, data: [] };
  return {
    ok: true,
    data: o.lines.map((l) => {
      const qty = Number(l.quantity);
      const remaining = o.status === "refunded" ? 0 : Math.max(0, qty - returnedQty(store, l.id));
      return {
        fulfillment_item_id: l.id,
        product_name: l.product_name,
        quantity: qty,
        remaining,
        unit_refund_amount: l.price,
        location_name: locationRef(store, l.location_id)?.name ?? null,
        // Additive fields (not in §7) the screen uses for the «محذوف» badge and the SKU.
        sku: l.sku,
        product_deleted: productDeleted(store, l),
        display_unit_refund_amount: displayMoney(Number(l.price)),
      };
    }),
  };
}

type Body = Record<string, unknown>;

/** `POST /api/v1/returns/` — exactly `{order_id, reason, refund_method, line_items:[…]}`. */
export function createReturn(store: string | null, body: Body, actor: string): MockResult<ReturnType<typeof returnDetail>> {
  const errors: Record<string, unknown> = {};
  const orderId = Number(body.order_id);
  const o = Number.isInteger(orderId) ? orderOf(store, orderId) : undefined;
  if (!o) errors.order_id = ["الطلب غير موجود."];
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3) errors.reason = ["اكتب سبب الإرجاع."];
  const method = String(body.refund_method ?? "") as ReturnRefundMethod;
  if (!(RETURN_REFUND_METHODS as readonly string[]).includes(method)) errors.refund_method = ["اختر طريقة الاسترجاع."];
  const raw = Array.isArray(body.line_items) ? (body.line_items as Body[]) : [];
  if (!raw.length) errors.line_items = ["حدد سطراً واحداً على الأقل."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  if (o!.status !== "completed") return { ok: false, status: 400, body: { detail: "لا عناصر قابلة للإرجاع في هذا الطلب." } };

  let lineErrors = false;
  const perLine = raw.map((li) => {
    const e: Record<string, string[]> = {};
    const line = o!.lines.find((l) => l.id === Number(li.fulfillment_item_id));
    const qty = Number(li.quantity_returned);
    if (!line) e.fulfillment_item_id = ["العنصر لا ينتمي لهذا الطلب."];
    else if (!Number.isInteger(qty) || qty < 1) e.quantity_returned = ["أدخل كمية صحيحة (1 أو أكثر)."];
    else {
      const remaining = Number(line.quantity) - returnedQty(store, line.id);
      if (qty > remaining) e.quantity_returned = [remaining > 0 ? `الكمية تتجاوز المتبقي (${remaining}).` : "أُرجع هذا العنصر بالكامل."];
    }
    if (Object.keys(e).length) lineErrors = true;
    return e;
  });
  if (lineErrors) return { ok: false, status: 400, body: { line_items: perLine } };
  if (method === "wallet" && !walletByPhone(store, o!.customer_phone)) {
    return { ok: false, status: 400, body: { refund_method: ["لا محفظة لهذا العميل — اختر «رصيد متجر» أو أنشئ له محفظة أولاً."] } };
  }

  const at = now();
  const id = nextId(store, "return", 5100);
  const lines: MockReturnLine[] = raw.map((li) => {
    const line = o!.lines.find((l) => l.id === Number(li.fulfillment_item_id))!;
    const qty = Number(li.quantity_returned);
    return { id: nextId(store, "return-line", 900), fulfillment_item_id: line.id, quantity_returned: qty, refund_amount_allocated: lineAmount(line, qty), restock: li.restock === true };
  });
  const firstLine = o!.lines.find((l) => l.id === lines[0]!.fulfillment_item_id);
  const r: MockReturn = {
    id,
    order_id: o!.id,
    reason,
    refund_method: method,
    status: "requested",
    version: 1,
    location_id: firstLine?.location_id ?? null,
    line_items: lines,
    decision_note: null,
    created_at: at,
    updated_at: at,
    events: [{ id: nextId(store, "return-event", 500), at, text: "أُنشئ طلب الإرجاع.", actor }],
    contended: false,
  };
  returnsState(store).returns.unshift(r);
  orderEvent(store, o!, `طلب إرجاع #${id} (${lines.length} سطر) — ${reason}`, actor);
  return { ok: true, status: 201, data: returnDetail(store, r) };
}

/** Feeds the M06 order timeline (FR-24.10): the same `timeline` the order detail renders. */
function orderEvent(store: string | null, o: MockOrder, text: string, actor: string | null) {
  const state = ordersState(store);
  o.timeline.unshift({ id: state.ids.event++, at: now(), kind: "refund", source: "merchant_manual", text, actor });
}

/**
 * Fixture: another member edits the contended request a moment before this decision lands.
 * Returns true when it happened (the caller then answers the stale version with 409).
 */
export function simulateConcurrentEdit(store: string | null, id: number, version: number): boolean {
  const r = getReturn(store, id);
  if (!r || !r.contended || r.status !== "requested" || version !== r.version) return false;
  r.version++;
  r.updated_at = now();
  r.events.unshift({ id: nextId(store, "return-event", 500), at: r.updated_at, text: "عُدِّل سبب الإرجاع.", actor: "خالد المطيري" });
  return true;
}

/** `POST /api/v1/returns/<pk>/approve/` `{decision, version, location_id?}` (+ `note` on reject). */
export function decideReturn(store: string | null, id: number, body: Body, actor: string): MockResult<ReturnType<typeof returnDetail>> {
  const r = getReturn(store, id);
  if (!r) return { ok: false, status: 404, body: { detail: "طلب الإرجاع غير موجود." } };
  const decision = String(body.decision ?? "");
  if (decision !== "approve" && decision !== "reject") return { ok: false, status: 400, body: { decision: ["القرار يجب أن يكون approve أو reject."] } };
  const version = Number(body.version);
  if (!Number.isInteger(version)) return { ok: false, status: 400, body: { version: ["الإصدار مطلوب."] } };
  if (r.status !== "requested") return { ok: false, status: 409, body: { detail: `حُسم هذا الإرجاع من قبل (${r.status}).`, current_version: r.version } };
  if (version !== r.version) return { ok: false, status: 409, body: { detail: "حُدِّث طلب الإرجاع من مستخدم آخر.", current_version: r.version } };
  const o = orderOf(store, r.order_id);

  if (decision === "reject") {
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (note.length < 3) return { ok: false, status: 400, body: { note: ["اكتب سبب الرفض."] } };
    r.status = "rejected";
    r.decision_note = note;
  } else {
    const hasRestock = r.line_items.some((l) => l.restock);
    const locationId = body.location_id === undefined || body.location_id === null || body.location_id === "" ? null : Number(body.location_id);
    if (hasRestock && !locationId) return { ok: false, status: 400, body: { location_id: ["حدد موقع إعادة المخزون."] } };
    if (locationId && !listLocationRefs(store).some((l) => l.id === locationId && l.is_active)) return { ok: false, status: 400, body: { location_id: ["الموقع غير متاح."] } };
    const cashLocation = locationId ?? r.location_id;
    if (r.refund_method === "cash" && cashLocation === 2) {
      return {
        ok: false,
        status: 400,
        body: { detail: `CashLiquidityError: رصيد صندوق «${locationRef(store, 2)?.name}» (${displayMoney(85)}) لا يكفي لصرف ${displayMoney(Number(totalOf(r)))} نقداً.` },
      };
    }
    r.status = "approved";
    if (locationId) r.location_id = locationId;
    // The M21 ledger: one `refund_restock` movement per restocked line (best effort — a
    // line whose product is gone or variant-managed keeps the money refund only).
    if (o) {
      for (const li of r.line_items.filter((l) => l.restock)) {
        const line = o.lines.find((l) => l.id === li.fulfillment_item_id);
        if (!line?.product_id) continue;
        adjustStock(store, { product_id: line.product_id, location_id: r.location_id, delta: String(li.quantity_returned), reason: "refund_restock" }, actor, { type: "return", id: r.id, label: `إرجاع #${r.id}` });
      }
      if (r.refund_method === "wallet") {
        const w = walletByPhone(store, o.customer_phone);
        if (w) appendWalletTransaction(store, w.id, { amount: totalOf(r), reason: "refund", note: `إرجاع #${r.id}`, reference: { type: "refund", id: r.id, label: `إرجاع #${r.id}` }, actor });
      }
    }
  }
  r.version++;
  r.updated_at = now();
  const text = decision === "approve" ? "اعتُمد الإرجاع." : `رُفض الإرجاع: ${r.decision_note}`;
  r.events.unshift({ id: nextId(store, "return-event", 500), at: r.updated_at, text, actor });
  if (o) orderEvent(store, o, `إرجاع #${r.id}: ${decision === "approve" ? "اعتُمد" : "رُفض"}`, actor);
  return { ok: true, data: returnDetail(store, r) };
}

// ── RMA ─────────────────────────────────────────────────────────────────────────────

export function rmaView(store: string | null, rma: MockRma) {
  const o = orderOf(store, rma.order_id);
  const line = o?.lines.find((l) => l.id === rma.fulfillment_item_id);
  return {
    id: rma.id,
    order_id: rma.order_id,
    fulfillment_item: { id: rma.fulfillment_item_id, product_id: line?.product_id ?? null, product_name: line?.product_name ?? "عنصر محذوف", sku: line?.sku ?? null },
    reason: rma.reason,
    status: rma.status,
    fee_payer: rma.fee_payer,
    destination_location: locationRef(store, rma.destination_location_id),
    quantity: rma.quantity,
    customer_name: o?.customer_name ?? "—",
    created_at: rma.created_at,
    restock_movement_id: rma.restock_movement_id,
    events: [...rma.events].sort((a, b) => a.at.localeCompare(b.at)),
  };
}

export function listRmas(store: string | null, params: URLSearchParams) {
  const status = params.get("status");
  const q = normalizeQuery(params.get("q") ?? "");
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 20) || 20));
  const rows = returnsState(store)
    .rmas.filter((r) => !status || r.status === status)
    .filter((r) => {
      const o = orderOf(store, r.order_id);
      return matchesQuery(q, { ids: [r.id, r.order_id], phone: o?.customer_phone ?? "", name: o?.customer_name ?? "" });
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const counts = Object.fromEntries(RMA_STATUSES.map((s) => [s, returnsState(store).rmas.filter((r) => r.status === s).length]));
  return { count: rows.length, counts, results: rows.slice((page - 1) * pageSize, page * pageSize).map((r) => rmaView(store, r)) };
}

export function getRma(store: string | null, id: number) {
  return returnsState(store).rmas.find((r) => r.id === id);
}

/** `POST /api/v1/returns/rma/create/` `{order_id, fulfillment_item_id, destination_location_id, quantity?, reason}`. */
export function createRma(store: string | null, body: Body, actor: string): MockResult<ReturnType<typeof rmaView>> {
  const errors: Record<string, string[]> = {};
  const o = orderOf(store, Number(body.order_id));
  if (!o) errors.order_id = ["الطلب غير موجود."];
  const line = o?.lines.find((l) => l.id === Number(body.fulfillment_item_id));
  if (o && !line) errors.fulfillment_item_id = ["اختر عنصر تنفيذ من الطلب."];
  const dest = Number(body.destination_location_id);
  if (!listLocationRefs(store).some((l) => l.id === dest && l.is_active)) errors.destination_location_id = ["اختر موقع الوجهة."];
  const reason = String(body.reason ?? "") as RmaReason;
  if (!(RMA_REASONS as readonly string[]).includes(reason)) errors.reason = ["اختر سبب الإرجاع."];
  const quantity = body.quantity === undefined || body.quantity === null || body.quantity === "" ? 1 : Number(body.quantity);
  if (line && (!Number.isInteger(quantity) || quantity < 1 || quantity > Number(line.quantity))) errors.quantity = [`الكمية بين 1 و${line.quantity}.`];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  if (o!.status !== "completed") return { ok: false, status: 400, body: { detail: "لا يُنشأ RMA إلا لطلب مُنفَّذ." } };
  const at = now();
  const rma: MockRma = {
    id: nextId(store, "rma", 900),
    order_id: o!.id,
    fulfillment_item_id: line!.id,
    reason,
    status: "requested",
    fee_payer: reason === "customer_rejected" ? "customer" : "merchant",
    destination_location_id: dest,
    quantity,
    created_at: at,
    events: [{ to_status: "requested", at, actor }],
    restock_movement_id: null,
  };
  returnsState(store).rmas.unshift(rma);
  return { ok: true, status: 201, data: rmaView(store, rma) };
}

/** `POST /api/v1/warehouse/returns/scan/` `{rma_id, location_id}`. */
export function scanRma(store: string | null, body: Body, actor: string): MockResult<ReturnType<typeof rmaView>> {
  const rmaId = Number(String(body.rma_id ?? "").replace(/^RMA-?/i, ""));
  const locationId = Number(body.location_id);
  if (!Number.isInteger(rmaId) || rmaId <= 0) return { ok: false, status: 400, body: { rma_id: ["رقم RMA غير صالح."] } };
  if (!listLocationRefs(store).some((l) => l.id === locationId)) return { ok: false, status: 400, body: { location_id: ["الموقع غير موجود."] } };
  const rma = getRma(store, rmaId);
  if (!rma) return { ok: false, status: 404, body: { detail: `لا يوجد RMA برقم ${rmaId}.` } };
  if (rma.status === "requested") return { ok: false, status: 400, body: { detail: `RMA-${rmaId} لم يُشحن بعد من العميل.` } };
  if (rma.status !== "in_transit_back") return { ok: false, status: 409, body: { detail: `RMA-${rmaId} مُسح من قبل — حالته الآن «${rma.status}».` } };
  if (rma.destination_location_id !== locationId) {
    return { ok: false, status: 400, body: { detail: `RMA-${rmaId} وجهته «${locationRef(store, rma.destination_location_id)?.name}» وليس هذا الموقع.` } };
  }
  const at = now();
  rma.events.push({ to_status: "received_at_warehouse", at, actor }, { to_status: "qa_pending", at, actor });
  rma.status = "qa_pending";
  return { ok: true, data: rmaView(store, rma) };
}

/** `POST /api/v1/warehouse/returns/<rma_id>/qa-decision/` `{decision}`. */
export function qaDecision(store: string | null, id: number, body: Body, actor: string): MockResult<ReturnType<typeof rmaView>> {
  const rma = getRma(store, id);
  if (!rma) return { ok: false, status: 404, body: { detail: "RMA غير موجود." } };
  const decision = String(body.decision ?? "");
  if (decision !== "restocked" && decision !== "rejected_disposal") return { ok: false, status: 400, body: { decision: ["القرار restocked أو rejected_disposal."] } };
  if (rma.status !== "qa_pending") return { ok: false, status: 409, body: { detail: `لا قرار فحص إلا بعد الاستلام — الحالة «${rma.status}».` } };
  if (decision === "restocked") {
    const line = orderOf(store, rma.order_id)?.lines.find((l) => l.id === rma.fulfillment_item_id);
    if (line?.product_id) {
      const res = adjustStock(store, { product_id: line.product_id, location_id: rma.destination_location_id, delta: String(rma.quantity), reason: "refund_restock" }, actor, { type: "return", id: rma.id, label: `RMA-${rma.id}` });
      if (res.ok) rma.restock_movement_id = res.data.movement_id;
    }
  }
  rma.status = decision;
  rma.events.push({ to_status: decision, at: now(), actor });
  return { ok: true, data: rmaView(store, rma) };
}

// ── Legacy OrderRefund log ([NEEDS BACKEND]) ────────────────────────────────────────

export function listOrderRefunds(store: string | null, params: URLSearchParams) {
  const method = params.get("method");
  const from = params.get("from");
  const to = params.get("to");
  const q = normalizeQuery(params.get("q") ?? "");
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 20) || 20));
  const rows = ordersState(store)
    .orders.flatMap((o) =>
      o.refunds.map((r) => ({
        id: r.id,
        order_id: o.id,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        display_amount: displayMoney(Number(r.amount)),
        method: r.method,
        reason: r.reason,
        loyalty_points_clawed_back: compareDecimal(r.amount, "100") >= 0 ? Math.floor(Number(r.amount) / 10) : 0,
        actor: r.actor,
        created_at: r.created_at,
      })),
    )
    .filter((r) => !method || r.method === method)
    .filter((r) => !from || r.created_at.slice(0, 10) >= from)
    .filter((r) => !to || r.created_at.slice(0, 10) <= to)
    .filter((r) => matchesQuery(q, { ids: [r.order_id], phone: r.customer_phone, name: `${r.customer_name} ${r.reason}` }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { count: rows.length, results: rows.slice((page - 1) * pageSize, page * pageSize) };
}

export function returnLocations(store: string | null) {
  return listLocationRefs(store).filter((l) => l.is_active).map((l) => ({ id: l.id, name: l.name }));
}
