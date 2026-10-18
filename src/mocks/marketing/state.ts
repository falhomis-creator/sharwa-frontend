import type { MockResult } from "@/lib/bff/mock-route";
import { segmentCount } from "@/mocks/customers/state";
import { includesNormalized } from "@/lib/i18n/normalize";
import { displayMoney, seeded } from "@/mocks/_fixtures";
import { catalog } from "@/mocks/catalog/state";
import { isEmptyStore } from "@/mocks/empty-store";
import { ordersState } from "@/mocks/orders/state";
import { FIXTURE_NOW, nextId, seedOf, storeState } from "@/mocks/store-state";
import type { Audience, BuyCondition, CartStatus, Channel, DiscountType, EventColor, EventType, OfferType, TemporalState } from "@/features/marketing/schemas";
import { couponState, AUDIENCES, BUY_CONDITIONS, CHANNELS, DISCOUNT_TYPES, EVENT_COLORS, EVENT_TYPES, OFFER_TYPES } from "@/features/marketing/schemas";

/**
 * M13 `[NEEDS BACKEND]` fixtures: coupons, promotional offers, abandoned carts (+ settings),
 * campaigns (+ recipients), the marketing timeline and the gifting switch — per store on
 * `globalThis` (`storeState`). The storefront's Phase 4 coupon codes (WELCOME10, NOOR50,
 * OLD20, MAXED, SOON, OFF) are the same rows here, in the states the cart mock answers with.
 * Money is formatted here (`displayMoney`) — the UI shows the string as is (FR-13.09).
 */
type Ref = { id: number; name: string };

export interface MockCoupon {
  id: number;
  code: string;
  discount_type: DiscountType;
  discount_value: string;
  apply_to: "all" | "category" | "product";
  category_id: number | null;
  product_id: number | null;
  min_order_amount: string | null;
  influencer: Ref | null;
  start_date: string | null;
  expires_at: string | null;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  created_at: string;
}

export interface MockOffer {
  id: number;
  name: string;
  offer_type: OfferType;
  discount_type: DiscountType | null;
  discount_value: string | null;
  min_order_amount: string | null;
  description: string;
  image: string | null;
  cta_text: string;
  buy_quantity: number | null;
  buy_condition_type: BuyCondition | null;
  buy_category_id: number | null;
  buy_product_id: number | null;
  get_product_id: number | null;
  get_quantity: number | null;
  get_discount_percent: number | null;
  min_total_items: number | null;
  priority: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MockCart {
  id: number;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  currency: "SAR";
  status: CartStatus;
  reminder_step: number;
  last_interaction_at: string;
  last_reminder_sent_at: string | null;
  recovered_order_id: number | null;
  reminder_discount_coupon: string | null;
  items: Array<{ product_id: number | null; name: string; quantity: number; price: number; image: string | null }>;
}

export interface MockCartSettings {
  is_enabled: boolean;
  min_cart_value: string;
  channel_whatsapp: boolean;
  channel_email: boolean;
  channel_sms: boolean;
  channel_conversational_enabled: boolean;
  reminder_1_delay_hours: number;
  reminder_1_message: string;
  reminder_2_delay_hours: number;
  reminder_2_message: string;
  discount_percent: number;
  discount_validity_hours: number;
}

export interface MockCampaign {
  id: number;
  name: string;
  channel: Channel;
  audience_type: Audience;
  product_id: number | null;
  message: string;
  status: "draft" | "scheduled" | "sent";
  scheduled_at: string | null;
  sent_at: string | null;
  recipients: { pending: number; sent: number; failed: number };
  created_at: string;
}

export interface MockEvent {
  id: number;
  title: string;
  event_type: EventType;
  color: EventColor;
  start_date: string;
  end_date: string;
  linked_campaign_id: number | null;
  linked_offer_id: number | null;
  notes: string;
}

interface MarketingState {
  coupons: MockCoupon[];
  offers: MockOffer[];
  carts: MockCart[];
  cartSettings: MockCartSettings;
  campaigns: MockCampaign[];
  events: MockEvent[];
  gifting: { is_enabled: boolean };
}

/** Only WhatsApp is connected in the fixture (M27/M30 own the real statuses). */
export const CONNECTED_CHANNELS: Channel[] = ["whatsapp"];
export const CHANNEL_MANAGE_HREF: Record<Channel, string | null> = {
  sms: null,
  email: null,
  whatsapp: null,
  meta_social_commerce: "/dashboard/channels/social",
  tiktok_shop: "/dashboard/channels/social",
  telegram_bot: "/dashboard/channels/social",
};

const DAY = 86_400_000;
const iso = (daysFromNow: number, hour = 12) => new Date(FIXTURE_NOW + daysFromNow * DAY + (hour - 20) * 3_600_000).toISOString();
const dateOnly = (daysFromNow: number) => iso(daysFromNow).slice(0, 10);

const DEFAULT_SETTINGS: MockCartSettings = {
  is_enabled: true,
  min_cart_value: "50.00",
  channel_whatsapp: true,
  channel_email: false,
  channel_sms: false,
  channel_conversational_enabled: true,
  reminder_1_delay_hours: 2,
  reminder_1_message: "مرحباً {customer_name}، تركت منتجات في سلتك. أكمل طلبك من هنا: {cart_url}",
  reminder_2_delay_hours: 24,
  reminder_2_message: "{customer_name}، خصم {discount_percent}% بالكود {discount_code} على سلتك لمدة يوم واحد: {cart_url}",
  discount_percent: 10,
  discount_validity_hours: 24,
};

function seed(store: string | null): MarketingState {
  const state: MarketingState = { coupons: [], offers: [], carts: [], cartSettings: { ...DEFAULT_SETTINGS, is_enabled: false }, campaigns: [], events: [], gifting: { is_enabled: false } };
  if (isEmptyStore(store)) return state;
  const rnd = seeded(seedOf(store) + 13);
  const cat = catalog(store);
  const products = cat.products.filter((p) => p.published_at && !p.archived_at);
  const pid = (i: number) => products[i % products.length]!.id;

  state.coupons = [
    { id: 1, code: "WELCOME10", discount_type: "percent", discount_value: "10", apply_to: "all", category_id: null, product_id: null, min_order_amount: null, influencer: null, start_date: iso(-120), expires_at: null, is_active: true, max_uses: null, used_count: 143, created_at: iso(-120) },
    { id: 2, code: "NOOR50", discount_type: "fixed", discount_value: "50.00", apply_to: "all", category_id: null, product_id: null, min_order_amount: "200.00", influencer: null, start_date: iso(-30), expires_at: iso(40), is_active: true, max_uses: 500, used_count: 61, created_at: iso(-30) },
    { id: 3, code: "OUD15", discount_type: "percent", discount_value: "15", apply_to: "category", category_id: 5, product_id: null, min_order_amount: null, influencer: null, start_date: iso(-10), expires_at: iso(20), is_active: true, max_uses: 50, used_count: 12, created_at: iso(-10) },
    { id: 4, code: "SARA20", discount_type: "percent", discount_value: "20", apply_to: "product", category_id: null, product_id: pid(3), min_order_amount: null, influencer: { id: 7, name: "سارة المؤثرة" }, start_date: iso(-5), expires_at: iso(25), is_active: true, max_uses: 200, used_count: 38, created_at: iso(-5) },
    { id: 5, code: "OLD20", discount_type: "percent", discount_value: "20", apply_to: "all", category_id: null, product_id: null, min_order_amount: null, influencer: null, start_date: iso(-90), expires_at: iso(-15), is_active: true, max_uses: null, used_count: 220, created_at: iso(-90) },
    { id: 6, code: "MAXED", discount_type: "fixed", discount_value: "25.00", apply_to: "all", category_id: null, product_id: null, min_order_amount: null, influencer: null, start_date: iso(-20), expires_at: iso(30), is_active: true, max_uses: 100, used_count: 100, created_at: iso(-20) },
    { id: 7, code: "SOON", discount_type: "percent", discount_value: "30", apply_to: "all", category_id: null, product_id: null, min_order_amount: null, influencer: null, start_date: iso(7), expires_at: iso(14), is_active: true, max_uses: 300, used_count: 0, created_at: iso(-2) },
    { id: 8, code: "OFF", discount_type: "percent", discount_value: "5", apply_to: "all", category_id: null, product_id: null, min_order_amount: null, influencer: null, start_date: null, expires_at: null, is_active: false, max_uses: null, used_count: 9, created_at: iso(-60) },
  ];

  const bakhoor = products.find((p) => p.name.includes("بخور")) ?? products[0]!;
  state.offers = [
    { id: 1, name: "البخور 3 بـ 2", offer_type: "buy_x_get_y", discount_type: null, discount_value: null, min_order_amount: null, description: "اشترِ ثلاث علب بخور واحصل على الثالثة مجاناً", image: null, cta_text: "تسوّق البخور", buy_quantity: 3, buy_condition_type: "product", buy_category_id: null, buy_product_id: bakhoor.id, get_product_id: bakhoor.id, get_quantity: 1, get_discount_percent: 100, min_total_items: null, priority: 1, valid_from: iso(-20), valid_until: iso(40), is_active: true, created_at: iso(-20) },
    { id: 2, name: "شحن مجاني فوق 300", offer_type: "free_shipping", discount_type: null, discount_value: null, min_order_amount: "300.00", description: "التوصيل مجاني لكل الطلبات فوق 300 ريال", image: null, cta_text: "اطلب الآن", buy_quantity: null, buy_condition_type: null, buy_category_id: null, buy_product_id: null, get_product_id: null, get_quantity: null, get_discount_percent: null, min_total_items: null, priority: 2, valid_from: null, valid_until: null, is_active: true, created_at: iso(-45) },
    { id: 3, name: "خصم الشتاء", offer_type: "discount", discount_type: "percent", discount_value: "12", min_order_amount: "150.00", description: "12% على كل السلة لطلبات الشتاء", image: null, cta_text: "اكتشف العرض", buy_quantity: null, buy_condition_type: null, buy_category_id: null, buy_product_id: null, get_product_id: null, get_quantity: null, get_discount_percent: null, min_total_items: null, priority: 3, valid_from: iso(30), valid_until: iso(90), is_active: true, created_at: iso(-3) },
    { id: 4, name: "عرض العيد", offer_type: "discount", discount_type: "fixed", discount_value: "40.00", min_order_amount: "250.00", description: "40 ريالاً على طلبات العيد", image: null, cta_text: "", buy_quantity: null, buy_condition_type: null, buy_category_id: null, buy_product_id: null, get_product_id: null, get_quantity: null, get_discount_percent: null, min_total_items: null, priority: 4, valid_from: iso(-200), valid_until: iso(-160), is_active: false, created_at: iso(-200) },
  ];

  const orders = ordersState(store).orders;
  const customers = [...new Map(orders.map((o) => [o.customer_phone, o])).values()].slice(0, 14);
  state.carts = customers.map((o, i) => {
    const items = Array.from({ length: 1 + (i % 3) }, (_, k) => {
      const p = products[(i * 3 + k) % products.length]!;
      return { product_id: p.id, name: p.name, quantity: 1 + (k % 2), price: Number(p.price), image: p.image_url || null };
    });
    const status: CartStatus = i % 5 === 4 ? "recovered" : i % 7 === 6 ? "active" : "abandoned";
    const hoursAgo = status === "active" ? 1 : 3 + i * 9;
    const guest = i % 6 === 5;
    return {
      id: 300 + i,
      customer_name: guest ? null : o.customer_name,
      customer_phone: guest ? null : o.customer_phone,
      total: items.reduce((s, it) => s + it.price * it.quantity, 0),
      currency: "SAR",
      status,
      reminder_step: status === "abandoned" ? Math.min(2, Math.floor(hoursAgo / 24)) : 0,
      last_interaction_at: new Date(FIXTURE_NOW - hoursAgo * 3_600_000).toISOString(),
      last_reminder_sent_at: status === "abandoned" && hoursAgo > 3 ? new Date(FIXTURE_NOW - (hoursAgo - 2) * 3_600_000).toISOString() : null,
      recovered_order_id: status === "recovered" ? o.id : null,
      reminder_discount_coupon: status === "abandoned" && hoursAgo > 24 ? `CART${300 + i}` : null,
      items,
    };
  });
  state.cartSettings = { ...DEFAULT_SETTINGS };

  state.campaigns = [
    { id: 1, name: "تذكير رمضان", channel: "whatsapp", audience_type: "all", product_id: null, message: "رمضان كريم {customer_name}! عروض الشهر الفضيل بدأت في متجرنا.", status: "sent", scheduled_at: null, sent_at: iso(-40), recipients: { pending: 0, sent: 412, failed: 9 }, created_at: iso(-42) },
    { id: 2, name: "استرداد السلات", channel: "whatsapp", audience_type: "abandoned_carts", product_id: null, message: "ما زالت سلتك محفوظة — أكملها اليوم بخصم 10%.", status: "sent", scheduled_at: null, sent_at: iso(-7), recipients: { pending: 0, sent: 38, failed: 2 }, created_at: iso(-8) },
    { id: 3, name: "عودة العملاء الخاملين", channel: "whatsapp", audience_type: "dormant", product_id: null, message: "اشتقنا لك! كود WELCOME10 بانتظارك.", status: "scheduled", scheduled_at: iso(3, 10), sent_at: null, recipients: { pending: 126, sent: 0, failed: 0 }, created_at: iso(-1) },
    { id: 4, name: "عرض القهوة الجديد", channel: "sms", audience_type: "bought_product", product_id: pid(8), message: "وصلت دفعة جديدة من القهوة التي اشتريتها.", status: "draft", scheduled_at: null, sent_at: null, recipients: { pending: 0, sent: 0, failed: 0 }, created_at: iso(0) },
  ];

  state.events = [
    { id: 1, title: "موسم العودة للمدارس", event_type: "seasonal", color: "amber", start_date: dateOnly(-45), end_date: dateOnly(-20), linked_campaign_id: null, linked_offer_id: null, notes: "" },
    { id: 2, title: "اليوم الوطني", event_type: "holiday", color: "emerald", start_date: dateOnly(-25), end_date: dateOnly(-23), linked_campaign_id: null, linked_offer_id: 2, notes: "شحن مجاني طوال العطلة" },
    { id: 3, title: "حملة البخور", event_type: "campaign_plan", color: "indigo", start_date: dateOnly(-10), end_date: dateOnly(12), linked_campaign_id: 2, linked_offer_id: 1, notes: "ترويج العرض 3 بـ 2" },
    { id: 4, title: "الجمعة البيضاء", event_type: "seasonal", color: "rose", start_date: dateOnly(28), end_date: dateOnly(34), linked_campaign_id: 3, linked_offer_id: null, notes: "تحضير المخزون قبلها بأسبوعين" },
    { id: 5, title: "جرد نهاية السنة", event_type: "custom", color: "sky", start_date: dateOnly(60), end_date: dateOnly(75), linked_campaign_id: null, linked_offer_id: 3, notes: "" },
  ];
  state.gifting = { is_enabled: true };
  void rnd;
  return state;
}

export function marketingState(store: string | null): MarketingState {
  return storeState(store, "marketing", () => seed(store));
}

const money = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? null : displayMoney(Number(v), "SAR"));
const refOf = (store: string | null, kind: "category" | "product", id: number | null): Ref | null => {
  if (id === null) return null;
  const cat = catalog(store);
  const row = kind === "category" ? cat.categories.find((c) => c.id === id) : cat.products.find((p) => p.id === id);
  return row ? { id: row.id, name: row.name } : { id, name: kind === "category" ? "تصنيف محذوف" : "منتج محذوف" };
};

// ── Coupons ───────────────────────────────────────────────────────────────────────────
export function couponView(store: string | null, c: MockCoupon) {
  return {
    ...c,
    display_discount: c.discount_type === "percent" ? `${c.discount_value}%` : displayMoney(Number(c.discount_value), "SAR"),
    category: refOf(store, "category", c.category_id),
    product: refOf(store, "product", c.product_id),
    display_min_order_amount: money(c.min_order_amount),
  };
}

export function listCoupons(store: string | null, params: URLSearchParams) {
  const q = params.get("q")?.trim() ?? "";
  const status = params.get("status") as TemporalState | null;
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const size = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 50)));
  let rows = marketingState(store).coupons.filter((c) => (!q || includesNormalized(c.code, q) || includesNormalized(c.influencer?.name ?? "", q)) && (!status || couponState(c) === status));
  rows = rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { count: rows.length, results: rows.slice((page - 1) * size, page * size).map((c) => couponView(store, c)) };
}

function readCoupon(store: string | null, body: Record<string, unknown>, existing?: MockCoupon): MockResult<MockCoupon> {
  const errors: Record<string, string[]> = {};
  const code = String(body.code ?? existing?.code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) errors.code = ["الكود من 3 إلى 32 حرفاً لاتينياً أو رقماً."];
  if (existing?.influencer && code !== existing.code) errors.code = ["كود كوبون المؤثر لا يُغيَّر."];
  if (marketingState(store).coupons.some((c) => c.code === code && c.id !== existing?.id)) errors.code = ["هذا الكود مستخدم لكوبون آخر."];
  const discount_type = (body.discount_type ?? existing?.discount_type) as DiscountType;
  if (!DISCOUNT_TYPES.includes(discount_type)) errors.discount_type = ["نوع الخصم غير معروف."];
  const value = Number(body.discount_value ?? existing?.discount_value);
  if (!(value > 0)) errors.discount_value = ["القيمة يجب أن تكون أكبر من صفر."];
  else if (discount_type === "percent" && (value > 100 || !Number.isInteger(value))) errors.discount_value = ["النسبة بين 1 و100."];
  const apply_to = (body.apply_to ?? existing?.apply_to ?? "all") as MockCoupon["apply_to"];
  const category_id = apply_to === "category" ? Number(body.category_id ?? existing?.category_id) || null : null;
  const product_id = apply_to === "product" ? Number(body.product_id ?? existing?.product_id) || null : null;
  if (apply_to === "category" && !category_id) errors.category_id = ["اختر التصنيف."];
  if (apply_to === "product" && !product_id) errors.product_id = ["اختر المنتج."];
  const start_date = body.start_date ? new Date(String(body.start_date)).toISOString() : body.start_date === "" ? null : (existing?.start_date ?? null);
  const expires_at = body.expires_at ? new Date(String(body.expires_at)).toISOString() : body.expires_at === "" ? null : (existing?.expires_at ?? null);
  if (start_date && expires_at && expires_at <= start_date) errors.expires_at = ["تاريخ النهاية يجب أن يكون بعد البداية."];
  const max_uses = body.max_uses === "" || body.max_uses === null ? null : body.max_uses === undefined ? (existing?.max_uses ?? null) : Number(body.max_uses);
  if (max_uses !== null && !(Number.isInteger(max_uses) && max_uses > 0)) errors.max_uses = ["عدد صحيح أكبر من صفر."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  return {
    ok: true,
    data: {
      id: existing?.id ?? nextId(store, "coupon", 100),
      code,
      discount_type,
      discount_value: discount_type === "percent" ? String(Math.round(value)) : value.toFixed(2),
      apply_to,
      category_id,
      product_id,
      min_order_amount: body.min_order_amount ? Number(body.min_order_amount).toFixed(2) : body.min_order_amount === "" ? null : (existing?.min_order_amount ?? null),
      influencer: existing?.influencer ?? null,
      start_date,
      expires_at,
      is_active: body.is_active === undefined ? (existing?.is_active ?? true) : body.is_active === true || body.is_active === "true",
      max_uses,
      used_count: existing?.used_count ?? 0,
      created_at: existing?.created_at ?? new Date().toISOString(),
    },
  };
}

export function createCoupon(store: string | null, body: Record<string, unknown>) {
  const r = readCoupon(store, body);
  if (!r.ok) return r;
  marketingState(store).coupons.unshift(r.data);
  return { ok: true as const, data: couponView(store, r.data), status: 201 };
}
export function updateCoupon(store: string | null, id: number, body: Record<string, unknown>) {
  const state = marketingState(store);
  const i = state.coupons.findIndex((c) => c.id === id);
  if (i < 0) return { ok: false as const, status: 404, body: { detail: "الكوبون غير موجود." } };
  const r = readCoupon(store, body, state.coupons[i]);
  if (!r.ok) return r;
  state.coupons[i] = r.data;
  return { ok: true as const, data: couponView(store, r.data) };
}
export function deleteCoupon(store: string | null, id: number): MockResult<null> {
  const state = marketingState(store);
  const c = state.coupons.find((x) => x.id === id);
  if (!c) return { ok: false, status: 404, body: { detail: "الكوبون غير موجود." } };
  if (c.influencer) return { ok: false, status: 400, body: { detail: "كوبون المؤثر يُدار من صفحة المؤثرين." } };
  state.coupons = state.coupons.filter((x) => x.id !== id);
  return { ok: true, data: null, status: 204 };
}
export function getCoupon(store: string | null, id: number) {
  const c = marketingState(store).coupons.find((x) => x.id === id);
  return c ? couponView(store, c) : null;
}

// ── Offers ────────────────────────────────────────────────────────────────────────────
export function offerView(store: string | null, o: MockOffer) {
  return {
    ...o,
    display_discount: o.discount_type && o.discount_value ? (o.discount_type === "percent" ? `${o.discount_value}%` : displayMoney(Number(o.discount_value), "SAR")) : null,
    display_min_order_amount: money(o.min_order_amount),
    buy_category: refOf(store, "category", o.buy_category_id),
    buy_product: refOf(store, "product", o.buy_product_id),
    get_product: refOf(store, "product", o.get_product_id),
  };
}
export function listOffers(store: string | null, params: URLSearchParams) {
  const q = params.get("q")?.trim() ?? "";
  const status = params.get("status");
  const type = params.get("offer_type");
  const rows = marketingState(store)
    .offers.filter((o) => (!q || includesNormalized(o.name, q)) && (!status || couponState({ is_active: o.is_active, start_date: o.valid_from, expires_at: o.valid_until, max_uses: null, used_count: 0 }) === status) && (!type || o.offer_type === type))
    .sort((a, b) => a.priority - b.priority || b.created_at.localeCompare(a.created_at));
  return { count: rows.length, results: rows.map((o) => offerView(store, o)) };
}
function readOffer(store: string | null, body: Record<string, unknown>, existing?: MockOffer): MockResult<MockOffer> {
  const errors: Record<string, string[]> = {};
  const name = String(body.name ?? existing?.name ?? "").trim();
  if (name.length < 2) errors.name = ["أدخل اسم العرض."];
  const offer_type = (body.offer_type ?? existing?.offer_type) as OfferType;
  if (!OFFER_TYPES.includes(offer_type)) errors.offer_type = ["نوع العرض غير معروف."];
  const num = (key: string, fallback: number | null): number | null => (body[key] === undefined ? fallback : body[key] === "" || body[key] === null ? null : Number(body[key]));
  let discount_type: DiscountType | null = null;
  let discount_value: string | null = null;
  if (offer_type === "discount") {
    discount_type = (body.discount_type ?? existing?.discount_type ?? "percent") as DiscountType;
    const v = Number(body.discount_value ?? existing?.discount_value);
    if (!(v > 0)) errors.discount_value = ["القيمة يجب أن تكون أكبر من صفر."];
    else if (discount_type === "percent" && v > 100) errors.discount_value = ["النسبة بين 1 و100."];
    discount_value = discount_type === "percent" ? String(Math.round(v)) : v.toFixed(2);
  }
  const bx = offer_type === "buy_x_get_y";
  const buy_condition_type = bx ? ((body.buy_condition_type ?? existing?.buy_condition_type ?? "all") as BuyCondition) : null;
  if (bx && !BUY_CONDITIONS.includes(buy_condition_type!)) errors.buy_condition_type = ["شرط الشراء غير معروف."];
  const buy_quantity = bx ? num("buy_quantity", existing?.buy_quantity ?? null) : null;
  const get_quantity = bx ? num("get_quantity", existing?.get_quantity ?? null) : null;
  const get_discount_percent = bx ? num("get_discount_percent", existing?.get_discount_percent ?? null) : null;
  const get_product_id = bx ? num("get_product_id", existing?.get_product_id ?? null) : null;
  const min_total_items = bx && buy_condition_type === "min_items" ? num("min_total_items", existing?.min_total_items ?? null) : null;
  const buy_category_id = bx && buy_condition_type === "category" ? num("buy_category_id", existing?.buy_category_id ?? null) : null;
  const buy_product_id = bx && buy_condition_type === "product" ? num("buy_product_id", existing?.buy_product_id ?? null) : null;
  if (bx) {
    if (!(buy_quantity && buy_quantity > 0)) errors.buy_quantity = ["عدد صحيح أكبر من صفر."];
    if (!(get_quantity && get_quantity > 0)) errors.get_quantity = ["عدد صحيح أكبر من صفر."];
    if (!(get_discount_percent && get_discount_percent >= 1 && get_discount_percent <= 100)) errors.get_discount_percent = ["النسبة بين 1 و100."];
    if (!get_product_id) errors.get_product_id = ["اختر المنتج الممنوح."];
    if (buy_condition_type === "category" && !buy_category_id) errors.buy_category_id = ["اختر التصنيف."];
    if (buy_condition_type === "product" && !buy_product_id) errors.buy_product_id = ["اختر المنتج."];
    if (buy_condition_type === "min_items" && !(min_total_items && min_total_items > 0)) errors.min_total_items = ["عدد صحيح أكبر من صفر."];
  }
  const priority = num("priority", existing?.priority ?? 10) ?? 10;
  if (!Number.isInteger(priority) || priority < 0) errors.priority = ["الأولوية عدد صحيح."];
  const valid_from = body.valid_from ? new Date(String(body.valid_from)).toISOString() : body.valid_from === "" ? null : (existing?.valid_from ?? null);
  const valid_until = body.valid_until ? new Date(String(body.valid_until)).toISOString() : body.valid_until === "" ? null : (existing?.valid_until ?? null);
  if (valid_from && valid_until && valid_until <= valid_from) errors.valid_until = ["تاريخ النهاية يجب أن يكون بعد البداية."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  return {
    ok: true,
    data: {
      id: existing?.id ?? nextId(store, "offer", 100),
      name,
      offer_type,
      discount_type,
      discount_value,
      min_order_amount: body.min_order_amount ? Number(body.min_order_amount).toFixed(2) : body.min_order_amount === "" ? null : (existing?.min_order_amount ?? null),
      description: String(body.description ?? existing?.description ?? "").trim(),
      image: typeof body.image === "string" ? body.image || null : (existing?.image ?? null),
      cta_text: String(body.cta_text ?? existing?.cta_text ?? "").trim(),
      buy_quantity,
      buy_condition_type,
      buy_category_id,
      buy_product_id,
      get_product_id,
      get_quantity,
      get_discount_percent,
      min_total_items,
      priority,
      valid_from,
      valid_until,
      is_active: body.is_active === undefined ? (existing?.is_active ?? true) : body.is_active === true || body.is_active === "true",
      created_at: existing?.created_at ?? new Date().toISOString(),
    },
  };
}
export function createOffer(store: string | null, body: Record<string, unknown>) {
  const r = readOffer(store, body);
  if (!r.ok) return r;
  marketingState(store).offers.push(r.data);
  return { ok: true as const, data: offerView(store, r.data), status: 201 };
}
export function updateOffer(store: string | null, id: number, body: Record<string, unknown>) {
  const state = marketingState(store);
  const i = state.offers.findIndex((o) => o.id === id);
  if (i < 0) return { ok: false as const, status: 404, body: { detail: "العرض غير موجود." } };
  const r = readOffer(store, body, state.offers[i]);
  if (!r.ok) return r;
  state.offers[i] = r.data;
  return { ok: true as const, data: offerView(store, r.data) };
}
export function deleteOffer(store: string | null, id: number): MockResult<null> {
  const state = marketingState(store);
  if (!state.offers.some((o) => o.id === id)) return { ok: false, status: 404, body: { detail: "العرض غير موجود." } };
  state.offers = state.offers.filter((o) => o.id !== id);
  return { ok: true, data: null, status: 204 };
}
export function getOffer(store: string | null, id: number) {
  const o = marketingState(store).offers.find((x) => x.id === id);
  return o ? offerView(store, o) : null;
}

// ── Abandoned carts ───────────────────────────────────────────────────────────────────
export function cartView(c: MockCart) {
  const { total, ...rest } = c;
  return { ...rest, display_total: displayMoney(total, "SAR"), items_count: c.items.reduce((n, it) => n + it.quantity, 0), items: c.items.map((it) => ({ ...it, display_price: displayMoney(it.price, "SAR") })) };
}
export function listCarts(store: string | null, params: URLSearchParams) {
  const status = params.get("status");
  const from = params.get("from");
  const to = params.get("to");
  const q = params.get("q")?.trim() ?? "";
  const all = marketingState(store).carts;
  const rows = all
    .filter((c) => (!status || c.status === status) && (!from || c.last_interaction_at >= from) && (!to || c.last_interaction_at.slice(0, 10) <= to) && (!q || includesNormalized(c.customer_name ?? "", q) || (c.customer_phone ?? "").includes(q.replace(/^0/, "967"))))
    .sort((a, b) => b.last_interaction_at.localeCompare(a.last_interaction_at));
  return {
    count: rows.length,
    counters: { active: all.filter((c) => c.status === "active").length, abandoned: all.filter((c) => c.status === "abandoned").length, recovered: all.filter((c) => c.status === "recovered").length },
    results: rows.map(cartView),
  };
}
export function getCart(store: string | null, id: number) {
  const c = marketingState(store).carts.find((x) => x.id === id);
  return c ? cartView(c) : null;
}
export function remindCart(store: string | null, id: number): MockResult<ReturnType<typeof cartView>> {
  const c = marketingState(store).carts.find((x) => x.id === id);
  if (!c) return { ok: false, status: 404, body: { detail: "السلة غير موجودة." } };
  if (!c.customer_phone) return { ok: false, status: 400, body: { detail: "لا رقم هاتف لهذه السلة." } };
  if (c.status !== "abandoned") return { ok: false, status: 400, body: { detail: "التذكير متاح للسلات المتروكة فقط." } };
  c.reminder_step = Math.min(2, c.reminder_step + 1);
  c.last_reminder_sent_at = new Date().toISOString();
  if (c.reminder_step === 2 && !c.reminder_discount_coupon) c.reminder_discount_coupon = `CART${c.id}`;
  return { ok: true, data: cartView(c) };
}
export function cartSettings(store: string | null) {
  return marketingState(store).cartSettings;
}
export function updateCartSettings(store: string | null, body: Record<string, unknown>): MockResult<MockCartSettings> {
  const s = marketingState(store).cartSettings;
  const errors: Record<string, string[]> = {};
  const next = { ...s };
  for (const key of ["is_enabled", "channel_whatsapp", "channel_conversational_enabled"] as const) if (key in body) next[key] = body[key] === true || body[key] === "true";
  for (const key of ["reminder_1_delay_hours", "reminder_2_delay_hours", "discount_validity_hours", "discount_percent"] as const) {
    if (!(key in body)) continue;
    const n = Number(body[key]);
    if (!Number.isInteger(n) || n < (key === "discount_percent" ? 0 : 1) || (key === "discount_percent" && n > 100)) errors[key] = ["قيمة غير صالحة."];
    else next[key] = n;
  }
  for (const key of ["reminder_1_message", "reminder_2_message"] as const) if (typeof body[key] === "string") next[key] = body[key].trim();
  if ("min_cart_value" in body) {
    const n = Number(body.min_cart_value);
    if (!(n >= 0)) errors.min_cart_value = ["قيمة غير صالحة."];
    else next.min_cart_value = n.toFixed(2);
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  Object.assign(s, next);
  return { ok: true, data: s };
}

// ── Campaigns ─────────────────────────────────────────────────────────────────────────
export function campaignView(store: string | null, c: MockCampaign) {
  return { ...c, product: refOf(store, "product", c.product_id), channel_connected: CONNECTED_CHANNELS.includes(c.channel) };
}
export function listCampaigns(store: string | null, params: URLSearchParams) {
  const status = params.get("status");
  const q = params.get("q")?.trim() ?? "";
  const rows = marketingState(store)
    .campaigns.filter((c) => (!status || c.status === status) && (!q || includesNormalized(c.name, q)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { count: rows.length, results: rows.map((c) => campaignView(store, c)) };
}
export function getCampaign(store: string | null, id: number) {
  const c = marketingState(store).campaigns.find((x) => x.id === id);
  return c ? campaignView(store, c) : null;
}
function readCampaign(store: string | null, body: Record<string, unknown>, existing?: MockCampaign): MockResult<MockCampaign> {
  const errors: Record<string, string[]> = {};
  const name = String(body.name ?? existing?.name ?? "").trim();
  if (name.length < 2) errors.name = ["أدخل اسم الحملة."];
  const channel = (body.channel ?? existing?.channel) as Channel;
  if (!CHANNELS.includes(channel)) errors.channel = ["القناة غير معروفة."];
  const audience_type = (body.audience_type ?? existing?.audience_type) as Audience;
  if (!AUDIENCES.includes(audience_type)) errors.audience_type = ["الجمهور غير معروف."];
  const product_id = audience_type === "bought_product" ? Number(body.product_id ?? existing?.product_id) || null : null;
  if (audience_type === "bought_product" && !product_id) errors.product_id = ["اختر المنتج."];
  const message = String(body.message ?? existing?.message ?? "").trim();
  if (message.length < 5) errors.message = ["أدخل نص الرسالة."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  return {
    ok: true,
    data: { id: existing?.id ?? nextId(store, "campaign", 100), name, channel, audience_type, product_id, message, status: existing?.status ?? "draft", scheduled_at: existing?.scheduled_at ?? null, sent_at: existing?.sent_at ?? null, recipients: existing?.recipients ?? { pending: 0, sent: 0, failed: 0 }, created_at: existing?.created_at ?? new Date().toISOString() },
  };
}
export function createCampaign(store: string | null, body: Record<string, unknown>) {
  const r = readCampaign(store, body);
  if (!r.ok) return r;
  marketingState(store).campaigns.unshift(r.data);
  return { ok: true as const, data: campaignView(store, r.data), status: 201 };
}
export function updateCampaign(store: string | null, id: number, body: Record<string, unknown>) {
  const state = marketingState(store);
  const i = state.campaigns.findIndex((c) => c.id === id);
  if (i < 0) return { ok: false as const, status: 404, body: { detail: "الحملة غير موجودة." } };
  const c = state.campaigns[i]!;
  if (c.status === "sent") return { ok: false as const, status: 400, body: { detail: "الحملة المرسلة للقراءة فقط." } };
  if (body.status === "draft" && c.status === "scheduled") {
    c.status = "draft";
    c.scheduled_at = null;
    c.recipients = { pending: 0, sent: 0, failed: 0 };
    return { ok: true as const, data: campaignView(store, c) };
  }
  const r = readCampaign(store, body, c);
  if (!r.ok) return r;
  state.campaigns[i] = r.data;
  return { ok: true as const, data: campaignView(store, r.data) };
}
/** The audience size the server would address (M07/M13 segments): from the order fixture. */
/**
 * Campaign audience size = the M07 customer segment count (merge, Phase 5), so the number on
 * the campaign form, the customers segment bar and the sent count always agree.
 */
export function audienceCount(store: string | null, audience: Audience, productId: number | null): number {
  const params = new URLSearchParams({ segment: audience });
  if (productId) params.set("product_id", String(productId));
  return segmentCount(store, params).count;
}
export function previewCampaign(store: string | null, id: number) {
  const c = marketingState(store).campaigns.find((x) => x.id === id);
  if (!c) return null;
  const sample = ordersState(store).orders[0]?.customer_name ?? "عميلنا";
  return { recipients_count: audienceCount(store, c.audience_type, c.product_id), rendered_message: c.message.replaceAll("{customer_name}", sample) };
}
export function sendCampaign(store: string | null, id: number, body: Record<string, unknown>): MockResult<ReturnType<typeof campaignView>> {
  const c = marketingState(store).campaigns.find((x) => x.id === id);
  if (!c) return { ok: false, status: 404, body: { detail: "الحملة غير موجودة." } };
  if (c.status === "sent") return { ok: false, status: 400, body: { detail: "أُرسلت هذه الحملة من قبل." } };
  if (!CONNECTED_CHANNELS.includes(c.channel)) return { ok: false, status: 400, body: { detail: "القناة غير مربوطة — اربطها أولاً." } };
  const count = audienceCount(store, c.audience_type, c.product_id);
  if (body.schedule_at) {
    const at = new Date(String(body.schedule_at));
    if (Number.isNaN(at.getTime()) || at.getTime() < Date.now()) return { ok: false, status: 400, body: { schedule_at: ["اختر وقتاً في المستقبل."] } };
    c.status = "scheduled";
    c.scheduled_at = at.toISOString();
    c.recipients = { pending: count, sent: 0, failed: 0 };
  } else {
    c.status = "sent";
    c.sent_at = new Date().toISOString();
    c.scheduled_at = null;
    const failed = Math.floor(count * 0.02);
    c.recipients = { pending: 0, sent: count - failed, failed };
  }
  return { ok: true, data: campaignView(store, c) };
}
export function channelStatuses() {
  return CHANNELS.map((channel) => ({ channel, connected: CONNECTED_CHANNELS.includes(channel), manage_href: CHANNEL_MANAGE_HREF[channel] }));
}

// ── Timeline ──────────────────────────────────────────────────────────────────────────
export function eventView(store: string | null, e: MockEvent) {
  const state = marketingState(store);
  const camp = e.linked_campaign_id ? state.campaigns.find((c) => c.id === e.linked_campaign_id) : null;
  const offer = e.linked_offer_id ? state.offers.find((o) => o.id === e.linked_offer_id) : null;
  return { ...e, linked_campaign: camp ? { id: camp.id, name: camp.name, status: camp.status } : null, linked_offer: offer ? { id: offer.id, name: offer.name, is_active: offer.is_active } : null };
}
export function listEvents(store: string | null, params: URLSearchParams) {
  const from = params.get("from");
  const to = params.get("to");
  return marketingState(store)
    .events.filter((e) => (!from || e.end_date >= from) && (!to || e.start_date <= to))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map((e) => eventView(store, e));
}
function readEvent(store: string | null, body: Record<string, unknown>, existing?: MockEvent): MockResult<MockEvent> {
  const errors: Record<string, string[]> = {};
  const title = String(body.title ?? existing?.title ?? "").trim();
  if (title.length < 2) errors.title = ["أدخل عنوان الحدث."];
  const event_type = (body.event_type ?? existing?.event_type ?? "custom") as EventType;
  if (!EVENT_TYPES.includes(event_type)) errors.event_type = ["النوع غير معروف."];
  const color = (body.color ?? existing?.color ?? "indigo") as EventColor;
  if (!EVENT_COLORS.includes(color)) errors.color = ["اللون غير معروف."];
  const start_date = String(body.start_date ?? existing?.start_date ?? "");
  const end_date = String(body.end_date ?? existing?.end_date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) errors.start_date = ["تاريخ غير صالح."];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end_date)) errors.end_date = ["تاريخ غير صالح."];
  if (end_date < start_date) errors.end_date = ["تاريخ النهاية يجب أن يكون بعد البداية."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  const idOf = (key: string, fallback: number | null) => (body[key] === undefined ? fallback : body[key] === "" || body[key] === null ? null : Number(body[key]));
  return {
    ok: true,
    data: { id: existing?.id ?? nextId(store, "event", 100), title, event_type, color, start_date, end_date, linked_campaign_id: idOf("linked_campaign_id", existing?.linked_campaign_id ?? null), linked_offer_id: idOf("linked_offer_id", existing?.linked_offer_id ?? null), notes: String(body.notes ?? existing?.notes ?? "").trim() },
  };
}
export function createEvent(store: string | null, body: Record<string, unknown>) {
  const r = readEvent(store, body);
  if (!r.ok) return r;
  marketingState(store).events.push(r.data);
  return { ok: true as const, data: eventView(store, r.data), status: 201 };
}
export function updateEvent(store: string | null, id: number, body: Record<string, unknown>) {
  const state = marketingState(store);
  const i = state.events.findIndex((e) => e.id === id);
  if (i < 0) return { ok: false as const, status: 404, body: { detail: "الحدث غير موجود." } };
  const r = readEvent(store, body, state.events[i]);
  if (!r.ok) return r;
  state.events[i] = r.data;
  return { ok: true as const, data: eventView(store, r.data) };
}
export function deleteEvent(store: string | null, id: number): MockResult<null> {
  const state = marketingState(store);
  if (!state.events.some((e) => e.id === id)) return { ok: false, status: 404, body: { detail: "الحدث غير موجود." } };
  state.events = state.events.filter((e) => e.id !== id);
  return { ok: true, data: null, status: 204 };
}

// ── Gifting · summary ─────────────────────────────────────────────────────────────────
export function gifting(store: string | null) {
  return marketingState(store).gifting;
}
export function updateGifting(store: string | null, body: Record<string, unknown>) {
  const g = marketingState(store).gifting;
  if ("is_enabled" in body) g.is_enabled = body.is_enabled === true || body.is_enabled === "true";
  return g;
}
export function marketingSummary(store: string | null) {
  const s = marketingState(store);
  const today = new Date(FIXTURE_NOW).toISOString().slice(0, 10);
  const last = [...s.campaigns].sort((a, b) => (b.sent_at ?? b.created_at).localeCompare(a.sent_at ?? a.created_at))[0];
  return {
    active_coupons: s.coupons.filter((c) => couponState(c) === "active").length,
    active_offers: s.offers.filter((o) => couponState({ is_active: o.is_active, start_date: o.valid_from, expires_at: o.valid_until, max_uses: null, used_count: 0 }) === "active").length,
    abandoned_today: s.carts.filter((c) => c.status === "abandoned" && c.last_interaction_at.slice(0, 10) === today).length,
    last_campaign: last ? { id: last.id, name: last.name, status: last.status, sent_at: last.sent_at } : null,
  };
}
