import type { MockResult } from "@/lib/bff/mock-route";
import { FIRST_NAMES, LAST_NAMES, displayMoney, int, pick, seeded } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { marketingState } from "@/mocks/marketing/state";
import { ordersState } from "@/mocks/orders/state";
import { FIXTURE_NOW, seedOf, storeState } from "@/mocks/store-state";

/**
 * M17 mock state (T145) — `Affiliate`/`AffiliateClick`/`AffiliateSale` and
 * `Influencer`/`InfluencerSale` (discovery 02 §5), per store. Sales point at REAL orders of
 * the M06 fixture, so «رقم الطلب» opens an order that exists. Influencer coupons are read
 * from the M13 state (`Coupon.influencer`) — one source, never copied.
 *
 * Amounts live as SAR numbers here and leave ONLY as `display_*` strings (FR-17.05).
 */
type Kind = "affiliates" | "influencers";
type CommissionType = "percent" | "fixed";

interface MockPartner {
  id: number;
  kind: Kind;
  name: string;
  /** Affiliates: the phone; influencers: the free-text contact. */
  phone: string;
  contact: string;
  referral_code: string;
  is_active: boolean;
  commission_type: CommissionType;
  commission_value: string;
  clicks_count: number;
  created_at: string;
}

interface MockSale {
  id: number;
  partner_id: number;
  kind: Kind;
  order_id: number;
  order_state: "active" | "cancelled" | "refunded";
  coupon_code: string | null;
  order_total: number;
  commission: number;
  payout_status: "pending" | "paid";
  paid_at: string | null;
  created_at: string;
}

interface PartnersState {
  partners: MockPartner[];
  sales: MockSale[];
  ids: { affiliates: number; influencers: number; sale: number };
}

const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(FIXTURE_NOW - msAgo).toISOString();
const nowIso = () => new Date(Math.max(Date.now(), FIXTURE_NOW + 1000)).toISOString();
const HEX = "0123456789abcdef";

function code(rnd: () => number, prefix: "aff_" | "inf_"): string {
  let s = prefix;
  for (let i = 0; i < 8; i++) s += HEX[Math.floor(rnd() * 16)];
  return s;
}

function orderTotal(lines: Array<{ price: string; quantity: string }>, fee: string): number {
  return Math.round((lines.reduce((sum, l) => sum + Number(l.price) * Number(l.quantity), 0) + Number(fee)) * 100) / 100;
}

function commissionOf(p: Pick<MockPartner, "commission_type" | "commission_value">, total: number): number {
  return p.commission_type === "percent" ? Math.round(total * Number(p.commission_value)) / 100 : Number(p.commission_value);
}

const INFLUENCER_NAMES = ["ريم الزهراني", "عبدالله الشمري", "هند المالكي", "ماجد العتيبي", "لينا باعشن", "يوسف الحضرمي"];
const CONTACTS = ["@reem.style", "@a.shammari", "hind@example.com", "@majed_tech", "967771234567", "@yousef.hd"];

function seed(store: string | null): PartnersState {
  const state: PartnersState = { partners: [], sales: [], ids: { affiliates: 30, influencers: 12, sale: 0 } };
  if (isEmptyStore(store)) return state;
  const rnd = seeded(seedOf(store) + 1717);
  const orders = ordersState(store).orders.filter((o) => o.status !== "new");
  let orderCursor = 0;
  // AffiliateSale is OneToOne with the order: each order is attributed at most once.
  const nextOrder = () => orders[orderCursor++];

  const addSales = (p: MockPartner, n: number, couponCodes: string[]) => {
    for (let i = 0; i < n; i++) {
      const o = nextOrder();
      if (!o) return;
      const total = orderTotal(o.lines, o.delivery_fee);
      const daysAgo = int(rnd, 1, 80);
      const paid = daysAgo > 35 ? rnd() < 0.85 : rnd() < 0.2;
      state.sales.push({
        id: ++state.ids.sale,
        partner_id: p.id,
        kind: p.kind,
        order_id: o.id,
        order_state: o.status === "cancelled" ? "cancelled" : o.status === "refunded" ? "refunded" : "active",
        coupon_code: couponCodes.length ? pick(rnd, couponCodes) : null,
        order_total: total,
        commission: commissionOf(p, total),
        payout_status: paid ? "paid" : "pending",
        paid_at: paid ? iso((daysAgo - int(rnd, 0, Math.min(daysAgo - 1, 20))) * DAY) : null,
        created_at: iso(daysAgo * DAY + int(rnd, 0, 20) * 3_600_000),
      });
    }
  };

  // 30 affiliates (US-17.3 «30 مسوّقاً»): a mix of busy, quiet, zero-sale and stopped.
  for (let i = 1; i <= 30; i++) {
    const type: CommissionType = rnd() < 0.7 ? "percent" : "fixed";
    const p: MockPartner = {
      id: i,
      kind: "affiliates",
      name: `${pick(rnd, FIRST_NAMES)} ${pick(rnd, LAST_NAMES)}`,
      phone: `9677${String(70_000_000 + i * 7_919).padStart(8, "0")}`,
      contact: "",
      referral_code: code(rnd, "aff_"),
      is_active: i % 11 !== 0,
      commission_type: type,
      commission_value: type === "percent" ? String(pick(rnd, [5, 8, 10, 12, 15])) : pick(rnd, ["10.00", "15.00", "25.00"]),
      clicks_count: i % 9 === 0 ? int(rnd, 3, 40) : int(rnd, 40, 1_900),
      created_at: iso(int(rnd, 60, 300) * DAY),
    };
    state.partners.push(p);
    // Every 9th: clicks without sales (§8 «0 من N»).
    addSales(p, i % 9 === 0 ? 0 : int(rnd, 1, 5), []);
  }

  // Influencers: #7 is «سارة المؤثرة», the influencer the M13 seed links SARA20 to.
  const couponsOf = (id: number) => marketingState(store).coupons.filter((c) => c.influencer?.id === id).map((c) => c.code);
  const infIds = [7, 1, 2, 3, 4, 5, 6];
  infIds.forEach((id, idx) => {
    const name = id === 7 ? "سارة المؤثرة" : INFLUENCER_NAMES[idx - 1]!;
    const type: CommissionType = idx % 3 === 2 ? "fixed" : "percent";
    const p: MockPartner = {
      id,
      kind: "influencers",
      name,
      phone: "",
      contact: id === 7 ? "@sara.influencer" : CONTACTS[idx - 1]!,
      referral_code: code(rnd, "inf_"),
      is_active: id !== 6,
      commission_type: type,
      commission_value: type === "percent" ? String(pick(rnd, [10, 12, 15])) : "20.00",
      clicks_count: 0,
      created_at: iso(int(rnd, 30, 200) * DAY),
    };
    state.partners.push(p);
    const coupons = couponsOf(id);
    // Sales are attributed through a coupon; no coupon → no sales (US-17.2.2).
    if (coupons.length) addSales(p, 12, coupons);
  });
  return state;
}

export function partnersState(store: string | null): PartnersState {
  return storeState(store, "affiliates", () => seed(store));
}

// ── Views ─────────────────────────────────────────────────────────────────────────────
const money = (n: number) => displayMoney(n, "SAR");

function displayCommission(p: Pick<MockPartner, "commission_type" | "commission_value">): string {
  return p.commission_type === "percent" ? `${Number(p.commission_value)}%` : money(Number(p.commission_value));
}

function totals(state: PartnersState, p: MockPartner) {
  const sales = state.sales.filter((s) => s.partner_id === p.id && s.kind === p.kind);
  const sum = (rows: MockSale[], f: (s: MockSale) => number) => rows.reduce((a, s) => a + f(s), 0);
  const counted = sales.filter((s) => s.order_state === "active");
  const pending = sales.filter((s) => s.payout_status === "pending");
  const paid = sales.filter((s) => s.payout_status === "paid");
  const last = sales.reduce<string | null>((a, s) => (a && a > s.created_at ? a : s.created_at), null);
  return {
    sales_count: sales.length,
    sales_total: sum(counted, (s) => s.order_total),
    pending: sum(pending, (s) => s.commission),
    paid: sum(paid, (s) => s.commission),
    last_sale_at: last,
  };
}

function couponsView(store: string | null, id: number) {
  return marketingState(store)
    .coupons.filter((c) => c.influencer?.id === id)
    .map((c) => ({ id: c.id, code: c.code, used_count: c.used_count, max_uses: c.max_uses, is_active: c.is_active }));
}

function view(store: string | null, state: PartnersState, p: MockPartner) {
  const t = totals(state, p);
  const base = {
    id: p.id,
    name: p.name,
    referral_code: p.referral_code,
    is_active: p.is_active,
    commission_type: p.commission_type,
    commission_value: p.commission_value,
    display_commission: displayCommission(p),
    sales_count: t.sales_count,
    display_sales_total: money(t.sales_total),
    display_pending: money(t.pending),
    display_paid: money(t.paid),
    has_pending: t.pending > 0,
    last_sale_at: t.last_sale_at,
    _pending: t.pending,
  };
  if (p.kind === "affiliates") return { ...base, phone: p.phone, clicks_count: p.clicks_count };
  return { ...base, contact: p.contact, coupons: couponsView(store, p.id) };
}

function strip<T extends { _pending: number }>(row: T): Omit<T, "_pending"> {
  const { _pending, ...rest } = row;
  void _pending;
  return rest;
}

const SORTS: Record<string, (r: ReturnType<typeof view>) => number | string> = {
  name: (r) => r.name,
  pending: (r) => r._pending,
  sales_count: (r) => r.sales_count,
  clicks_count: (r) => ("clicks_count" in r ? r.clicks_count : 0),
  last_sale_at: (r) => r.last_sale_at ?? "",
};

export function listPartners(store: string | null, kind: Kind, params: URLSearchParams) {
  const state = partnersState(store);
  const q = (params.get("q") ?? "").trim().toLowerCase();
  let rows = state.partners
    .filter((p) => p.kind === kind)
    .map((p) => view(store, state, p))
    .filter((r) => !q || [r.name, "phone" in r ? r.phone : r.contact, r.referral_code].some((v) => v.toLowerCase().includes(q)));
  if (params.get("has_pending") === "true") rows = rows.filter((r) => r.has_pending);
  const sort = params.get("sort") ?? "";
  const key = sort.replace(/^-/, "");
  const f = SORTS[key];
  if (f) {
    const dir = sort.startsWith("-") ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const x = f(a);
      const y = f(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir || b.id - a.id;
    });
  } else {
    rows = [...rows].sort((a, b) => b.id - a.id);
  }
  return rows.map(strip);
}

export function getPartner(store: string | null, kind: Kind, id: number) {
  const state = partnersState(store);
  const p = state.partners.find((x) => x.kind === kind && x.id === id);
  return p ? strip(view(store, state, p)) : null;
}

export function partnerSummary(store: string | null, kind: Kind) {
  const state = partnersState(store);
  const sales = state.sales.filter((s) => s.kind === kind);
  const monthStart = new Date(FIXTURE_NOW);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const since30 = FIXTURE_NOW - 30 * DAY;
  return {
    display_pending_total: money(sales.filter((s) => s.payout_status === "pending").reduce((a, s) => a + s.commission, 0)),
    display_paid_this_month: money(sales.filter((s) => s.payout_status === "paid" && s.paid_at && new Date(s.paid_at) >= monthStart).reduce((a, s) => a + s.commission, 0)),
    attributed_orders_30d: sales.filter((s) => new Date(s.created_at).getTime() >= since30).length,
  };
}

export function listSales(store: string | null, kind: Kind, id: number, params: URLSearchParams): MockResult<unknown[]> {
  const state = partnersState(store);
  if (!state.partners.some((p) => p.kind === kind && p.id === id)) return { ok: false, status: 404, body: { detail: "غير موجود." } };
  const status = params.get("payout_status");
  const rows = state.sales
    .filter((s) => s.kind === kind && s.partner_id === id && (!status || s.payout_status === status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((s) => ({
      id: s.id,
      order_id: s.order_id,
      order_number: String(s.order_id),
      order_state: s.order_state,
      coupon_code: kind === "influencers" ? s.coupon_code : null,
      display_order_total: money(s.order_total),
      display_commission: money(s.commission),
      payout_status: s.payout_status,
      paid_at: s.paid_at,
      created_at: s.created_at,
    }));
  return { ok: true, data: rows };
}

/** `pending → paid` only (§5); `dry_run` previews the server's count/total (FR-17.06). */
export function markPaid(store: string | null, kind: Kind, id: number, body: Record<string, unknown>): MockResult<{ updated: number; display_total: string; dry_run?: boolean }> {
  const state = partnersState(store);
  if (!state.partners.some((p) => p.kind === kind && p.id === id)) return { ok: false, status: 404, body: { detail: "غير موجود." } };
  const ids = Array.isArray(body.sale_ids) ? body.sale_ids.map(Number).filter(Number.isFinite) : [];
  if (!ids.length) return { ok: false, status: 400, body: { sale_ids: ["اختر عملية واحدة على الأقل."] } };
  const rows = state.sales.filter((s) => s.kind === kind && s.partner_id === id && ids.includes(s.id) && s.payout_status === "pending");
  const total = money(rows.reduce((a, s) => a + s.commission, 0));
  if (body.dry_run === true) return { ok: true, data: { updated: rows.length, display_total: total, dry_run: true } };
  const at = nowIso();
  rows.forEach((s) => {
    s.payout_status = "paid";
    s.paid_at = at;
  });
  return { ok: true, data: { updated: rows.length, display_total: total } };
}

// ── Writes ────────────────────────────────────────────────────────────────────────────
function validate(kind: Kind, body: Record<string, unknown>, partial: boolean) {
  const e: Record<string, string[]> = {};
  const has = (k: string) => !partial || k in body;
  if (has("name") && String(body.name ?? "").trim().length < 2) e.name = ["أدخل الاسم."];
  if (kind === "affiliates" && has("phone") && !/^(967|966)\d{9}$/.test(String(body.phone ?? "").replace(/\D/g, ""))) e.phone = ["رقم هاتف غير صحيح."];
  if (kind === "influencers" && has("contact") && String(body.contact ?? "").trim().length < 3) e.contact = ["أدخل وسيلة التواصل."];
  if (has("commission_type") && body.commission_type !== "percent" && body.commission_type !== "fixed") e.commission_type = ["نوع عمولة غير صالح."];
  if (has("commission_value")) {
    const v = String(body.commission_value ?? "");
    if (!/^\d+(\.\d{1,2})?$/.test(v) || Number(v) <= 0) e.commission_value = ["قيمة غير صحيحة."];
    else if ((body.commission_type ?? "percent") === "percent" && Number(v) > 100) e.commission_value = ["النسبة بين 0 و100."];
  }
  return e;
}

export function createPartner(store: string | null, kind: Kind, body: Record<string, unknown>): MockResult<unknown> {
  const state = partnersState(store);
  const e = validate(kind, body, false);
  const phone = String(body.phone ?? "").replace(/\D/g, "");
  if (kind === "affiliates" && !e.phone && state.partners.some((p) => p.kind === "affiliates" && p.phone === phone)) e.phone = ["هذا الهاتف مسجّل لمسوّق آخر."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const rnd = seeded(Date.now() % 100_000);
  const p: MockPartner = {
    id: ++state.ids[kind],
    kind,
    name: String(body.name).trim(),
    phone: kind === "affiliates" ? phone : "",
    contact: kind === "influencers" ? String(body.contact).trim() : "",
    referral_code: code(rnd, kind === "affiliates" ? "aff_" : "inf_"),
    is_active: true,
    commission_type: body.commission_type as CommissionType,
    commission_value: body.commission_type === "percent" ? String(Number(body.commission_value)) : Number(body.commission_value).toFixed(2),
    clicks_count: 0,
    created_at: nowIso(),
  };
  state.partners.push(p);
  return { ok: true, status: 201, data: strip(view(store, state, p)) };
}

export function patchPartner(store: string | null, kind: Kind, id: number, body: Record<string, unknown>): MockResult<unknown> {
  const state = partnersState(store);
  const p = state.partners.find((x) => x.kind === kind && x.id === id);
  if (!p) return { ok: false, status: 404, body: { detail: "غير موجود." } };
  const e = validate(kind, { commission_type: p.commission_type, ...body }, true);
  if (kind === "affiliates" && "phone" in body && !e.phone) {
    const phone = String(body.phone).replace(/\D/g, "");
    if (state.partners.some((x) => x.kind === "affiliates" && x.id !== id && x.phone === phone)) e.phone = ["هذا الهاتف مسجّل لمسوّق آخر."];
  }
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  if ("name" in body) p.name = String(body.name).trim();
  if (kind === "affiliates" && "phone" in body) p.phone = String(body.phone).replace(/\D/g, "");
  if (kind === "influencers" && "contact" in body) p.contact = String(body.contact).trim();
  if ("commission_type" in body) p.commission_type = body.commission_type as CommissionType;
  if ("commission_value" in body) p.commission_value = p.commission_type === "percent" ? String(Number(body.commission_value)) : Number(body.commission_value).toFixed(2);
  if (typeof body.is_active === "boolean") p.is_active = body.is_active;
  return { ok: true, data: strip(view(store, state, p)) };
}
