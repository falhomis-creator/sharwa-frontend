import type { MockResult } from "@/lib/bff/mock-route";
import { addDecimal, compareDecimal, mulDecimal, subDecimal } from "@/lib/decimal";
import { includesNormalized } from "@/lib/i18n/normalize";
import { displayMoney, fullName, int, phone as randomPhone, pick, seeded } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, nextId, seedOf, storeState } from "@/mocks/store-state";
import { catalog } from "@/mocks/catalog/state";
import { effectivePrice } from "@/mocks/catalog/products";
import { ordersState, type MockOrder } from "@/mocks/orders/state";
import { marketingState } from "@/mocks/marketing/state";
import { pointsByPhone, transactionView, walletByPhone, walletMoney, walletTransactions } from "@/mocks/wallets/state";
import { loyaltyProgram } from "@/mocks/loyalty/program";
import { backInStockByPhone, wishlistByPhone } from "@/mocks/engagement/state";
import { normalizeCustomerPhone } from "@/features/customers/schemas";

export { normalizeCustomerPhone };
import { reviewsSummary, stockOf } from "@/mocks/storefront/catalog";

/**
 * M07 fixture (Django since INT-017: `api/views_customers.py`, module `customers`). There is no `Customer` model upstream (FR-07.01): a customer
 * is DERIVED, keyed by the normalised `customer_phone`, from
 *   1. the live M06 order fixture (`ordersState`) — the source of every recent order, and
 *   2. `customers:history` — the aggregate of OLDER orders (before the M06 fixture window)
 *      for ~1 900 customers, so the list has the spec's 2 000-row scale, the `dormant`
 *      segment (no order in 90 days) is real, and repeat customers exist.
 * Platform trust (`CentralCustomerTrust`) is seeded for ~40% of the phones; the store's
 * `CustomerReliabilityRecord`, the internal notes and the review attribution are this
 * module's own state. Wallets/points (M35), wishlist/back-in-stock (M42), loyalty rules
 * (M13) and product reviews (M10) are READ through their owners' exports.
 */
const DAY = 86_400_000;
const DORMANT_DAYS = 90;
/** The Phase 4 risky COD phone (checkout refuses COD for it) — disabled in this store too. */
const RISKY_PHONE = "967770000099";
/** M42's demo shopper (`0770841802`) — a returning customer here, with wishlist rows. */
const DEMO_PHONE = "967770841802";

export const SEGMENTS = ["all", "abandoned_carts", "dormant", "bought_product"] as const;
export type Segment = (typeof SEGMENTS)[number];

interface HistoryRow {
  phone: string;
  name: string;
  email: string | null;
  orders_count: number;
  total: string;
  refunded: string;
  cod_orders: number;
  first_order_at: string;
  last_order_at: string;
  product_ids: number[];
}

interface PlatformTrust {
  successful_cod_orders: number;
  failed_cod_orders: number;
  risk_percentage: number;
}

interface Reliability {
  cod_refusals_count: number;
  cod_disabled: boolean;
  reason: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface MockNote {
  id: number;
  body: string;
  author: string;
  author_key: string;
  created_at: string;
}

const isoAgo = (days: number, hour = 11) => new Date(FIXTURE_NOW - days * DAY + (hour - 20) * 3_600_000).toISOString();

function digitsHash(phone: string): number {
  let h = 2166136261;
  for (const ch of phone) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

// ── Seeds ────────────────────────────────────────────────────────────────────────────
function historySeed(store: string | null): Map<string, HistoryRow> {
  const rows = new Map<string, HistoryRow>();
  if (isEmptyStore(store)) return rows;
  const rnd = seeded(seedOf(store) + 707);
  const products = catalog(store).products.filter((p) => !p.archived_at);
  const productIds = () => {
    const n = int(rnd, 1, 3);
    return [...new Set(Array.from({ length: n }, () => pick(rnd, products).id))];
  };
  const orderPhones = new Map<string, MockOrder[]>();
  for (const o of ordersState(store).orders) orderPhones.set(o.customer_phone, [...(orderPhones.get(o.customer_phone) ?? []), o]);

  const make = (phone: string, name: string, lastDaysAgo: number, count: number): HistoryRow => {
    const basket = 60 + int(rnd, 0, 54) * 10;
    let total = "0.00";
    for (let k = 0; k < count; k++) total = addDecimal(total, String(basket + int(rnd, -4, 6) * 5));
    const firstDaysAgo = lastDaysAgo + (count > 1 ? int(rnd, 20, 600) : 0);
    return {
      phone,
      name,
      email: rnd() < 0.18 ? `c${phone.slice(-5)}@example.com` : null,
      orders_count: count,
      total,
      refunded: rnd() < 0.12 ? String(basket) + ".00" : "0.00",
      cod_orders: Math.round(count * (0.4 + rnd() * 0.6)),
      first_order_at: isoAgo(firstDaysAgo, 9 + int(rnd, 0, 10)),
      last_order_at: isoAgo(lastDaysAgo, 9 + int(rnd, 0, 10)),
      product_ids: productIds(),
    };
  };

  // Repeat customers: ~40% of the M06 phones have older orders too (some under another name).
  for (const [phone, orders] of orderPhones) {
    if (digitsHash(phone) % 5 >= 2) continue;
    const name = rnd() < 0.25 ? fullName(rnd) : orders[0]!.customer_name;
    rows.set(phone, make(phone, name, int(rnd, 60, 400), int(rnd, 1, 6)));
  }
  // The two named fixtures.
  rows.set(DEMO_PHONE, { ...make(DEMO_PHONE, "ريم الصنعاني", 95, 6), email: "reem.s@example.com" });
  rows.set(RISKY_PHONE, make(RISKY_PHONE, "عبدالله القحطاني", 71, 4));
  // Older customers only (their last order predates the M06 window: ≥ 56 days).
  let distinct = orderPhones.size + [...rows.keys()].filter((p) => !orderPhones.has(p)).length;
  while (distinct < 2000) {
    const p = randomPhone(rnd);
    if (rows.has(p) || orderPhones.has(p)) continue;
    distinct++;
    const r = rnd();
    const count = r < 0.55 ? 1 : r < 0.8 ? 2 : r < 0.93 ? int(rnd, 3, 5) : int(rnd, 6, 14);
    rows.set(p, make(p, fullName(rnd), rnd() < 0.5 ? int(rnd, 56, 89) : int(rnd, 91, 720), count));
  }
  return rows;
}

const history = (store: string | null) => storeState(store, "customers:history:v3", () => historySeed(store));

function platformTrustOf(phone: string): PlatformTrust | null {
  if (phone === DEMO_PHONE) return { successful_cod_orders: 12, failed_cod_orders: 3, risk_percentage: 20 };
  if (phone === RISKY_PHONE) return { successful_cod_orders: 2, failed_cod_orders: 5, risk_percentage: 71 };
  const h = digitsHash(phone);
  if (h % 10 >= 4) return null; // ~60% never ordered COD anywhere on the platform
  const ok = 1 + (h % 23);
  const failed = (h >>> 5) % 9 === 0 ? 4 + ((h >>> 9) % 6) : (h >>> 7) % 4;
  return { successful_cod_orders: ok, failed_cod_orders: failed, risk_percentage: Math.round((failed / (ok + failed)) * 100) };
}

const reliability = (store: string | null) =>
  storeState(store, "customers:reliability", () => {
    const map = new Map<string, Reliability>();
    if (isEmptyStore(store)) return map;
    map.set(RISKY_PHONE, { cod_refusals_count: 3, cod_disabled: true, reason: "رفض استلام ثلاث طلبات دفع عند الاستلام.", updated_at: isoAgo(20), updated_by: "فارس العمري" });
    // Refused COD orders in the M06 fixture count as refusals in this store.
    for (const o of ordersState(store).orders) {
      if (o.status !== "cancelled" || o.payment_method !== "cod") continue;
      const r = map.get(o.customer_phone) ?? { cod_refusals_count: 0, cod_disabled: false, reason: null, updated_at: null, updated_by: null };
      r.cod_refusals_count += 1;
      map.set(o.customer_phone, r);
    }
    return map;
  });

function reliabilityOf(store: string | null, phone: string): Reliability {
  return reliability(store).get(phone) ?? { cod_refusals_count: 0, cod_disabled: false, reason: null, updated_at: null, updated_by: null };
}

const notes = (store: string | null) =>
  storeState(store, "customers:notes", () => {
    const map = new Map<string, MockNote[]>();
    if (isEmptyStore(store)) return map;
    map.set(DEMO_PHONE, [
      { id: 2, body: "تفضّل التوصيل بعد الخامسة مساءً، واتصل قبل الوصول.", author: "سارة الحربي", author_key: "staff:سارة الحربي", created_at: isoAgo(4, 15) },
      { id: 1, body: "عميلة دائمة — أرسلنا لها عيّنة عطر مع الطلب الأخير.", author: "فارس العمري", author_key: "owner", created_at: isoAgo(30, 12) },
    ]);
    map.set(RISKY_PHONE, [{ id: 3, body: "رفض الاستلام ثلاث مرات بحجة تغيّر العنوان. الدفع المسبق فقط.", author: "فارس العمري", author_key: "owner", created_at: isoAgo(20, 13) }]);
    return map;
  });

// ── Derivation ───────────────────────────────────────────────────────────────────────
interface Aggregate {
  phone: string;
  name: string;
  other_names: string[];
  email: string | null;
  orders_count: number;
  total: string;
  refunded: string;
  first_order_at: string;
  last_order_at: string;
  product_ids: Set<number>;
  marketplace_only: boolean;
}

function orderTotals(o: MockOrder) {
  const subtotal = o.lines.reduce((acc, l) => addDecimal(acc, mulDecimal(l.price, l.quantity)), "0");
  const total = subDecimal(addDecimal(subtotal, o.delivery_fee), o.discount ?? "0");
  const refunded = o.refunds.reduce((acc, r) => addDecimal(acc, r.amount), "0");
  return { total, refunded };
}

function aggregates(store: string | null): Map<string, Aggregate> {
  const map = new Map<string, Aggregate>();
  const orders = [...ordersState(store).orders].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const [phone, h] of history(store)) {
    map.set(phone, {
      phone,
      name: h.name,
      other_names: [],
      email: h.email,
      orders_count: h.orders_count,
      total: h.total,
      refunded: h.refunded,
      first_order_at: h.first_order_at,
      last_order_at: h.last_order_at,
      product_ids: new Set(h.product_ids),
      marketplace_only: false,
    });
  }
  for (const o of orders) {
    if (o.status === "pending_payment") continue; // not a placed order yet
    const { total: gross, refunded } = orderTotals(o);
    // Django (INT-017): the spend counts placed orders that were not cancelled.
    const total = o.status === "cancelled" ? "0" : gross;
    const marketplace = o.traffic_source === "amazon" || o.traffic_source === "noon";
    const cur = map.get(o.customer_phone);
    if (!cur) {
      map.set(o.customer_phone, {
        phone: o.customer_phone,
        name: o.customer_name,
        other_names: [],
        email: o.customer_email,
        orders_count: 1,
        total,
        refunded,
        first_order_at: o.created_at,
        last_order_at: o.created_at,
        product_ids: new Set(o.lines.flatMap((l) => (l.product_id === null ? [] : [l.product_id]))),
        marketplace_only: marketplace,
      });
      continue;
    }
    // Orders are walked oldest → newest: the last order's name wins, the others are hints.
    if (cur.name !== o.customer_name && !cur.other_names.includes(cur.name)) cur.other_names.push(cur.name);
    cur.other_names = cur.other_names.filter((n) => n !== o.customer_name);
    cur.name = o.customer_name;
    cur.email = o.customer_email ?? cur.email;
    cur.orders_count += 1;
    cur.total = addDecimal(cur.total, total);
    cur.refunded = addDecimal(cur.refunded, refunded);
    if (o.created_at < cur.first_order_at) cur.first_order_at = o.created_at;
    if (o.created_at > cur.last_order_at) cur.last_order_at = o.created_at;
    for (const l of o.lines) if (l.product_id !== null) cur.product_ids.add(l.product_id);
    cur.marketplace_only = cur.marketplace_only && marketplace;
  }
  return map;
}

function abandonedPhones(store: string | null): Set<string> {
  return new Set(marketingState(store).carts.flatMap((c) => (c.status === "abandoned" && c.customer_phone ? [c.customer_phone] : [])));
}

function isDormant(a: Aggregate): boolean {
  return new Date(a.last_order_at).getTime() < FIXTURE_NOW - DORMANT_DAYS * DAY;
}

function segmentFlags(a: Aggregate, carts: Set<string>): Segment[] {
  const flags: Segment[] = [];
  if (carts.has(a.phone)) flags.push("abandoned_carts");
  if (isDormant(a)) flags.push("dormant");
  return flags;
}

function phoneMatches(phone: string, q: string): boolean {
  let d = q.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/\D/g, "");
  if (d.length < 3) return false;
  if (d.startsWith("00")) d = d.slice(2);
  const local = d.startsWith("0") ? d.slice(1) : d;
  return phone.includes(local);
}

// ── List / segments ──────────────────────────────────────────────────────────────────
interface Filters {
  q: string;
  segment: Segment;
  product_id: number | null;
  last_order_from: string;
  last_order_to: string;
  min_spent: string;
  trust: "" | "lt50" | "50-80" | "gt80";
  has_wallet: boolean;
  has_points: boolean;
}

export function readFilters(params: URLSearchParams): Filters {
  const segment = params.get("segment") ?? "all";
  const trust = params.get("trust") ?? "";
  const minSpent = (params.get("min_spent") ?? "").trim();
  return {
    q: (params.get("q") ?? "").trim(),
    segment: (SEGMENTS as readonly string[]).includes(segment) ? (segment as Segment) : "all",
    product_id: Number(params.get("product_id") ?? "") || null,
    last_order_from: params.get("last_order_from") ?? "",
    last_order_to: params.get("last_order_to") ?? "",
    min_spent: /^\d+(\.\d{1,2})?$/.test(minSpent) ? minSpent : "",
    trust: trust === "lt50" || trust === "50-80" || trust === "gt80" ? trust : "",
    has_wallet: params.get("has_wallet") === "true",
    has_points: params.get("has_points") === "true",
  };
}

function trustPercent(phone: string): number | null {
  const t = platformTrustOf(phone);
  return t ? 100 - t.risk_percentage : null;
}

function filtered(store: string | null, f: Filters): Aggregate[] {
  const carts = abandonedPhones(store);
  return [...aggregates(store).values()].filter((a) => {
    if (f.segment === "abandoned_carts" && !carts.has(a.phone)) return false;
    if (f.segment === "dormant" && !isDormant(a)) return false;
    if (f.segment === "bought_product" && (!f.product_id || !a.product_ids.has(f.product_id))) return false;
    if (f.last_order_from && a.last_order_at.slice(0, 10) < f.last_order_from) return false;
    if (f.last_order_to && a.last_order_at.slice(0, 10) > f.last_order_to) return false;
    if (f.min_spent && compareDecimal(a.total, f.min_spent) < 0) return false;
    if (f.trust) {
      const t = trustPercent(a.phone);
      if (t === null) return false;
      if (f.trust === "lt50" && !(t < 50)) return false;
      if (f.trust === "50-80" && !(t >= 50 && t <= 80)) return false;
      if (f.trust === "gt80" && !(t > 80)) return false;
    }
    if (f.has_wallet && !walletByPhone(store, a.phone)) return false;
    if (f.has_points && pointsByPhone(store, a.phone).balance <= 0) return false;
    if (f.q) {
      const byPhone = !a.marketplace_only && phoneMatches(a.phone, f.q);
      if (!byPhone && !includesNormalized(`${a.name} ${a.other_names.join(" ")}`, f.q)) return false;
    }
    return true;
  });
}

function listItem(store: string | null, a: Aggregate) {
  const wallet = walletByPhone(store, a.phone);
  const points = pointsByPhone(store, a.phone);
  const t = platformTrustOf(a.phone);
  return {
    phone: a.phone,
    phone_available: !a.marketplace_only,
    name: a.name,
    orders_count: a.orders_count,
    display_total_spent: displayMoney(Number(a.total)),
    last_order_at: a.last_order_at,
    trust: { platform_risk_percentage: t ? t.risk_percentage : null },
    cod_disabled: reliabilityOf(store, a.phone).cod_disabled,
    display_wallet_balance: wallet ? walletMoney(wallet.balance) : null,
    points_balance: points.balance > 0 || points.transactions.length ? points.balance : null,
  };
}

/** `GET /api/v1/customers/?q&segment&product_id&last_order_from&last_order_to&min_spent&trust&has_wallet&has_points&ordering&page&page_size` */
export function listCustomers(store: string | null, params: URLSearchParams) {
  const rows = filtered(store, readFilters(params));
  const ordering = params.get("ordering") || "-last_order_at";
  const key = ordering.replace(/^-/, "");
  const dir = ordering.startsWith("-") ? -1 : 1;
  rows.sort((a, b) => {
    if (key === "total_spent") return dir * compareDecimal(a.total, b.total) || b.last_order_at.localeCompare(a.last_order_at);
    if (key === "orders_count") return dir * (a.orders_count - b.orders_count) || b.last_order_at.localeCompare(a.last_order_at);
    if (key === "name") return dir * a.name.localeCompare(b.name, "ar");
    return dir * a.last_order_at.localeCompare(b.last_order_at);
  });
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 50) || 50));
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  return {
    count: rows.length,
    next: page * pageSize < rows.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: rows.slice((page - 1) * pageSize, page * pageSize).map((a) => listItem(store, a)),
  };
}

/** `GET /api/v1/customers/segments/count/?segment&product_id` → `{count}` (+ the product's name for the picker). */
export function segmentCount(store: string | null, params: URLSearchParams) {
  const f = readFilters(params);
  const onlySegment: Filters = { ...f, q: "", last_order_from: "", last_order_to: "", min_spent: "", trust: "", has_wallet: false, has_points: false };
  const product = f.product_id ? catalog(store).products.find((p) => p.id === f.product_id) : undefined;
  return {
    segment: f.segment,
    count: f.segment === "bought_product" && !f.product_id ? 0 : filtered(store, onlySegment).length,
    product: product ? { id: product.id, name: product.name } : null,
  };
}

// ── Profile ──────────────────────────────────────────────────────────────────────────
export function findCustomer(store: string | null, rawPhone: string): Aggregate | undefined {
  return aggregates(store).get(normalizeCustomerPhone(rawPhone));
}

export function customerDetail(store: string | null, rawPhone: string) {
  const a = findCustomer(store, rawPhone);
  if (!a) return null;
  const wallet = walletByPhone(store, a.phone);
  const points = pointsByPhone(store, a.phone);
  const rel = reliabilityOf(store, a.phone);
  const avg = a.orders_count ? (Number(a.total) / a.orders_count).toFixed(2) : "0";
  return {
    phone: a.phone,
    phone_available: !a.marketplace_only,
    name: a.name,
    other_names: a.other_names,
    email: a.email,
    first_order_at: a.first_order_at,
    last_order_at: a.last_order_at,
    orders_count: a.orders_count,
    display_total_spent: displayMoney(Number(a.total)),
    display_refunded: displayMoney(Number(a.refunded)),
    display_avg_basket: displayMoney(Number(avg)),
    segment_flags: segmentFlags(a, abandonedPhones(store)),
    trust: {
      platform: platformTrustOf(a.phone),
      store: { cod_refusals_count: rel.cod_refusals_count, cod_disabled: rel.cod_disabled, reason: rel.reason, updated_at: rel.updated_at, updated_by: rel.updated_by },
    },
    wallet: wallet ? { id: wallet.id, display_balance: walletMoney(wallet.balance), is_active: wallet.is_active } : null,
    points: points.balance > 0 || points.transactions.length ? { balance: points.balance } : null,
  };
}

/** `POST /api/v1/customers/<phone>/cod/` `{cod_disabled, reason}` → the store record. */
export function setCod(store: string | null, rawPhone: string, body: Record<string, unknown>, actor: string): MockResult<Reliability> {
  const a = findCustomer(store, rawPhone);
  if (!a) return { ok: false, status: 404, body: { detail: "العميل غير موجود." } };
  if (typeof body.cod_disabled !== "boolean") return { ok: false, status: 400, body: { cod_disabled: ["القيمة مطلوبة."] } };
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3) return { ok: false, status: 400, body: { reason: ["اكتب سبباً واضحاً (3 أحرف على الأقل)."] } };
  if (reason.length > 300) return { ok: false, status: 400, body: { reason: ["السبب أطول من 300 حرف."] } };
  const map = reliability(store);
  const cur = reliabilityOf(store, a.phone);
  if (cur.cod_disabled === body.cod_disabled) {
    return { ok: false, status: 409, body: { detail: body.cod_disabled ? "الدفع عند الاستلام موقوف لهذا العميل أصلاً." : "الدفع عند الاستلام مفعّل لهذا العميل أصلاً." } };
  }
  const next: Reliability = { ...cur, cod_disabled: body.cod_disabled, reason, updated_at: new Date(Math.max(Date.now(), FIXTURE_NOW)).toISOString(), updated_by: actor };
  map.set(a.phone, next);
  return { ok: true, data: next };
}

// ── Tabs ─────────────────────────────────────────────────────────────────────────────
export function walletTab(store: string | null, rawPhone: string) {
  const phone = normalizeCustomerPhone(rawPhone);
  const wallet = walletByPhone(store, phone);
  if (!wallet) return { wallet: null, results: [] };
  return {
    wallet: { id: wallet.id, display_balance: walletMoney(wallet.balance), is_active: wallet.is_active },
    results: walletTransactions(store, wallet.id).slice(0, 10).map(transactionView),
  };
}

export function pointsTab(store: string | null, rawPhone: string) {
  const phone = normalizeCustomerPhone(rawPhone);
  const { balance, transactions } = pointsByPhone(store, phone);
  const program = loyaltyProgram(store);
  const rate = program.points_per_riyal_redemption;
  return {
    balance,
    program_enabled: program.is_enabled,
    points_per_riyal_redemption: rate,
    display_riyal_equivalent: rate > 0 ? walletMoney((Math.floor((balance / rate) * 100) / 100).toFixed(2)) : null,
    transactions: transactions.slice(0, 50).map((t) => ({ id: t.id, type: t.type, points: t.points, order_id: t.order_id, created_at: t.created_at })),
  };
}

export function wishlistTab(store: string | null, rawPhone: string) {
  const phone = normalizeCustomerPhone(rawPhone);
  const state = catalog(store);
  const wished = wishlistByPhone(store, phone);
  const subscribed = new Set(backInStockByPhone(store, phone));
  const ids = [...new Set([...wished.map((w) => w.product_id), ...subscribed])];
  return ids
    .map((id) => {
      const p = state.products.find((x) => x.id === id);
      const w = wished.find((x) => x.product_id === id);
      return {
        product_id: id,
        product: p && !p.archived_at ? { id: p.id, name: p.name, image: p.images[0]?.url ?? null, display_price: displayMoney(Number(effectivePrice(p))), stock: stockOf(state, p) } : null,
        in_wishlist: Boolean(w),
        added_at: w?.created_at ?? null,
        back_in_stock_requested: subscribed.has(id),
      };
    })
    .sort((a, b) => (b.added_at ?? "").localeCompare(a.added_at ?? ""));
}

// Product reviews live in the storefront fixture (`storefront:reviews`, M10). They carry a
// first name only; this module attributes each one to a customer who bought the product.
interface StorefrontReviewRow {
  id: number;
  product_id: number;
  rating: number;
  comment: string;
  customer_name: string;
  created_at: string;
  admin_reply: string | null;
  approved: boolean;
}

function storefrontReviews(store: string | null): StorefrontReviewRow[] {
  const first = catalog(store).products[0];
  if (first) reviewsSummary(store, first.id); // make sure the owner seeded its rows
  return storeState<StorefrontReviewRow[]>(store, "storefront:reviews", () => []);
}

const reviewOwners = (store: string | null) =>
  storeState(store, "customers:review-owners", () => {
    const map = new Map<number, string>();
    const buyers = new Map<number, string[]>();
    for (const a of aggregates(store).values()) for (const id of a.product_ids) buyers.set(id, [...(buyers.get(id) ?? []), a.phone]);
    let demo = 0;
    for (const r of storefrontReviews(store)) {
      const list = buyers.get(r.product_id);
      if (!list?.length) continue;
      if (demo < 2 && r.id % 7 === 1) {
        map.set(r.id, DEMO_PHONE);
        demo++;
        continue;
      }
      map.set(r.id, list[digitsHash(`${r.id}`) % list.length]!);
    }
    return map;
  });

export function reviewsTab(store: string | null, rawPhone: string) {
  const phone = normalizeCustomerPhone(rawPhone);
  const owners = reviewOwners(store);
  const products = catalog(store).products;
  return storefrontReviews(store)
    .filter((r) => owners.get(r.id) === phone)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => ({
      id: r.id,
      product: { id: r.product_id, name: products.find((p) => p.id === r.product_id)?.name ?? "منتج محذوف" },
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      admin_reply: r.admin_reply,
      approved: r.approved,
    }));
}

/** `PATCH /api/v1/reviews/<id>/` `{admin_reply}` — written into the storefront's own rows. */
export function replyToReview(store: string | null, id: number, body: Record<string, unknown>) {
  const row = storefrontReviews(store).find((r) => r.id === id);
  if (!row) return { ok: false as const, status: 404, body: { detail: "التقييم غير موجود." } };
  // INT-029: `{approved}` approves (or hides) a storefront review — alone or with a reply.
  const hasApproval = "approved" in body;
  if (hasApproval && typeof body.approved !== "boolean") return { ok: false as const, status: 400, body: { approved: ["قيمة غير صالحة."] } };
  if (!hasApproval && (!("admin_reply" in body) || (body.admin_reply !== null && typeof body.admin_reply !== "string"))) {
    return { ok: false as const, status: 400, body: { admin_reply: ["نص الرد مطلوب."] } };
  }
  if ("admin_reply" in body) {
    if (body.admin_reply !== null && typeof body.admin_reply !== "string") return { ok: false as const, status: 400, body: { admin_reply: ["نص الرد مطلوب."] } };
    const reply = typeof body.admin_reply === "string" ? body.admin_reply.trim() : "";
    if (reply.length > 1000) return { ok: false as const, status: 400, body: { admin_reply: ["الرد أطول من 1000 حرف."] } };
    row.admin_reply = reply || null;
  }
  if (hasApproval) row.approved = body.approved === true;
  const products = catalog(store).products;
  return {
    ok: true as const,
    data: { id: row.id, product: { id: row.product_id, name: products.find((p) => p.id === row.product_id)?.name ?? "منتج محذوف" }, rating: row.rating, comment: row.comment, created_at: row.created_at, admin_reply: row.admin_reply, approved: row.approved },
  };
}

// ── Notes (`CustomerNote`, proposed) ─────────────────────────────────────────────────
export interface NoteActor {
  key: string;
  name: string;
  isOwner: boolean;
}

function noteView(n: MockNote, actor: NoteActor) {
  return { id: n.id, body: n.body, author: n.author, created_at: n.created_at, can_delete: actor.isOwner || n.author_key === actor.key };
}

export function listNotes(store: string | null, rawPhone: string, actor: NoteActor) {
  const phone = normalizeCustomerPhone(rawPhone);
  return [...(notes(store).get(phone) ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((n) => noteView(n, actor));
}

export function addNote(store: string | null, rawPhone: string, body: Record<string, unknown>, actor: NoteActor) {
  const a = findCustomer(store, rawPhone);
  if (!a) return { ok: false as const, status: 404, body: { detail: "العميل غير موجود." } };
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return { ok: false as const, status: 400, body: { body: ["اكتب الملاحظة."] } };
  if (text.length > 1000) return { ok: false as const, status: 400, body: { body: ["الملاحظة أطول من 1000 حرف."] } };
  const note: MockNote = { id: nextId(store, "customer-note", 100), body: text, author: actor.name, author_key: actor.key, created_at: new Date(Math.max(Date.now(), FIXTURE_NOW + 1000)).toISOString() };
  const map = notes(store);
  map.set(a.phone, [note, ...(map.get(a.phone) ?? [])]);
  return { ok: true as const, status: 201, data: noteView(note, actor) };
}

export function deleteNote(store: string | null, rawPhone: string, id: number, actor: NoteActor): MockResult<null> {
  const phone = normalizeCustomerPhone(rawPhone);
  const list = notes(store).get(phone) ?? [];
  const note = list.find((n) => n.id === id);
  if (!note) return { ok: false, status: 404, body: { detail: "الملاحظة غير موجودة." } };
  if (!actor.isOwner && note.author_key !== actor.key) return { ok: false, status: 403, body: { detail: "يحذف الملاحظة كاتبها أو مالك المتجر فقط." } };
  notes(store).set(
    phone,
    list.filter((n) => n.id !== id),
  );
  return { ok: true, data: null, status: 204 };
}

// ── Export ───────────────────────────────────────────────────────────────────────────
const csvCell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** `GET /api/v1/customers/export.csv?<same filters>` — every matching row (no pagination). */
export function exportCustomersCsv(store: string | null, params: URLSearchParams): { csv: string; count: number } {
  const rows = filtered(store, readFilters(params)).sort((a, b) => b.last_order_at.localeCompare(a.last_order_at));
  const header = ["phone", "name", "orders_count", "total_spent", "last_order_at", "platform_trust_percent", "cod_refusals_count", "cod_disabled", "wallet_balance", "points_balance"];
  const lines = rows.map((a) => {
    const item = listItem(store, a);
    const rel = reliabilityOf(store, a.phone);
    const trust = trustPercent(a.phone);
    return [
      item.phone_available ? a.phone : "",
      a.name,
      a.orders_count,
      item.display_total_spent,
      a.last_order_at,
      trust,
      rel.cod_refusals_count,
      rel.cod_disabled ? "true" : "false",
      item.display_wallet_balance,
      item.points_balance,
    ]
      .map(csvCell)
      .join(",");
  });
  return { csv: `﻿${[header.join(","), ...lines].join("\n")}\n`, count: rows.length };
}
