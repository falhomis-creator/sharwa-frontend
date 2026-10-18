import { addDecimal, compareDecimal, isDecimal, mulDecimal, subDecimal } from "@/lib/decimal";
import { includesNormalized } from "@/lib/i18n/normalize";
import type { MockResult } from "@/lib/bff/mock-route";
import { displayMoney, fullName, int, phone, pick, seeded } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, seedOf, storeState } from "@/mocks/store-state";
import { catalog } from "@/mocks/catalog/state";
// Live binding, read only inside functions: `shipping/state` seeds from the constants below.
import { checkoutDeliveryMethods, checkoutPickups, findPickup } from "@/mocks/shipping/state";
import { storeRates, toSar, round2 } from "@/mocks/storefront/money";
import { effectivePrice } from "@/mocks/catalog/products";
import {
  DEFAULT_FULFILLMENT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  REFUND_METHODS,
  SALES_CHANNELS,
  TRAFFIC_SOURCES,
  type FulfillmentState,
  type OrderCounters,
  type OrderDetail,
  type OrderListItem,
  type OrderListResponse,
  type OrderStatus,
  type OrderStatusDef,
  type PaymentStatus,
  type RefundMethod,
  type SalesChannel,
  type TimelineEvent,
  type TrafficSource,
} from "@/features/orders/schemas";

/**
 * M06 fixture state (`[NEEDS BACKEND]` rows): 120 orders across both status axes, the five
 * default fulfilment statuses, two locations, marketplace orders that are read-only, gift
 * orders, transfer receipts awaiting review, multi-location fulfilments.
 *
 * Rules mirrored from discovery 02 §3: `set_fulfillment_status()` is the only legal path;
 * `refunded` only through the refund path; `cancelled → new|completed` re-deducts stock;
 * every write carries `version` and a stale one answers 409.
 */
const LOCATIONS = [
  { id: 1, name: "المستودع الرئيسي" },
  { id: 2, name: "فرع الرياض" },
];

export const PICKUP_LOCATIONS = [
  { id: 1, name: "فرع الرياض — العليا", address: "شارع التحلية، الرياض" },
  { id: 2, name: "نقطة استلام جدة", address: "حي الروضة، جدة" },
];

export const DELIVERY_METHODS = [
  { id: 1, name: "توصيل شروة", display_price: displayMoney(25), estimated_time: "1-2 يوم" },
  { id: 2, name: "مندوب المتجر", display_price: displayMoney(15), estimated_time: "خلال اليوم" },
];

export interface MockLine {
  id: number;
  product_id: number | null;
  product_name: string;
  variant_label: string | null;
  sku: string;
  price: string;
  quantity: string;
  location_id: number;
}

export interface MockOrder {
  id: number;
  public_uuid: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status_id: number | null;
  sales_channel: SalesChannel;
  traffic_source: TrafficSource;
  created_at: string;
  version: number;
  lines: MockLine[];
  discount: string | null;
  coupon_code: string | null;
  delivery_fee: string;
  deposit: string | null;
  paid: string;
  wallet_used: string | null;
  refunds: Array<{ id: number; method: RefundMethod; amount: string; reason: string; created_at: string; actor: string }>;
  is_gift: boolean;
  recipient_name: string | null;
  recipient_phone: string | null;
  gift_message: string | null;
  delivery_method_name: string | null;
  pickup_location_id: number | null;
  tracking_number: string | null;
  fulfillment_states: Record<number, FulfillmentState>;
  receipt_amount: string | null;
  payment_method: "cod" | "gateway" | "wallet";
  timeline: TimelineEvent[];
  is_backordered: boolean;
  fraud_score: number | null;
  pending_approval: { id: number; status: "pending" | "approved" | "rejected" } | null;
  // ── Storefront-placed orders (M12, Phase 4) — optional so the M06 seed is untouched ──
  /** The buyer's currency at checkout and the SAR→currency rate locked with it. */
  display_currency?: "SAR" | "USD" | "YER_OLD" | "YER_NEW";
  fx_from_sar?: number;
  /** The checkout method code (M12 §5); `payment_method` keeps the M06 projection. */
  checkout_method?: "manual" | "sharwa_pay" | "jeeb" | "kuraimi" | "cod";
  client_uuid?: string;
  deposit_upfront?: string | null;
  customer_latitude?: string | null;
  customer_longitude?: string | null;
}

interface OrdersState {
  statuses: Array<Omit<OrderStatusDef, "orders_count">>;
  orders: MockOrder[];
  ids: { order: number; line: number; status: number; event: number; refund: number; approval: number };
}

const iso = (msAgo: number) => new Date(FIXTURE_NOW - msAgo).toISOString();
const now = () => new Date(Math.max(Date.now(), FIXTURE_NOW + 1000)).toISOString();
const ADDRESSES = ["الرياض، حي النرجس، شارع 12", "جدة، حي الصفا", "صنعاء، شارع حدة", "عدن، المعلا", "الدمام، حي الشاطئ", "تعز، شارع جمال"];

function seed(store: string | null): OrdersState {
  const statuses = DEFAULT_FULFILLMENT_STATUSES.map((s, i) => ({ id: i + 1, sort_order: i, ...s }));
  const state: OrdersState = {
    statuses,
    orders: [],
    ids: { order: 10_480, line: 1, status: 10, event: 1, refund: 1, approval: 7000 },
  };
  if (isEmptyStore(store)) return state;

  const products = catalog(store).products.filter((p) => !p.archived_at);
  const rnd = seeded(seedOf(store) + 11);
  // Status mix for 120 orders, newest first: the first 14 are «new» (the overview's block).
  const plan: OrderStatus[] = [
    ...Array<OrderStatus>(14).fill("new"),
    ...Array<OrderStatus>(4).fill("pending_payment"),
    ...Array<OrderStatus>(5).fill("awaiting_payment"),
    ...Array<OrderStatus>(3).fill("payment_review"),
    ...Array<OrderStatus>(70).fill("completed"),
    ...Array<OrderStatus>(14).fill("cancelled"),
    ...Array<OrderStatus>(10).fill("refunded"),
  ];
  // Interleave the older statuses so the list does not read as blocks.
  const head = plan.slice(0, 14);
  const tail = plan.slice(14).sort(() => rnd() - 0.5);
  const mix = [...head, ...tail];

  mix.forEach((status, i) => {
    const id = 10_480 - i;
    const hoursAgo = i < 14 ? i * 1.3 + 0.2 : 14 + i * 11 + int(rnd, 0, 9);
    const nLines = int(rnd, 1, 3);
    const lines: MockLine[] = [];
    for (let l = 0; l < nLines; l++) {
      const p = pick(rnd, products);
      lines.push({
        id: state.ids.line++,
        product_id: p.id,
        product_name: p.name,
        variant_label: null,
        sku: p.sku,
        price: effectivePrice(p),
        quantity: String(int(rnd, 1, 3)),
        location_id: i % 9 === 4 && l === 1 ? 2 : 1,
      });
    }
    const source: TrafficSource = i % 23 === 7 ? "amazon" : i % 29 === 11 ? "noon" : pick(rnd, ["tiktok", "whatsapp", "instagram", "direct", "snapchat", "direct"] as const);
    const channel: SalesChannel = i % 10 === 6 ? "pos" : i % 13 === 5 ? "phone" : "online";
    const subtotal = lines.reduce((acc, l) => addDecimal(acc, mulDecimal(l.price, l.quantity)), "0");
    const fee = channel === "pos" ? "0.00" : "25.00";
    const total = addDecimal(subtotal, fee);
    const payment: PaymentStatus =
      status === "completed" || status === "refunded"
        ? "paid"
        : status === "cancelled"
          ? pick(rnd, ["unpaid", "failed"] as const)
          : status === "awaiting_payment" || status === "payment_review"
            ? "pending"
            : status === "pending_payment"
              ? "unpaid"
              : pick(rnd, ["unpaid", "unpaid", "paid", "partial"] as const);
    const fulfillmentStatusId =
      status === "completed" || status === "refunded" ? 4 : status === "cancelled" ? 5 : i === 13 ? null : pick(rnd, [1, 1, 2, 3] as const);
    const created = iso(hoursAgo * 3_600_000);
    const order: MockOrder = {
      id,
      public_uuid: `${(id * 2654435761 >>> 0).toString(16).padStart(8, "0")}-trk`,
      customer_name: fullName(rnd),
      customer_phone: phone(rnd),
      customer_email: i % 6 === 0 ? `client${id}@example.com` : null,
      address: pick(rnd, ADDRESSES),
      status,
      payment_status: payment,
      fulfillment_status_id: fulfillmentStatusId,
      sales_channel: channel,
      traffic_source: source,
      created_at: created,
      version: 1,
      lines,
      discount: i % 8 === 2 ? "15.00" : null,
      coupon_code: i % 8 === 2 ? "WELCOME15" : null,
      delivery_fee: fee,
      deposit: payment === "partial" ? "50.00" : null,
      paid: payment === "paid" ? total : payment === "partial" ? "50.00" : "0.00",
      wallet_used: i % 17 === 3 ? "20.00" : null,
      refunds:
        status === "refunded"
          ? [{ id: state.ids.refund++, method: "wallet", amount: total, reason: "المنتج وصل تالفاً", created_at: iso((hoursAgo - 6) * 3_600_000), actor: "مالك المتجر" }]
          : [],
      is_gift: i % 15 === 1,
      recipient_name: i % 15 === 1 ? fullName(rnd) : null,
      recipient_phone: i % 15 === 1 ? phone(rnd) : null,
      gift_message: i % 15 === 1 ? "كل عام وأنت بخير، مع حبي." : null,
      delivery_method_name: channel === "pos" ? null : "توصيل شروة",
      pickup_location_id: null,
      tracking_number: status === "completed" ? `SHW${id}KSA` : null,
      fulfillment_states: Object.fromEntries(
        [...new Set(lines.map((l) => l.location_id))].map((loc, k) => [
          loc,
          (status === "completed" ? "delivered" : status === "cancelled" ? "cancelled" : k === 0 && i % 9 === 4 ? "delivered" : fulfillmentStatusId === 3 ? "shipped" : fulfillmentStatusId === 2 ? "preparing" : "pending") as FulfillmentState,
        ]),
      ),
      receipt_amount: status === "awaiting_payment" || status === "payment_review" ? (i % 2 === 0 ? total : subDecimal(total, "40.00")) : null,
      payment_method: status === "awaiting_payment" || status === "payment_review" ? "gateway" : i % 5 === 0 ? "wallet" : "cod",
      timeline: [],
      is_backordered: i % 31 === 9,
      fraud_score: i % 19 === 3 ? 0.72 : null,
      pending_approval: null,
    };
    order.timeline = seedTimeline(state, order, hoursAgo);
    state.orders.push(order);
  });
  state.ids.order = 10_480;
  return state;
}

function seedTimeline(state: OrdersState, o: MockOrder, hoursAgo: number): TimelineEvent[] {
  const ev = (h: number, kind: TimelineEvent["kind"], source: TimelineEvent["source"], text: string, actor: string | null = null) => ({
    id: state.ids.event++,
    at: iso(Math.max(0, h) * 3_600_000),
    kind,
    source,
    text,
    actor,
  });
  const events: TimelineEvent[] = [ev(hoursAgo, "created", "system", `أُنشئ الطلب من ${o.sales_channel === "online" ? "المتجر" : o.sales_channel === "pos" ? "نقطة البيع" : "الهاتف"}.`)];
  if (o.payment_status === "paid") events.push(ev(hoursAgo - 0.2, "payment", "system", "تم استلام الدفع."));
  if (o.status === "completed") {
    events.push(ev(hoursAgo - 3, "fulfillment", "merchant_manual", "تغيّرت حالة التنفيذ إلى «قيد التجهيز».", "مالك المتجر"));
    events.push(ev(hoursAgo - 8, "shipment", "webhook", `شُحن الطلب برقم تتبع ${o.tracking_number ?? ""}.`));
    events.push(ev(hoursAgo - 30, "shipment", "agent_app", "سُلِّم الطلب للعميل."));
  }
  if (o.status === "cancelled") events.push(ev(hoursAgo - 2, "status", "merchant_manual", "أُلغي الطلب وأُعيد المخزون.", "مالك المتجر"));
  for (const r of o.refunds) events.push({ id: state.ids.event++, at: r.created_at, kind: "refund", source: "merchant_manual", text: `استرجاع ${displayMoney(Number(r.amount))} — ${r.reason}`, actor: r.actor });
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

export function ordersState(store: string | null): OrdersState {
  return storeState(store, "orders", () => seed(store));
}

/** Products referenced by any order (M04 §8: such products are archived, never deleted). */
export function orderedProductIds(store: string | null): Set<number> {
  const set = new Set<number>();
  for (const o of ordersState(store).orders) for (const l of o.lines) if (l.product_id !== null) set.add(l.product_id);
  return set;
}

// ── Derivations ───────────────────────────────────────────────────────────────────────
function totals(o: MockOrder) {
  const subtotal = o.lines.reduce((acc, l) => addDecimal(acc, mulDecimal(l.price, l.quantity)), "0");
  const total = subDecimal(addDecimal(subtotal, o.delivery_fee), o.discount ?? "0");
  const refunded = o.refunds.reduce((acc, r) => addDecimal(acc, r.amount), "0");
  return { subtotal, total, refunded };
}

function lockedReason(o: MockOrder): string | null {
  if (o.traffic_source === "amazon" || o.traffic_source === "noon") {
    return `طلب ${o.traffic_source === "amazon" ? "أمازون" : "نون"}: تُحدَّث حالته من السوق نفسه ولا تُغيَّر من هنا.`;
  }
  return null;
}

function fulfillmentRef(state: OrdersState, id: number | null) {
  const s = id === null ? undefined : state.statuses.find((x) => x.id === id);
  return s ? { id: s.id, name: s.name, color: s.color } : null;
}

function toListItem(state: OrdersState, o: MockOrder): OrderListItem {
  const { total } = totals(o);
  const locs = [...new Set(o.lines.map((l) => l.location_id))];
  return {
    id: o.id,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    display_total: displayMoney(Number(total)),
    status: o.status,
    payment_status: o.payment_status,
    fulfillment_status: fulfillmentRef(state, o.fulfillment_status_id),
    sales_channel: o.sales_channel,
    created_at: o.created_at,
    version: o.version,
    traffic_source: o.traffic_source,
    source_location: LOCATIONS.find((l) => l.id === locs[0]) ?? null,
    items_count: o.lines.length,
    locked_reason: lockedReason(o),
  };
}

export function toDetail(store: string | null, o: MockOrder): OrderDetail {
  const state = ordersState(store);
  const cat = catalog(store);
  const { subtotal, total, refunded } = totals(o);
  const remaining = subDecimal(o.paid, refunded);
  const receipt = o.receipt_amount
    ? (() => {
        const diff = subDecimal(o.receipt_amount, total);
        const sign = compareDecimal(diff, "0");
        return {
          image: null,
          display_reported_amount: displayMoney(Number(o.receipt_amount)),
          display_required_amount: displayMoney(Number(total)),
          display_difference: displayMoney(Math.abs(Number(diff))),
          difference_sign: (sign < 0 ? "under" : sign === 0 ? "exact" : "over") as "under" | "exact" | "over",
          uploaded_at: o.created_at,
        };
      })()
    : null;
  const locIds = [...new Set(o.lines.map((l) => l.location_id))];
  const phoneOrders = state.orders.filter((x) => x.customer_phone === o.customer_phone && x.payment_method === "cod");
  return {
    ...toListItem(state, o),
    public_uuid: o.public_uuid,
    customer_email: o.customer_email,
    address: o.address,
    is_gift: o.is_gift,
    recipient_name: o.recipient_name,
    recipient_phone: o.recipient_phone,
    gift_message: o.gift_message,
    currency: "SAR",
    exchange_rate_locked: null,
    invoice: {
      display_subtotal: displayMoney(Number(subtotal)),
      display_discount: o.discount ? displayMoney(Number(o.discount)) : null,
      display_promotion_discount: null,
      coupon_code: o.coupon_code,
      display_delivery_fee: displayMoney(Number(o.delivery_fee)),
      display_total: displayMoney(Number(total)),
      display_deposit: o.deposit ? displayMoney(Number(o.deposit)) : null,
      display_upfront_paid: o.payment_status === "partial" ? displayMoney(Number(o.paid)) : null,
      display_amount_on_delivery: o.payment_status === "partial" ? displayMoney(Number(subDecimal(total, o.paid))) : null,
      display_wallet_used: o.wallet_used ? displayMoney(Number(o.wallet_used)) : null,
      display_refunded: o.refunds.length ? displayMoney(Number(refunded)) : null,
    },
    refundable_amount: compareDecimal(remaining, "0") > 0 ? remaining : "0.00",
    delivery_method_name: o.delivery_method_name,
    pickup_location: (() => {
      const p = findPickup(store, o.pickup_location_id);
      return p ? { id: p.id, name: p.name, address: p.address } : null;
    })(),
    tracking_number: o.tracking_number,
    items: o.lines.map((l) => {
      const product = l.product_id === null ? undefined : cat.products.find((p) => p.id === l.product_id);
      return {
        id: l.id,
        product_id: l.product_id,
        product_name: l.product_name,
        variant_label: l.variant_label,
        sku_snapshot: l.sku,
        product_image_snapshot: product?.images[0]?.url ?? null,
        quantity: l.quantity,
        display_price: displayMoney(Number(l.price)),
        display_line_total: displayMoney(Number(mulDecimal(l.price, l.quantity))),
        display_tax_amount: null,
        source_location: LOCATIONS.find((x) => x.id === l.location_id) ?? null,
        product_deleted: l.product_id !== null && !product,
      };
    }),
    fulfillments: locIds.map((loc, k) => ({
      id: o.id * 10 + k,
      location: LOCATIONS.find((x) => x.id === loc)!,
      status: o.fulfillment_states[loc] ?? "pending",
      item_ids: o.lines.filter((l) => l.location_id === loc).map((l) => l.id),
      tracking_number: o.fulfillment_states[loc] === "shipped" || o.fulfillment_states[loc] === "delivered" ? `SHW${o.id}${loc}` : null,
      shipping_provider: o.fulfillment_states[loc] === "shipped" || o.fulfillment_states[loc] === "delivered" ? "شروة شيب" : null,
    })),
    payments:
      o.payment_status === "unpaid" && o.payment_method === "cod"
        ? [{ id: o.id * 3, method: "cod", status: "pending", display_amount: displayMoney(Number(total)), gateway_transaction_id: null, created_at: o.created_at }]
        : [
            {
              id: o.id * 3,
              method: o.payment_method,
              status: o.payment_status === "paid" || o.payment_status === "partial" ? "completed" : o.payment_status === "failed" ? "failed" : "pending",
              display_amount: displayMoney(Number(o.payment_status === "partial" ? o.paid : total)),
              gateway_transaction_id: o.payment_method === "gateway" ? `TX-${o.id}` : null,
              created_at: o.created_at,
            },
          ],
    refunds: o.refunds.map((r) => ({ id: r.id, method: r.method, display_amount: displayMoney(Number(r.amount)), reason: r.reason, created_at: r.created_at, actor: r.actor })),
    timeline: o.timeline,
    payment_receipt: receipt,
    trust:
      o.payment_method === "cod"
        ? {
            successful_cod_orders: phoneOrders.filter((x) => x.status === "completed").length + (o.id % 4),
            failed_cod_orders: phoneOrders.filter((x) => x.status === "cancelled").length,
            risk_percentage: o.fraud_score ? (o.fraud_score * 100).toFixed(0) : "4",
          }
        : null,
    fraud_score: o.fraud_score,
    is_backordered: o.is_backordered,
    pending_approval: o.pending_approval,
    tracking_url: `/track/${o.public_uuid}`,
  };
}

// ── Reads ─────────────────────────────────────────────────────────────────────────────
export function listOrders(store: string | null, params: URLSearchParams): OrderListResponse {
  const state = ordersState(store);
  const q = (params.get("q") ?? "").trim().replace(/^#/, "");
  const status = params.get("status") ?? "";
  const pay = params.get("payment_status") ?? "";
  const ful = params.get("fulfillment_status") ?? "";
  const channel = params.get("channel") ?? "";
  const traffic = params.get("traffic_source") ?? "";
  const location = Number(params.get("location") ?? "") || null;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  let rows = state.orders.filter((o) => {
    if (status && (ORDER_STATUSES as readonly string[]).includes(status) && o.status !== status) return false;
    if (pay && (PAYMENT_STATUSES as readonly string[]).includes(pay) && o.payment_status !== pay) return false;
    if (ful && (ful === "none" ? o.fulfillment_status_id !== null : String(o.fulfillment_status_id) !== ful)) return false;
    if (channel && (SALES_CHANNELS as readonly string[]).includes(channel) && o.sales_channel !== channel) return false;
    if (traffic && (TRAFFIC_SOURCES as readonly string[]).includes(traffic) && o.traffic_source !== traffic) return false;
    if (location && !o.lines.some((l) => l.location_id === location)) return false;
    if (from && o.created_at.slice(0, 10) < from) return false;
    if (to && o.created_at.slice(0, 10) > to) return false;
    if (q) {
      const digits = q.replace(/[^\d]/g, "");
      const byId = /^\d+$/.test(q) && String(o.id).includes(q);
      const byPhone = digits.length >= 4 && o.customer_phone.includes(digits.replace(/^0/, ""));
      if (!byId && !byPhone && !includesNormalized(o.customer_name, q)) return false;
    }
    return true;
  });
  const ordering = params.get("ordering") || "-created_at";
  const key = ordering.replace(/^-/, "");
  const dir = ordering.startsWith("-") ? -1 : 1;
  rows = [...rows].sort((a, b) => {
    if (key === "total") return dir * compareDecimal(totals(a).total, totals(b).total);
    if (key === "id") return dir * (a.id - b.id);
    return dir * a.created_at.localeCompare(b.created_at);
  });
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 50) || 50));
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  return {
    count: rows.length,
    next: page * pageSize < rows.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: rows.slice((page - 1) * pageSize, page * pageSize).map((o) => toListItem(state, o)),
  };
}

export function orderCounters(store: string | null): OrderCounters {
  const state = ordersState(store);
  const count = (s: OrderStatus) => state.orders.filter((o) => o.status === s).length;
  return {
    new: count("new"),
    pending_payment: count("pending_payment"),
    awaiting_payment: count("awaiting_payment"),
    payment_review: count("payment_review"),
    by_fulfillment: [...state.statuses]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({ id: s.id, name: s.name, color: s.color, count: state.orders.filter((o) => o.fulfillment_status_id === s.id && o.status !== "completed" && o.status !== "cancelled" && o.status !== "refunded").length })),
  };
}

export function getOrder(store: string | null, id: number): OrderDetail | null {
  const o = ordersState(store).orders.find((x) => x.id === id);
  return o ? toDetail(store, o) : null;
}

/** Newest «new» orders for the M03 overview block — one source of truth with the list. */
export function newestNewOrders(store: string | null, limit: number): OrderListItem[] {
  const state = ordersState(store);
  return state.orders
    .filter((o) => o.status === "new")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((o) => toListItem(state, o));
}

// ── Writes ────────────────────────────────────────────────────────────────────────────
type Body = Record<string, unknown>;

function conflict(o: MockOrder, store: string | null): MockResult<never> {
  return {
    ok: false,
    status: 409,
    body: { detail: "حُدِّث الطلب من مستخدم آخر.", current_version: o.version, order: toDetail(store, o) },
  };
}

function event(state: OrdersState, o: MockOrder, kind: TimelineEvent["kind"], text: string, actor: string, source: TimelineEvent["source"] = "merchant_manual") {
  o.timeline.unshift({ id: state.ids.event++, at: now(), kind, source, text, actor });
}

function restock(store: string | null, o: MockOrder, sign: 1 | -1) {
  const cat = catalog(store);
  for (const l of o.lines) {
    const p = cat.products.find((x) => x.id === l.product_id);
    if (!p || p.is_serialized) continue;
    p.stock = sign > 0 ? addDecimal(p.stock, l.quantity, 3) : subDecimal(p.stock, l.quantity, 3);
    if (compareDecimal(p.stock, "0") < 0) p.stock = "0.000";
  }
}

function load(store: string | null, id: number, version: unknown): { state: OrdersState; o?: MockOrder; error?: MockResult<never> } {
  const state = ordersState(store);
  const o = state.orders.find((x) => x.id === id);
  if (!o) return { state, error: { ok: false, status: 404, body: { detail: "الطلب غير موجود." } } };
  if (Number(version) !== o.version) return { state, error: conflict(o, store) };
  const locked = lockedReason(o);
  if (locked) return { state, error: { ok: false, status: 400, body: { detail: locked } } };
  return { state, o };
}

export function setFulfillmentStatus(store: string | null, id: number, body: Body, actor: string): MockResult<OrderDetail> {
  const { state, o, error } = load(store, id, body.version);
  if (error) return error;
  const target = state.statuses.find((s) => s.id === Number(body.status_id));
  if (!target) return { ok: false, status: 400, body: { status_id: ["الحالة غير موجودة."] } };
  if (o!.status === "refunded") return { ok: false, status: 400, body: { detail: "طلب مسترد: لا تتغيّر حالته." } };
  if (o!.status === "completed" && target.marks_completed && o!.fulfillment_status_id === target.id) {
    return { ok: false, status: 400, body: { detail: "الطلب مكتمل بالفعل بهذه الحالة." } };
  }
  if (o!.status === "completed" && target.releases_stock) {
    return { ok: false, status: 400, body: { detail: "لا يمكن إلغاء طلب مكتمل؛ استخدم مسار الاسترجاع." } };
  }
  const order = o!;
  const before = fulfillmentRef(state, order.fulfillment_status_id)?.name ?? "—";
  order.fulfillment_status_id = target.id;
  if (target.marks_completed && order.status !== "completed") {
    order.status = "completed";
    if (order.payment_status !== "paid" && order.payment_method === "cod") {
      order.payment_status = "paid";
      order.paid = totals(order).total;
    }
    for (const loc of Object.keys(order.fulfillment_states)) order.fulfillment_states[Number(loc)] = "delivered";
  }
  if (target.releases_stock && order.status !== "cancelled") {
    order.status = "cancelled";
    restock(store, order, 1);
    for (const loc of Object.keys(order.fulfillment_states)) order.fulfillment_states[Number(loc)] = "cancelled";
  }
  order.version += 1;
  event(state, order, "fulfillment", `تغيّرت حالة التنفيذ من «${before}» إلى «${target.name}».`, actor);
  return { ok: true, data: toDetail(store, order) };
}

const LEGAL_FINANCIAL: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["new", "cancelled"],
  new: ["completed", "cancelled", "awaiting_payment"],
  awaiting_payment: ["new", "payment_review", "cancelled"],
  payment_review: ["new", "cancelled"],
  completed: ["cancelled"],
  cancelled: ["new", "completed"],
  refunded: [],
};

export function legalFinancialTargets(status: OrderStatus): OrderStatus[] {
  return LEGAL_FINANCIAL[status];
}

export function setFinancialStatus(store: string | null, id: number, body: Body, actor: string): MockResult<OrderDetail> {
  const { state, o, error } = load(store, id, body.version);
  if (error) return error;
  const order = o!;
  const target = String(body.status) as OrderStatus;
  if (target === "refunded") return { ok: false, status: 400, body: { status: ["استخدم مسار الاسترجاع."] } };
  if (!LEGAL_FINANCIAL[order.status].includes(target)) {
    return { ok: false, status: 400, body: { status: [`لا يمكن الانتقال من «${order.status}» إلى «${target}».`] } };
  }
  const from = order.status;
  if (from === "cancelled" && (target === "new" || target === "completed")) restock(store, order, -1);
  if (target === "cancelled") restock(store, order, 1);
  order.status = target;
  if (target === "completed") order.fulfillment_status_id = state.statuses.find((s) => s.marks_completed)?.id ?? order.fulfillment_status_id;
  if (target === "cancelled") order.fulfillment_status_id = state.statuses.find((s) => s.releases_stock)?.id ?? order.fulfillment_status_id;
  order.version += 1;
  event(state, order, "status", `تغيّرت الحالة المالية إلى «${target}».`, actor);
  return { ok: true, data: toDetail(store, order) };
}

export function paymentAction(store: string | null, id: number, action: string, body: Body, actor: string): MockResult<OrderDetail> {
  const { state, o, error } = load(store, id, body.version);
  if (error) return error;
  const order = o!;
  if (!["confirm", "approve", "reject"].includes(action)) return { ok: false, status: 404, body: { detail: "إجراء غير معروف." } };
  if (!["awaiting_payment", "payment_review", "pending_payment"].includes(order.status)) {
    return { ok: false, status: 400, body: { detail: "لا يوجد دفع بانتظار التأكيد لهذا الطلب." } };
  }
  if (action === "reject") {
    order.payment_status = "failed";
    order.status = "pending_payment";
    event(state, order, "payment", "رُفض إيصال التحويل؛ بانتظار دفع جديد من العميل.", actor);
  } else {
    order.payment_status = "paid";
    order.paid = totals(order).total;
    order.status = "new";
    event(state, order, "payment", action === "confirm" ? "تأكّد استلام الدفع." : "قُبلت مراجعة الدفع.", actor);
  }
  order.receipt_amount = null;
  order.version += 1;
  return { ok: true, data: toDetail(store, order) };
}

export function refundOrder(store: string | null, id: number, body: Body, actor: string): MockResult<OrderDetail> {
  const state = ordersState(store);
  const order = state.orders.find((x) => x.id === id);
  if (!order) return { ok: false, status: 404, body: { detail: "الطلب غير موجود." } };
  if (body.version !== undefined && Number(body.version) !== order.version) return conflict(order, store);
  const amount = String(body.amount ?? "").trim();
  const method = String(body.method ?? "") as RefundMethod;
  const reason = String(body.reason ?? "").trim();
  const e: Record<string, string[]> = {};
  if (!isDecimal(amount) || compareDecimal(amount, "0") <= 0) e.amount = ["أدخل مبلغاً أكبر من صفر."];
  if (!(REFUND_METHODS as readonly string[]).includes(method)) e.method = ["اختر طريقة الاسترجاع."];
  if (reason.length < 3) e.reason = ["اكتب سبب الاسترجاع."];
  const { total, refunded } = totals(order);
  const remaining = subDecimal(order.paid, refunded);
  if (!e.amount && compareDecimal(amount, remaining) > 0) e.amount = [`أعلى مبلغ قابل للاسترجاع ${displayMoney(Number(remaining))}.`];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  order.refunds.push({ id: state.ids.refund++, method, amount, reason, created_at: now(), actor });
  const newRefunded = addDecimal(refunded, amount);
  if (compareDecimal(newRefunded, total) >= 0) order.status = "refunded";
  order.version += 1;
  event(state, order, "refund", `استرجاع ${displayMoney(Number(amount))} — ${reason}`, actor);
  return { ok: true, data: toDetail(store, order) };
}

/** `PATCH /orders/<id>/` — convert to pickup / gift note (proposed extension of the detail row). */
export function patchOrder(store: string | null, id: number, body: Body, actor: string): MockResult<OrderDetail> {
  const { state, o, error } = load(store, id, body.version);
  if (error) return error;
  const order = o!;
  if ("pickup_location_id" in body) {
    const loc = checkoutPickups(store).find((p) => p.id === Number(body.pickup_location_id));
    if (!loc) return { ok: false, status: 400, body: { pickup_location_id: ["اختر نقطة الاستلام."] } };
    order.pickup_location_id = loc.id;
    order.delivery_method_name = null;
    order.delivery_fee = "0.00";
    event(state, order, "note", `حُوِّل الطلب إلى استلام من «${loc.name}».`, actor);
  }
  if ("gift_message" in body) {
    const msg = String(body.gift_message ?? "").trim();
    if (msg.length > 500) return { ok: false, status: 400, body: { gift_message: ["500 حرف على الأكثر."] } };
    order.gift_message = msg || null;
    order.is_gift = order.is_gift || Boolean(msg);
    event(state, order, "note", "عُدِّلت رسالة الهدية.", actor);
  }
  order.version += 1;
  return { ok: true, data: toDetail(store, order) };
}

export function createOrder(store: string | null, body: Body, actor: string, canB2b: boolean): MockResult<{ id: number; pending_approval: { id: number } | null }> {
  const state = ordersState(store);
  const cat = catalog(store);
  const e: Record<string, string[]> = {};
  const name = String(body.customer_name ?? "").trim();
  const phoneRaw = String(body.customer_phone ?? "").replace(/\D/g, "");
  if (!name) e.customer_name = ["أدخل اسم العميل."];
  if (!/^(967|966)\d{9}$/.test(phoneRaw)) e.customer_phone = ["رقم هاتف غير صحيح."];
  const items = Array.isArray(body.items) ? (body.items as Array<Record<string, unknown>>) : [];
  if (items.length === 0) e.items = ["أضف منتجاً واحداً على الأقل."];
  const channel = body.sales_channel === "b2b_draft" ? "b2b_draft" : "phone";
  if (channel === "b2b_draft" && !canB2b) return { ok: false, status: 403, body: { detail: "ليست لديك صلاحية إنشاء مسودات الجملة." } };
  const delivery = body.delivery === "pickup" ? "pickup" : "delivery";
  if (delivery === "delivery" && !String(body.address ?? "").trim()) e.address = ["أدخل عنوان التوصيل."];
  if (delivery === "pickup" && !checkoutPickups(store).some((p) => p.id === Number(body.pickup_location_id))) e.pickup_location_id = ["اختر نقطة الاستلام."];
  const lines: MockLine[] = [];
  items.forEach((it, idx) => {
    const p = cat.products.find((x) => x.id === Number(it.product_id));
    const qty = String(it.quantity ?? "1");
    if (!p) {
      e[`items.${idx}.product_id`] = ["المنتج غير موجود."];
      return;
    }
    if (!/^\d+$/.test(qty) || Number(qty) < 1) {
      e[`items.${idx}.quantity`] = ["كمية غير صحيحة."];
      return;
    }
    const variant = it.variant_id ? cat.variants.find((v) => v.id === Number(it.variant_id) && v.product_id === p.id) : undefined;
    const label = variant
      ? variant.option_ids
          .map((oid) => cat.attributes.flatMap((a) => a.options).find((o) => o.id === oid)?.value)
          .filter(Boolean)
          .join(" / ")
      : null;
    const stock = variant ? variant.stock : p.stock;
    if (!p.allow_backorder && compareDecimal(stock, qty) < 0) {
      e[`items.${idx}.quantity`] = [`المتوفر ${Number(stock)} فقط.`];
      return;
    }
    lines.push({
      id: state.ids.line++,
      product_id: p.id,
      product_name: p.name,
      variant_label: label,
      sku: variant?.sku ?? p.sku,
      price: variant ? addDecimal(effectivePrice(p), variant.extra_price) : effectivePrice(p),
      quantity: qty,
      location_id: 1,
    });
  });
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  state.ids.order += 1;
  const id = state.ids.order;
  // M15 is the source (Phase 5 open item 6); its prices are YER_NEW, this fixture stores SAR.
  const activeMethods = checkoutDeliveryMethods(store);
  const method = activeMethods.find((d) => d.id === Number(body.delivery_method_id)) ?? activeMethods[0] ?? null;
  const methodFeeSar = method ? round2(toSar(Number(method.price), "YER_NEW", storeRates(store))).toFixed(2) : "0.00";
  const order: MockOrder = {
    id,
    public_uuid: `${(id * 2654435761 >>> 0).toString(16).padStart(8, "0")}-trk`,
    customer_name: name,
    customer_phone: phoneRaw,
    customer_email: null,
    address: delivery === "delivery" ? String(body.address).trim() : "",
    status: "new",
    payment_status: "unpaid",
    fulfillment_status_id: state.statuses.find((s) => s.is_default)?.id ?? null,
    sales_channel: channel,
    traffic_source: "direct",
    created_at: now(),
    version: 1,
    lines,
    discount: null,
    coupon_code: null,
    delivery_fee: delivery === "delivery" ? methodFeeSar : "0.00",
    deposit: null,
    paid: "0.00",
    wallet_used: null,
    refunds: [],
    is_gift: false,
    recipient_name: null,
    recipient_phone: null,
    gift_message: null,
    delivery_method_name: delivery === "delivery" ? (method?.name ?? "توصيل المتجر") : null,
    pickup_location_id: delivery === "pickup" ? Number(body.pickup_location_id) : null,
    tracking_number: null,
    fulfillment_states: { 1: "pending" },
    receipt_amount: null,
    payment_method: "cod",
    timeline: [],
    is_backordered: false,
    fraud_score: null,
    pending_approval: channel === "b2b_draft" ? { id: ++state.ids.approval, status: "pending" } : null,
  };
  // Stock is deducted at creation (draft B2B orders wait for approval).
  if (channel !== "b2b_draft") {
    items.forEach((it, idx) => {
      const line = lines[idx];
      if (!line) return;
      const v = it.variant_id ? cat.variants.find((x) => x.id === Number(it.variant_id)) : undefined;
      if (v) {
        v.stock = subDecimal(v.stock, line.quantity, 3);
        return;
      }
      const p = cat.products.find((x) => x.id === line.product_id);
      if (p && !p.is_serialized) p.stock = subDecimal(p.stock, line.quantity, 3);
    });
  }
  order.timeline = [
    { id: state.ids.event++, at: order.created_at, kind: "created", source: "merchant_manual", text: channel === "b2b_draft" ? "أُنشئت مسودة جملة بانتظار الموافقة." : "أُنشئ طلب هاتفي يدوياً.", actor },
  ];
  state.orders.unshift(order);
  return { ok: true, status: 201, data: { id, pending_approval: order.pending_approval ? { id: order.pending_approval.id } : null } };
}

// ── Fulfilment status definitions ─────────────────────────────────────────────────────
export function listStatuses(store: string | null): OrderStatusDef[] {
  const state = ordersState(store);
  return [...state.statuses]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({ ...s, orders_count: state.orders.filter((o) => o.fulfillment_status_id === s.id).length }));
}

function statusErrors(body: Body): Record<string, string[]> {
  const e: Record<string, string[]> = {};
  const name = String(body.name ?? "").trim();
  if (!name) e.name = ["أدخل اسم الحالة."];
  else if (name.length > 60) e.name = ["الاسم 60 حرفاً على الأكثر."];
  if (!/^#[0-9a-fA-F]{6}$/.test(String(body.color ?? ""))) e.color = ["لون بصيغة #RRGGBB."];
  if (body.releases_stock && body.marks_completed) e.marks_completed = ["لا تجمع بين «تُحرّر المخزون» و«تُكمِل الطلب»."];
  return e;
}

export function saveStatus(store: string | null, id: number | null, body: Body): MockResult<OrderStatusDef> {
  const state = ordersState(store);
  const existing = id === null ? undefined : state.statuses.find((s) => s.id === id);
  if (id !== null && !existing) return { ok: false, status: 404, body: { detail: "الحالة غير موجودة." } };
  const merged = { ...existing, ...body };
  const e = statusErrors(merged);
  if (state.statuses.some((s) => s.name === String(merged.name ?? "").trim() && s.id !== id)) e.name = ["حالة بهذا الاسم موجودة."];
  if (existing?.is_default && body.is_default === false) e.is_default = ["عيّن حالة افتراضية أخرى أولاً."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  if (merged.is_default) for (const s of state.statuses) s.is_default = false;
  const value = {
    name: String(merged.name).trim(),
    color: String(merged.color),
    is_default: Boolean(merged.is_default),
    releases_stock: Boolean(merged.releases_stock),
    marks_completed: Boolean(merged.marks_completed),
  };
  if (existing) {
    Object.assign(existing, value);
    return { ok: true, data: listStatuses(store).find((s) => s.id === existing.id)! };
  }
  const s = { id: ++state.ids.status, sort_order: state.statuses.length, ...value };
  state.statuses.push(s);
  return { ok: true, status: 201, data: { ...s, orders_count: 0 } };
}

export function deleteStatus(store: string | null, id: number): MockResult<{ moved: number }> {
  const state = ordersState(store);
  const s = state.statuses.find((x) => x.id === id);
  if (!s) return { ok: false, status: 404, body: { detail: "الحالة غير موجودة." } };
  if (s.is_default) return { ok: false, status: 400, body: { detail: "لا يمكن حذف الحالة الافتراضية؛ عيّن حالة افتراضية أخرى أولاً." } };
  const fallback = state.statuses.find((x) => x.is_default)!;
  let moved = 0;
  for (const o of state.orders) {
    if (o.fulfillment_status_id === id) {
      o.fulfillment_status_id = fallback.id;
      o.version += 1;
      moved++;
    }
  }
  state.statuses = state.statuses.filter((x) => x.id !== id);
  return { ok: true, data: { moved } };
}

export function reorderStatuses(store: string | null, ordered: unknown): MockResult<OrderStatusDef[]> {
  const state = ordersState(store);
  const list = Array.isArray(ordered) ? ordered.map(Number) : [];
  list.forEach((id, i) => {
    const s = state.statuses.find((x) => x.id === id);
    if (s) s.sort_order = i;
  });
  return { ok: true, data: listStatuses(store) };
}

// ── Customers for ⌘K (derived from orders; M07 owns the real list) ───────────────────
export function searchCustomers(store: string | null, q: string, limit: number) {
  const state = ordersState(store);
  const digits = q.replace(/[^\d٠-٩]/g, "").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/^0+/, "");
  const map = new Map<string, { phone: string; name: string; orders_count: number }>();
  for (const o of state.orders) {
    const hit = digits.length >= 3 ? o.customer_phone.includes(digits) : includesNormalized(o.customer_name, q);
    if (!hit) continue;
    const cur = map.get(o.customer_phone) ?? { phone: o.customer_phone, name: o.customer_name, orders_count: 0 };
    cur.orders_count += 1;
    map.set(o.customer_phone, cur);
  }
  return [...map.values()].slice(0, limit);
}

export function searchOrders(store: string | null, q: string, limit: number) {
  const params = new URLSearchParams({ q, page_size: String(limit) });
  return listOrders(store, params).results;
}

export const ORDER_LOCATIONS = LOCATIONS;

// ── Storefront (Phase 4: M12 checkout · M41 tracking) ─────────────────────────────────
/** A storefront order by its public UUID (the only key the buyer ever holds). */
export function orderByUuid(store: string | null, uuid: string): MockOrder | undefined {
  return ordersState(store).orders.find((o) => o.public_uuid === uuid);
}

/** The order a client UUID already created — checkout idempotency (FR-12.04). */
export function orderByClientUuid(store: string | null, clientUuid: string): MockOrder | undefined {
  return ordersState(store).orders.find((o) => o.client_uuid === clientUuid);
}

export function fulfillmentStatusRef(store: string | null, id: number | null) {
  return fulfillmentRef(ordersState(store), id);
}

/** Insert an order the storefront checkout built; returns it with its id and public UUID set. */
export function insertStorefrontOrder(
  store: string | null,
  build: (ids: { id: number; public_uuid: string; nextLineId: () => number; defaultStatusId: number | null; now: string }) => MockOrder,
): MockOrder {
  const state = ordersState(store);
  state.ids.order += 1;
  const id = state.ids.order;
  const order = build({
    id,
    public_uuid: `${((id * 2654435761) >>> 0).toString(16).padStart(8, "0")}-trk`,
    nextLineId: () => state.ids.line++,
    defaultStatusId: state.statuses.find((s) => s.is_default)?.id ?? null,
    now: now(),
  });
  order.timeline = [
    { id: state.ids.event++, at: order.created_at, kind: "created", source: "system", text: "أُنشئ الطلب من المتجر.", actor: null },
    ...order.timeline,
  ];
  state.orders.unshift(order);
  return order;
}

/** Append a buyer-side event (receipt attached, gateway result) to an order's timeline. */
export function storefrontEvent(store: string | null, o: MockOrder, kind: TimelineEvent["kind"], text: string) {
  const state = ordersState(store);
  o.timeline.unshift({ id: state.ids.event++, at: now(), kind, source: "system", text, actor: null });
  o.version += 1;
}
