import type { Currency } from "@/lib/schemas/money";
import { bookSlotForOrder } from "@/mocks/bookings/state";
import { normalizePhone } from "@/lib/format";
import { catalog } from "@/mocks/catalog/state";
import {
  insertStorefrontOrder,
  orderByClientUuid,
  orderByUuid,
  storefrontEvent,
  type MockLine,
  type MockOrder,
} from "@/mocks/orders/state";
import { readSettings } from "@/mocks/settings/state";
import { checkoutDeliveryMethods, checkoutPickups } from "@/mocks/shipping/state";
import { storeState } from "@/mocks/store-state";
import { findVisible, nowMs, unitPrice } from "@/mocks/storefront/catalog";
import { cartTotals, getCart, priceLines, type MockCart } from "@/mocks/storefront/cart";
import { convert, fmt, fromSar, round2, storeRates, type Rates } from "@/mocks/storefront/money";
import { isVerified, normalizeBuyerPhone, verifyOtp } from "@/mocks/storefront/otp";

/**
 * The mock SERVER for checkout (M12 §7 — Django serves every row since INT-014; this fixture
 * answers only while Django is down or `SHARWA_MOCKS` is on, and follows Django's rules:
 * a transfer needs its receipt + amount, COD is off whenever something is due upfront). It reuses the session cart, the
 * store's `StoreSetting` flags (M34) and writes the order into the SAME orders state the
 * M06 dashboard lists, so a storefront purchase shows up for the merchant immediately.
 *
 * Money: the cart's currency is the invoice currency; the order is stored in SAR for the
 * dashboard (its fixture is single-currency) together with the locked SAR→currency rate,
 * which the buyer-facing projections (success page, tracking) use.
 */
type Result<T> = { ok: true; data: T; status?: number } | { ok: false; status: number; body: Record<string, unknown> };

export const CHECKOUT_METHODS = ["manual", "sharwa_pay", "jeeb", "kuraimi", "cod"] as const;
export type CheckoutMethod = (typeof CHECKOUT_METHODS)[number];

const METHOD_LABELS: Record<CheckoutMethod, string> = {
  manual: "تحويل بنكي / محفظة محلية",
  sharwa_pay: "شروة باي",
  jeeb: "جيب",
  kuraimi: "الكريمي",
  cod: "الدفع عند الاستلام",
};

/** Phones the fixture `CentralCustomerTrust` marks too risky for COD (M12 US-12.3.4). */
const RISKY_PHONES = new Set(["967770000099"]);
const WALLET_BALANCE_SAR = 120; // fixture customer wallet (SAR only)
const SHARWA_PAY_BALANCE_SAR = 300;
const LOYALTY = { balance: 1250, min_points_to_redeem: 500, points_per_riyal: 10 };

function payoutAccounts(store: string | null) {
  if (store !== "noor") return [{ account_type: "bank" as const, provider_name: "بنك التضامن", account_number: "0102030405", account_name: "سوق الحكمة" }];
  return [
    { account_type: "bank" as const, provider_name: "بنك الكريمي", account_number: "3021445566770", account_name: "متجر نور للتجارة" },
    { account_type: "wallet" as const, provider_name: "جوالي", account_number: "770000011", account_name: "متجر نور" },
  ];
}

// ── Delivery options ──────────────────────────────────────────────────────────────────
/**
 * Read from the M15 shipping state (one source — Phase 5 open item 6): a method the
 * merchant adds or disables in «طرق التوصيل», or a pickup point, shows at checkout at once.
 * Method prices are YER_NEW decimals, converted here like `default_delivery_fee`.
 */
function methodsFor(store: string | null) {
  return { methods: checkoutDeliveryMethods(store), pickups: checkoutPickups(store) };
}

export function deliveryOptions(store: string | null, cartId: string) {
  const cart = getCart(store, cartId);
  const rates = storeRates(store);
  const totals = cartTotals(store, cart, priceLines(store, cart, cart.currency, rates), cart.currency, rates);
  const s = readSettings(store, "");
  const { methods, pickups } = methodsFor(store);
  return {
    delivery_methods: methods.map((m) => ({
      id: m.id,
      name: m.name,
      display_price: fmt(convert(Number(m.price), "YER_NEW", cart.currency, rates), cart.currency),
      estimated_time: m.estimated_time,
      is_sharwa_official: m.is_sharwa_official,
    })),
    pickup_locations: pickups.map((p) => ({ id: p.id, name: p.name, address: p.address, phone: p.phone })),
    display_default_delivery_fee: fmt(convert(Number(s.default_delivery_fee), "YER_NEW", cart.currency, rates), cart.currency),
    free_shipping_applies: totals.freeShippingApplies,
    currency: cart.currency,
  };
}

// ── Payment options ───────────────────────────────────────────────────────────────────
export function paymentOptions(store: string | null, cartId: string) {
  const cart = getCart(store, cartId);
  const rates = storeRates(store);
  const lines = priceLines(store, cart, cart.currency, rates);
  const s = readSettings(store, "");
  // Django: COD only when nothing is due upfront (`upfront_required == 0`) — full or deposit lines block it.
  const needsUpfront = lines.some((l) => l.paymentPolicy === "full" || l.depositSar > 0);
  const methods: Array<{ code: CheckoutMethod; label: string; enabled: boolean; reason?: string; fields?: Array<{ name: string; label: string; secret: boolean }> }> = [];
  if (s.enable_manual_payment) methods.push({ code: "manual", label: METHOD_LABELS.manual, enabled: true });
  if (s.enable_sharwa_pay) methods.push({ code: "sharwa_pay", label: METHOD_LABELS.sharwa_pay, enabled: true });
  if (store === "noor") methods.push({ code: "jeeb", label: METHOD_LABELS.jeeb, enabled: true, fields: [{ name: "purchase_code", label: "كود الشراء من تطبيق جيب", secret: false }] });
  methods.push({
    code: "cod",
    label: METHOD_LABELS.cod,
    enabled: !needsUpfront,
    reason: needsUpfront ? "هذا الطلب يتطلب الدفع مقدماً" : undefined,
  });
  return { methods, payout_accounts: s.enable_manual_payment ? payoutAccounts(store) : [] };
}

// ── Quote (`build_order_invoice`) ────────────────────────────────────────────────────
interface QuoteInput {
  delivery_method_id?: unknown;
  pickup_location_id?: unknown;
  payment_method?: unknown;
  use_wallet?: unknown;
  phone?: unknown;
  redeem_points?: unknown;
  checkout_mode?: unknown;
  product_id?: unknown;
  variant_id?: unknown;
  size?: unknown;
  color?: unknown;
  quantity?: unknown;
  start_datetime?: unknown;
}

/** The cart the invoice is built from: the session cart, or a one-line cart for «اشترِ الآن» (US-12.5.3). */
function effectiveCart(store: string | null, cartId: string, input: QuoteInput): MockCart {
  const cart = getCart(store, cartId);
  if (input.checkout_mode !== "buy_now") return cart;
  const productId = Number(input.product_id);
  const variantId = input.variant_id ? Number(input.variant_id) : null;
  return {
    ...cart,
    coupon: cart.coupon,
    lines: Number.isInteger(productId)
      ? [
          {
            key: `buy-now-${productId}`,
            product_id: productId,
            size: typeof input.size === "string" && input.size ? input.size : null,
            color: typeof input.color === "string" && input.color ? input.color : null,
            variant_id: variantId,
            quantity: Math.max(1, Number(input.quantity ?? 1) || 1),
            start_datetime: typeof input.start_datetime === "string" && input.start_datetime ? input.start_datetime : null,
            personalization: null,
          },
        ]
      : [],
  };
}

interface Invoice {
  subtotal: number;
  discount: number;
  promotion: number;
  offers: Array<{ name: string; offer_type: "discount" | "free_shipping" | "buy_x_get_y"; amount: number }>;
  couponCode: string | null;
  delivery: number;
  wallet: number;
  loyalty: number;
  total: number;
  deposit: number;
  upfront: number | null;
  onDelivery: number | null;
  freeShipping: boolean;
  currency: Currency;
}

function buildInvoice(store: string | null, cart: MockCart, input: QuoteInput, rates: Rates): Result<Invoice> {
  const currency = cart.currency;
  const lines = priceLines(store, cart, currency, rates);
  const totals = cartTotals(store, cart, lines, currency, rates);
  const s = readSettings(store, "");
  const { methods, pickups } = methodsFor(store);
  const errors: Record<string, string[]> = {};

  let delivery = 0;
  if (input.pickup_location_id) {
    if (!pickups.some((p) => p.id === Number(input.pickup_location_id))) errors.pickup_location_id = ["نقطة الاستلام غير متاحة."];
  } else if (input.delivery_method_id) {
    const m = methods.find((x) => x.id === Number(input.delivery_method_id));
    if (!m) errors.delivery_method_id = ["طريقة التوصيل لم تعد متاحة، اختر غيرها."];
    else delivery = convert(Number(m.price), "YER_NEW", currency, rates);
  } else {
    delivery = convert(Number(s.default_delivery_fee), "YER_NEW", currency, rates);
  }
  if (totals.freeShippingApplies) delivery = 0;

  const beforeCredits = round2(totals.subtotal - totals.promotion - totals.coupon + delivery);

  let loyalty = 0;
  const points = Number(input.redeem_points ?? 0);
  if (points > 0) {
    if (points < LOYALTY.min_points_to_redeem) errors.redeem_points = [`أقل عدد نقاط للاستبدال ${LOYALTY.min_points_to_redeem}.`];
    else if (points > LOYALTY.balance) errors.redeem_points = ["رصيد النقاط لا يكفي."];
    else loyalty = Math.min(convert(points / LOYALTY.points_per_riyal, "SAR", currency, rates), beforeCredits);
  }

  let wallet = 0;
  if (input.use_wallet === true || input.use_wallet === "true") {
    if (currency !== "SAR") errors.use_wallet = ["المحفظة متاحة بالريال السعودي فقط — بدّل العملة لاستخدامها."];
    else wallet = Math.min(WALLET_BALANCE_SAR, Math.max(0, beforeCredits - loyalty));
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };

  const total = round2(Math.max(0, beforeCredits - loyalty - wallet));
  const deposit = convert(lines.reduce((a, l) => a + l.depositSar, 0), "SAR", currency, rates);
  const cod = input.payment_method === "cod" || input.payment_method === undefined || input.payment_method === "";
  const upfront = deposit > 0 && cod ? Math.min(deposit, total) : null;
  return {
    ok: true,
    data: {
      subtotal: totals.subtotal,
      discount: round2(totals.coupon + loyalty),
      promotion: totals.promotion,
      offers: totals.offers,
      couponCode: totals.couponCode,
      delivery: round2(delivery),
      wallet: round2(wallet),
      loyalty: round2(loyalty),
      total,
      deposit,
      upfront,
      onDelivery: upfront === null ? null : round2(total - upfront),
      freeShipping: totals.freeShippingApplies,
      currency,
    },
  };
}

function invoiceView(inv: Invoice) {
  const m = (n: number) => fmt(n, inv.currency);
  return {
    display_subtotal: m(inv.subtotal),
    display_discount: inv.discount > 0 ? m(inv.discount) : null,
    display_promotion_discount: inv.promotion > 0 ? m(inv.promotion) : null,
    applied_offers: inv.offers.map((o) => ({ name: o.name, offer_type: o.offer_type, display_discount: m(o.amount) })),
    coupon_code: inv.couponCode,
    display_delivery_fee: m(inv.delivery),
    free_shipping_applies: inv.freeShipping,
    display_wallet_amount_used: inv.wallet > 0 ? m(inv.wallet) : null,
    display_loyalty_discount: inv.loyalty > 0 ? m(inv.loyalty) : null,
    display_total: m(inv.total),
    display_deposit_amount: inv.deposit > 0 ? m(inv.deposit) : null,
    display_upfront_required: inv.upfront === null ? null : m(inv.upfront),
    display_amount_on_delivery: inv.onDelivery === null ? null : m(inv.onDelivery),
    fully_paid_by_wallet: inv.wallet > 0 && inv.total === 0,
    currency: inv.currency,
  };
}

export function quote(store: string | null, cartId: string, input: QuoteInput): Result<ReturnType<typeof invoiceView>> {
  const cart = effectiveCart(store, cartId, input);
  if (cart.lines.length === 0) return { ok: false, status: 400, body: { detail: "لا يمكن إتمام طلب بسلة فارغة." } };
  const inv = buildInvoice(store, cart, input, storeRates(store));
  return inv.ok ? { ok: true, data: invoiceView(inv.data) } : inv;
}

// ── OTP-backed previews (wallet, Sharwa Pay, loyalty) ────────────────────────────────
export function walletPreview(store: string | null, cartId: string, rawPhone: unknown) {
  const phone = normalizeBuyerPhone(rawPhone);
  if (!phone) return { ok: false as const, status: 400, body: { phone: ["رقم واتساب غير صحيح."] } };
  const cart = getCart(store, cartId);
  const rates = storeRates(store);
  const totals = cartTotals(store, cart, priceLines(store, cart, "SAR", rates), "SAR", rates);
  return {
    ok: true as const,
    data: {
      display_balance: fmt(WALLET_BALANCE_SAR, "SAR"),
      display_applicable: fmt(Math.min(WALLET_BALANCE_SAR, totals.total), "SAR"),
      currency_ok: cart.currency === "SAR",
    },
  };
}

export function sharwaPayBalance() {
  return { display_balance: fmt(SHARWA_PAY_BALANCE_SAR, "SAR") };
}

export function loyaltyBalance(store: string | null, rawPhone: unknown) {
  const s = store === "noor";
  if (!s) return { ok: false as const, status: 404, body: { detail: "برنامج الولاء غير مفعّل في هذا المتجر." } };
  const phone = normalizeBuyerPhone(rawPhone);
  if (!phone) return { ok: false as const, status: 400, body: { phone: ["رقم واتساب غير صحيح."] } };
  return {
    ok: true as const,
    data: {
      balance: LOYALTY.balance,
      min_points_to_redeem: LOYALTY.min_points_to_redeem,
      display_value: fmt(LOYALTY.balance / LOYALTY.points_per_riyal, "SAR"),
      points_per_riyal: LOYALTY.points_per_riyal,
    },
  };
}

// ── Create the order (`POST /api/v1/checkout/`) ──────────────────────────────────────
export type CheckoutFields = Record<string, unknown>;

interface Placed {
  order_id: number;
  public_uuid: string;
  status: MockOrder["status"];
  payment_status: MockOrder["payment_status"];
  display_total: string;
  next_action: { type: "none" | "redirect_gateway" | "show_transfer_instructions"; url?: string };
}

function placedView(o: MockOrder): Placed {
  const method = o.checkout_method ?? "cod";
  return {
    order_id: o.id,
    public_uuid: o.public_uuid,
    status: o.status,
    payment_status: o.payment_status,
    display_total: orderMoney(o, orderTotalSar(o)),
    next_action:
      method === "jeeb" || method === "kuraimi"
        ? { type: "redirect_gateway", url: `/checkout/result?order=${o.public_uuid}` }
        : method === "manual"
          ? { type: "show_transfer_instructions" }
          : { type: "none" },
  };
}

const bool = (v: unknown) => v === true || v === "true" || v === "on" || v === "1";
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const gatewayQueue = (store: string | null) => storeState(store, "storefront:gateway", () => new Map<string, number>());

export function placeOrder(store: string | null, cartId: string, f: CheckoutFields, receiptAttached: boolean): Result<Placed> {
  const clientUuid = text(f.client_uuid);
  if (!clientUuid) return { ok: false, status: 400, body: { detail: "طلب غير مكتمل، أعد تحميل الصفحة." } };
  const existing = orderByClientUuid(store, clientUuid);
  if (existing) return { ok: true, data: placedView(existing), status: 200 };

  const rates = storeRates(store);
  const cart = effectiveCart(store, cartId, f);
  const state = catalog(store);
  const e: Record<string, string[]> = {};

  if (cart.lines.length === 0) return { ok: false, status: 400, body: { detail: "لا يمكن إتمام طلب بسلة فارغة." } };

  const name = text(f.name);
  if (!name) e.name = ["أدخل اسمك."];
  const phone = normalizeBuyerPhone(f.phone);
  if (!phone) e.phone = ["رقم واتساب غير صحيح."];
  const email = text(f.email);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) e.email = ["بريد إلكتروني غير صحيح."];

  const isGift = bool(f.is_gift);
  const pickupId = text(f.pickup_location_id);
  const address = text(f.address);
  if (!pickupId && !address) e.address = [isGift ? "أدخل عنوان المستلم." : "أدخل عنوان التوصيل."];
  if (isGift) {
    if (store !== "noor") e.is_gift = ["خيار الهدية غير متاح في هذا المتجر."];
    if (!text(f.recipient_name)) e.recipient_name = ["أدخل اسم المستلم."];
    if (!normalizeBuyerPhone(f.recipient_phone)) e.recipient_phone = ["رقم المستلم غير صحيح."];
    if (text(f.gift_message).length > 200) e.gift_message = ["رسالة الهدية 200 حرف كحد أقصى."];
  }

  // Lines still sold, in stock, and booked when bookable (FR-12.13: 409 when something changed).
  const changed: string[] = [];
  for (const line of cart.lines) {
    const p = findVisible(store, line.product_id);
    if (!p) {
      changed.push(state.products.find((x) => x.id === line.product_id)?.name ?? "منتج");
      continue;
    }
    const v = line.variant_id ? state.variants.find((x) => x.id === line.variant_id) : undefined;
    const stock = v ? Number(v.stock) : Number(p.stock);
    if (!p.allow_backorder && stock < line.quantity) changed.push(p.name);
    if (p.is_bookable && !line.start_datetime && !text(f.start_datetime)) e.start_datetime = ["اختر موعداً للخدمة من صفحة المنتج."];
  }
  if (changed.length) {
    return { ok: false, status: 409, body: { detail: "تغيّرت سلتك أثناء الإكمال — راجع المنتجات قبل التأكيد.", changed } };
  }

  const options = paymentOptions(store, cartId);
  const method = text(f.payment_method) as CheckoutMethod;
  const option = options.methods.find((m) => m.code === method);
  if (!option) e.payment_method = ["اختر طريقة دفع."];
  else if (!option.enabled) e.payment_method = [option.reason ?? "طريقة الدفع غير متاحة."];

  if (phone && method === "cod") {
    if (!isVerified(store, phone, "cod")) {
      const check = verifyOtp(store, phone, f.otp, "cod", "otp");
      if (!check.ok) Object.assign(e, check.body);
    }
    if (RISKY_PHONES.has(phone)) e.payment_method = ["التوصيل بالدفع عند الاستلام غير متاح لهذا الرقم — اختر طريقة أخرى."];
  }
  if (phone && method === "sharwa_pay" && !isVerified(store, phone, "sharwa_pay")) {
    const check = verifyOtp(store, phone, f.sharwa_pay_otp, "sharwa_pay", "sharwa_pay_otp");
    if (!check.ok) Object.assign(e, check.body);
  }
  const useWallet = bool(f.use_wallet);
  if (phone && useWallet && !isVerified(store, phone, "wallet")) {
    const check = verifyOtp(store, phone, f.wallet_otp, "wallet", "wallet_otp");
    if (!check.ok) Object.assign(e, check.body);
  }
  if (phone && Number(f.redeem_points ?? 0) > 0 && !isVerified(store, phone, "loyalty")) {
    e.redeem_points = ["أكّد استبدال النقاط برمز واتساب أولاً."];
  }
  const transfer = text(f.transfer_amount_reported);
  if (transfer && !/^\d+(\.\d{1,2})?$/.test(transfer)) e.transfer_amount_reported = ["أدخل المبلغ المحوَّل بالأرقام (مثال: 250.00)."];
  if (method === "manual") {
    // Django: a transfer is placed with its proof; without it the order is COD (its own option).
    if (!receiptAttached) e.receipt_image = ["أرفق صورة إشعار التحويل."];
    if (!transfer) e.transfer_amount_reported = ["أدخل المبلغ الذي حوّلته."];
  }
  if (method === "jeeb" && !text(f.purchase_code)) e.payment_method = ["يرجى تعبئة بيانات الدفع المطلوبة كاملة."];

  const inv = buildInvoice(store, cart, { ...f, use_wallet: useWallet, payment_method: method }, rates);
  if (!inv.ok) Object.assign(e, inv.body);
  if (Object.keys(e).length || !inv.ok) return { ok: false, status: 400, body: e };
  const invoice = inv.data;

  if (method === "sharwa_pay") {
    const totalSar = convert(invoice.total, invoice.currency, "SAR", rates);
    if (totalSar > SHARWA_PAY_BALANCE_SAR) return { ok: false, status: 400, body: { payment_method: ["رصيد شروة باي غير كافٍ لهذا الطلب."] } };
  }

  const toSarAmount = (n: number) => convert(n, invoice.currency, "SAR", rates).toFixed(2);
  const order = insertStorefrontOrder(store, ({ id, public_uuid, nextLineId, defaultStatusId, now }) => {
    const lines: MockLine[] = cart.lines.map((line) => {
      const p = findVisible(store, line.product_id)!;
      const v = line.variant_id ? state.variants.find((x) => x.id === line.variant_id) : undefined;
      const label = v
        ? state.attributes
            .flatMap((a) => a.options)
            .filter((o) => v.option_ids.includes(o.id))
            .map((o) => o.value)
            .join(" / ")
        : [line.size, line.color].filter(Boolean).join(" / ") || null;
      return {
        id: nextLineId(),
        product_id: p.id,
        product_name: p.name,
        variant_label: label,
        sku: v?.sku ?? p.sku,
        price: convert(unitPrice(p, line.quantity, v?.extra_price ?? "0", store), p.currency, "SAR", rates).toFixed(2),
        quantity: String(line.quantity),
        location_id: 1,
      };
    });
    const prepaid = method === "sharwa_pay";
    const status: MockOrder["status"] = method === "manual" ? "awaiting_payment" : method === "jeeb" || method === "kuraimi" ? "pending_payment" : "new";
    const pickup = pickupId ? Number(pickupId) : null;
    const deliveryMethod = methodsFor(store).methods.find((d) => d.id === Number(f.delivery_method_id));
    return {
      id,
      public_uuid,
      customer_name: name,
      customer_phone: phone!,
      customer_email: email || null,
      address: pickup ? "" : address,
      status,
      payment_status: prepaid || invoice.total === 0 ? "paid" : status === "awaiting_payment" ? "pending" : "unpaid",
      fulfillment_status_id: defaultStatusId,
      sales_channel: "online",
      traffic_source: "direct",
      created_at: now,
      version: 1,
      lines,
      discount: invoice.discount + invoice.promotion > 0 ? toSarAmount(invoice.discount + invoice.promotion) : null,
      coupon_code: invoice.couponCode,
      delivery_fee: toSarAmount(invoice.delivery),
      deposit: invoice.upfront !== null ? toSarAmount(invoice.upfront) : null,
      paid: prepaid ? toSarAmount(invoice.total) : invoice.wallet > 0 ? toSarAmount(invoice.wallet) : "0.00",
      wallet_used: invoice.wallet > 0 ? toSarAmount(invoice.wallet) : null,
      refunds: [],
      is_gift: isGift,
      recipient_name: isGift ? text(f.recipient_name) : null,
      recipient_phone: isGift ? normalizeBuyerPhone(f.recipient_phone) : null,
      gift_message: isGift ? text(f.gift_message) || null : null,
      delivery_method_name: pickup ? null : (deliveryMethod?.name ?? (methodsFor(store).methods.length ? null : "توصيل المتجر")),
      pickup_location_id: pickup,
      tracking_number: null,
      fulfillment_states: { 1: "pending" },
      receipt_amount: method === "manual" && (transfer || receiptAttached) ? toSarAmount(Number(transfer || invoice.total)) : null,
      payment_method: method === "cod" ? "cod" : method === "sharwa_pay" ? "wallet" : "gateway",
      timeline: [],
      is_backordered: false,
      fraud_score: null,
      pending_approval: null,
      display_currency: invoice.currency,
      fx_from_sar: fromSar(1, invoice.currency, rates),
      checkout_method: method,
      client_uuid: clientUuid,
      deposit_upfront: invoice.upfront !== null ? toSarAmount(invoice.upfront) : null,
      customer_latitude: text(f.latitude) || null,
      customer_longitude: text(f.longitude) || null,
    };
  });

  // Stock moves at creation, like `POST /checkout/` (variants carry their own stock).
  for (const line of cart.lines) {
    const p = state.products.find((x) => x.id === line.product_id);
    const v = line.variant_id ? state.variants.find((x) => x.id === line.variant_id) : undefined;
    if (v) v.stock = Math.max(0, Number(v.stock) - line.quantity).toFixed(3);
    else if (p && !p.is_serialized) p.stock = Math.max(0, Number(p.stock) - line.quantity).toFixed(3);
  }
  // A bookable line's hold becomes the order's booking (M26: `held → booked`).
  for (const line of cart.lines) {
    const p = state.products.find((x) => x.id === line.product_id);
    const start = line.start_datetime ?? text(f.start_datetime);
    if (p?.is_bookable && start) bookSlotForOrder(store, p.id, start, { id: order.id, customer_name: order.customer_name, customer_phone: order.customer_phone });
  }
  if (f.checkout_mode !== "buy_now") {
    const real = getCart(store, cartId);
    real.lines = [];
    real.coupon = null;
  }
  if (method === "jeeb" || method === "kuraimi") gatewayQueue(store).set(order.public_uuid, nowMs() + 4000);
  if (receiptAttached) storefrontEvent(store, order, "payment", "أرفق العميل إيصال التحويل مع الطلب.");
  return { ok: true, data: placedView(order), status: 201 };
}

// ── Buyer-facing projections ─────────────────────────────────────────────────────────
export function orderTotalSar(o: MockOrder): number {
  const subtotal = o.lines.reduce((a, l) => a + Number(l.price) * Number(l.quantity), 0);
  return round2(subtotal + Number(o.delivery_fee) - Number(o.discount ?? 0) - Number(o.wallet_used ?? 0));
}

/** An SAR amount of the order, shown in the currency it was placed in (locked rate). */
export function orderMoney(o: MockOrder, sar: number): string {
  const currency = o.display_currency ?? "SAR";
  return fmt(sar * (o.fx_from_sar ?? 1), currency);
}

/** The mock payment gateway confirms a few seconds after the redirect (M12 US-12.3.3). */
function settleGateway(store: string | null, o: MockOrder) {
  const due = gatewayQueue(store).get(o.public_uuid);
  if (due && nowMs() >= due && o.status === "pending_payment") {
    gatewayQueue(store).delete(o.public_uuid);
    o.status = "new";
    o.payment_status = "paid";
    o.paid = orderTotalSar(o).toFixed(2);
    storefrontEvent(store, o, "payment", "أكدت بوابة الدفع استلام المبلغ.");
  }
}

export const ORDER_STATUS_LABELS_AR: Record<MockOrder["status"], string> = {
  pending_payment: "قيد تنفيذ الدفع",
  new: "جديد",
  awaiting_payment: "بانتظار تأكيد الدفع",
  payment_review: "يتطلب مراجعة دفع",
  completed: "مكتمل",
  cancelled: "ملغي",
  refunded: "مسترد",
};

export function publicOrder(store: string | null, uuid: string) {
  const o = orderByUuid(store, uuid);
  if (!o || o.sales_channel !== "online") return null;
  settleGateway(store, o);
  const method = o.checkout_method ?? (o.payment_method === "cod" ? "cod" : "manual");
  const totalSar = orderTotalSar(o);
  const upfront = o.deposit_upfront ? Number(o.deposit_upfront) : null;
  return {
    order_number: String(o.id),
    public_uuid: o.public_uuid,
    status: o.status,
    status_label: ORDER_STATUS_LABELS_AR[o.status],
    payment_status: o.payment_status,
    payment_method: method,
    payment_method_label: METHOD_LABELS[method as CheckoutMethod] ?? METHOD_LABELS.cod,
    display_total: orderMoney(o, totalSar),
    display_upfront_required: upfront === null ? null : orderMoney(o, upfront),
    display_amount_on_delivery: upfront === null ? null : orderMoney(o, totalSar - upfront),
    created_at: o.created_at,
    is_gift: o.is_gift,
    receipt_attached: o.receipt_amount !== null,
    payout_accounts: method === "manual" ? payoutAccounts(store) : [],
    items: o.lines.map((l) => ({
      product_name: l.product_name,
      variant_label: l.variant_label,
      quantity: Number(l.quantity),
      display_price: orderMoney(o, Number(l.price)),
    })),
    customer_phone_masked: `${o.customer_phone.slice(0, 3)}•••••${o.customer_phone.slice(-3)}`,
  };
}

export function attachReceipt(store: string | null, uuid: string, fields: Record<string, unknown>, hasFile: boolean) {
  const o = orderByUuid(store, uuid);
  if (!o || o.sales_channel !== "online") return { ok: false as const, status: 404, body: { detail: "لم نجد هذا الطلب." } };
  if (o.checkout_method !== "manual") return { ok: false as const, status: 400, body: { detail: "هذا الطلب لا يحتاج إيصال تحويل." } };
  if (o.status !== "awaiting_payment" && o.status !== "payment_review") {
    return { ok: false as const, status: 409, body: { detail: "تم تأكيد دفع هذا الطلب، لا حاجة لإيصال." } };
  }
  const amount = text(fields.transfer_amount_reported);
  if (!hasFile) return { ok: false as const, status: 400, body: { receipt_image: ["أرفق صورة الإيصال."] } };
  if (amount && !/^\d+(\.\d{1,2})?$/.test(amount)) {
    return { ok: false as const, status: 400, body: { transfer_amount_reported: ["أدخل المبلغ بالأرقام (مثال: 250.00)."] } };
  }
  const reported = amount ? Number(amount) / (o.fx_from_sar ?? 1) : orderTotalSar(o);
  o.receipt_amount = reported.toFixed(2);
  storefrontEvent(store, o, "payment", "أرفق العميل إيصال التحويل.");
  return { ok: true as const, data: publicOrder(store, uuid)! };
}

export function isPhone(raw: unknown): boolean {
  return /^(967|966)\d{9}$/.test(normalizePhone(String(raw ?? "")));
}

export function codCheck(phone: string) {
  return RISKY_PHONES.has(phone)
    ? { cod_allowed: false, reason: "التوصيل بالدفع عند الاستلام غير متاح لهذا الرقم — اختر طريقة أخرى." }
    : { cod_allowed: true };
}
