import type { Currency } from "@/lib/schemas/money";
import type { Cart, CartActionResult } from "@/features/storefront/schemas/cart";
import { catalog } from "@/mocks/catalog/state";
import { readSettings } from "@/mocks/settings/state";
import { storeState } from "@/mocks/store-state";
import { findVisible, nowMs, unitPrice } from "@/mocks/storefront/catalog";
import { extras } from "@/mocks/product-extras/state";
import { convert, fmt, round2, storeDefaultCurrency, storeRates, type Rates } from "@/mocks/storefront/money";
import { normalizeBuyerPhone } from "@/mocks/storefront/otp";

/**
 * The mock of Django's session cart (`products/cart.py`, ready-api-v1 #5–#7) plus the
 * `[NEEDS BACKEND]` coupon / offers / free-shipping / contact / restore rows (M11 §7).
 * A cart is identified by an opaque id the passthrough keeps in an HttpOnly cookie — the
 * stand-in for Django's `sessionid` — and lives per store, never shared (VIII).
 */
export interface CartLine {
  key: string;
  product_id: number;
  size: string | null;
  color: string | null;
  variant_id: number | null;
  quantity: number;
  start_datetime: string | null;
  personalization: Record<string, unknown> | null;
}

export interface MockCart {
  lines: CartLine[];
  currency: Currency;
  coupon: string | null;
  contact: { phone: string; name: string | null } | null;
  updatedAt: number;
}

type Result<T> = { ok: true; data: T; status?: number } | { ok: false; status: number; body: Record<string, unknown> };

const carts = (store: string | null) => storeState(store, "storefront:carts", () => new Map<string, MockCart>());

export function getCart(store: string | null, cartId: string): MockCart {
  const map = carts(store);
  let cart = map.get(cartId);
  if (!cart) {
    cart = { lines: [], currency: storeDefaultCurrency(store), coupon: null, contact: null, updatedAt: nowMs() };
    map.set(cartId, cart);
  }
  return cart;
}

function lineKey(productId: number, size: string | null, color: string | null, variantId: number | null): string {
  if (variantId) return `${productId}_v${variantId}`;
  return `${productId}_${size ?? ""}_${color ?? ""}`.replace(/_+$/, "");
}

// ── Coupons (`Coupon`, M13) — the four verbatim error messages of M11 US-11.4.1 ──────────
const COUPONS: Record<string, { kind: "percent" | "fixed"; value: number; state: "ok" | "inactive" | "not_started" | "expired" | "maxed"; min_sar?: number }> = {
  WELCOME10: { kind: "percent", value: 10, state: "ok" },
  NOOR50: { kind: "fixed", value: 50, state: "ok", min_sar: 200 },
  OFF: { kind: "percent", value: 10, state: "inactive" },
  SOON: { kind: "percent", value: 10, state: "not_started" },
  OLD20: { kind: "percent", value: 20, state: "expired" },
  MAXED: { kind: "percent", value: 15, state: "maxed" },
};

const COUPON_ERRORS: Record<string, string> = {
  inactive: "هذا الكوبون غير مُفعَّل حالياً",
  not_started: "لم يبدأ هذا الكوبون بعد",
  expired: "انتهت صلاحية هذا الكوبون",
  maxed: "تم استخدام هذا الكوبون الحد الأقصى من المرات",
};

// ── Serialization (what `GET /api/v1/cart/` answers) ─────────────────────────────────
function variantLabel(store: string | null, variantId: number | null): string | null {
  if (!variantId) return null;
  const state = catalog(store);
  const v = state.variants.find((x) => x.id === variantId);
  if (!v) return null;
  return [...state.attributes]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((a) => a.options.find((o) => v.option_ids.includes(o.id))?.value)
    .filter(Boolean)
    .join(" / ");
}

/** Personalization surcharges (`PersonalizationField.price_add`) for the values the buyer filled in. */
function personalizationExtra(store: string | null, productId: number, values: Record<string, unknown> | null): number {
  const fields = extras(store).fields.get(productId);
  if (!fields || !values) return 0;
  let extra = 0;
  for (const f of fields) {
    const v = values[String(f.id)];
    const filled = Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "" && v !== false;
    if (filled && f.price_add) extra += Number(f.price_add);
  }
  return extra;
}

export interface PricedLine {
  line: CartLine;
  name: string;
  unit: number | null;
  subtotal: number | null;
  sarSubtotal: number;
  isFreeShipping: boolean;
  paymentPolicy: "cod" | "deposit" | "full";
  depositSar: number;
  categoryId: number | null;
  isBookable: boolean;
}

/** Price every line in `currency` (null = product no longer sold, M11 §8). */
export function priceLines(store: string | null, cart: MockCart, currency: Currency, rates: Rates): PricedLine[] {
  const state = catalog(store);
  return cart.lines.map((line) => {
    const raw = state.products.find((p) => p.id === line.product_id);
    const p = findVisible(store, line.product_id);
    if (!p) {
      return {
        line,
        name: raw?.name ?? "منتج محذوف",
        unit: null,
        subtotal: null,
        sarSubtotal: 0,
        isFreeShipping: false,
        paymentPolicy: "cod",
        depositSar: 0,
        categoryId: null,
        isBookable: false,
      };
    }
    const v = line.variant_id ? state.variants.find((x) => x.id === line.variant_id) : undefined;
    const unitInProduct = unitPrice(p, line.quantity, v?.extra_price ?? "0", store) + personalizationExtra(store, p.id, line.personalization);
    const unit = convert(unitInProduct, p.currency, currency, rates);
    const deposit = p.payment_policy === "deposit" && p.deposit_required ? Number(p.deposit_required) * line.quantity : 0;
    return {
      line,
      name: p.name,
      unit,
      subtotal: round2(unit * line.quantity),
      sarSubtotal: convert(unitInProduct * line.quantity, p.currency, "SAR", rates),
      isFreeShipping: p.is_free_shipping,
      paymentPolicy: p.payment_policy,
      depositSar: convert(deposit, p.currency, "SAR", rates),
      categoryId: p.category_id,
      isBookable: p.is_bookable,
    };
  });
}

export interface CartTotals {
  subtotal: number;
  promotion: number;
  offers: Array<{ name: string; offer_type: "discount" | "free_shipping" | "buy_x_get_y"; amount: number }>;
  couponCode: string | null;
  coupon: number;
  total: number;
  freeShippingApplies: boolean;
  freeShippingRemaining: number | null;
  freeShippingProgress: number | null;
}

/** `pricing.py`: automatic offers, then the coupon; shipping is not part of the cart (M11 §10). */
export function cartTotals(store: string | null, cart: MockCart, lines: PricedLine[], currency: Currency, rates: Rates): CartTotals {
  const subtotal = round2(lines.reduce((acc, l) => acc + (l.subtotal ?? 0), 0));
  const offers: CartTotals["offers"] = [];
  // «البخور: اشترِ 2 والثالث مجاناً» (noor's PromotionalOffer #1).
  if (store === "noor") {
    for (const l of lines) {
      if (l.name === "بخور معمول" && l.unit !== null && l.line.quantity >= 3) {
        offers.push({ name: "البخور: اشترِ 2 والثالث مجاناً", offer_type: "buy_x_get_y", amount: round2(Math.floor(l.line.quantity / 3) * l.unit) });
      }
    }
  }
  const promotion = round2(offers.reduce((a, o) => a + o.amount, 0));
  let coupon = 0;
  const spec = cart.coupon ? COUPONS[cart.coupon] : undefined;
  if (spec && spec.state === "ok") {
    const base = subtotal - promotion;
    coupon = round2(spec.kind === "percent" ? (base * spec.value) / 100 : convert(spec.value, "SAR", currency, rates));
    coupon = Math.min(coupon, base);
  }
  const total = round2(Math.max(0, subtotal - promotion - coupon));
  const thresholdRaw = Number(readSettings(store, "").free_shipping_threshold);
  const threshold = thresholdRaw > 0 ? convert(thresholdRaw, "YER_NEW", currency, rates) : 0;
  const allFree = lines.length > 0 && lines.every((l) => l.isFreeShipping);
  const freeShippingApplies = allFree || (threshold > 0 && total >= threshold);
  return {
    subtotal,
    promotion,
    offers,
    couponCode: spec && spec.state === "ok" ? cart.coupon : null,
    coupon,
    total,
    freeShippingApplies,
    freeShippingRemaining: threshold > 0 ? round2(Math.max(0, threshold - total)) : null,
    freeShippingProgress: threshold > 0 ? Math.min(100, Math.round((total / threshold) * 100)) : null,
  };
}

export function serializeCart(store: string | null, cart: MockCart): Cart {
  const rates = storeRates(store);
  const currency = cart.currency;
  const state = catalog(store);
  const lines = priceLines(store, cart, currency, rates);
  const totals = cartTotals(store, cart, lines, currency, rates);
  const money = (n: number) => fmt(n, currency);
  return {
    items: lines.map((l) => {
      const p = state.products.find((x) => x.id === l.line.product_id);
      const v = l.line.variant_id ? state.variants.find((x) => x.id === l.line.variant_id) : undefined;
      const stock = v ? Number(v.stock) : p ? Number(p.stock) : 0;
      return {
        product_id: l.line.product_id,
        name: l.name,
        size: l.line.size,
        color: l.line.color,
        quantity: l.line.quantity,
        display_price: l.unit === null ? null : money(l.unit),
        display_subtotal: l.subtotal === null ? null : money(l.subtotal),
        image: p?.images[0]?.url ?? null,
        variant_id: l.line.variant_id,
        variant_label: variantLabel(store, l.line.variant_id),
        product_slug: p?.slug ?? null,
        max_quantity: p?.max_quantity ?? null,
        stock,
        is_auction: p?.is_auction ?? false,
        start_datetime: l.line.start_datetime,
        is_available: l.unit !== null,
      };
    }),
    count: cart.lines.reduce((a, l) => a + l.quantity, 0),
    currency,
    display_subtotal: money(totals.subtotal),
    coupon_code: totals.couponCode,
    display_discount: totals.coupon > 0 ? money(totals.coupon) : null,
    applied_offers: totals.offers.map((o) => ({ name: o.name, offer_type: o.offer_type, display_discount: money(o.amount) })),
    display_total: money(totals.total),
    free_shipping_applies: totals.freeShippingApplies,
    display_free_shipping_remaining: totals.freeShippingRemaining === null ? null : money(totals.freeShippingRemaining),
    free_shipping_progress: totals.freeShippingProgress,
  };
}

// ── Actions (`POST /api/v1/cart/actions/`) ───────────────────────────────────────────
function productQty(cart: MockCart, productId: number): number {
  return cart.lines.filter((l) => l.product_id === productId).reduce((a, l) => a + l.quantity, 0);
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function cartAction(store: string | null, cartId: string, body: Record<string, unknown>): Result<CartActionResult> {
  const cart = getCart(store, cartId);
  const state = catalog(store);
  const productId = Number(body.product_id);
  const action = body.action_type;
  if (!Number.isInteger(productId) || productId <= 0) return { ok: false, status: 400, body: { product_id: ["منتج غير صالح."] } };
  if (action !== "add" && action !== "decrease" && action !== "remove_line") {
    return { ok: false, status: 400, body: { action_type: ["إجراء غير معروف."] } };
  }
  const size = str(body.size);
  const color = str(body.color);
  const variantId = body.variant_id ? Number(body.variant_id) : null;
  const key = lineKey(productId, size, color, variantId);

  if (action === "add") {
    const p = findVisible(store, productId);
    if (!p) return { ok: false, status: 404, body: { detail: "هذا المنتج غير متاح." } };
    const vs = state.variants.filter((v) => v.product_id === p.id);
    const variant = variantId ? vs.find((v) => v.id === variantId) : undefined;
    if (vs.length > 0 && !variant) return { ok: false, status: 400, body: { detail: "اختر المقاس واللون أولاً." } };
    const requested = Math.max(1, Math.floor(Number(body.quantity ?? 1)) || 1);
    let line = cart.lines.find((l) => l.key === key && l.start_datetime === (str(body.start_datetime) ?? null));
    if (!line) {
      line = {
        key,
        product_id: productId,
        size,
        color,
        variant_id: variant?.id ?? null,
        quantity: 0,
        start_datetime: str(body.start_datetime),
        personalization: body.personalization && typeof body.personalization === "object" ? (body.personalization as Record<string, unknown>) : null,
      };
      cart.lines.unshift(line);
    }
    const available = p.allow_backorder ? Number.POSITIVE_INFINITY : variant ? Number(variant.stock) : Number(p.stock);
    const otherLines = productQty(cart, productId) - line.quantity;
    let target = line.quantity + requested;
    if (p.is_auction) target = 1;
    if (p.max_quantity) target = Math.min(target, p.max_quantity);
    target = Math.min(target, Math.max(0, (variant ? available : available - otherLines)));
    line.quantity = target;
    if (line.quantity <= 0) cart.lines = cart.lines.filter((l) => l !== line);
  } else {
    const line = cart.lines.find((l) => l.key === key) ?? cart.lines.find((l) => l.product_id === productId);
    if (line) {
      if (action === "decrease") line.quantity -= 1;
      if (action === "remove_line" || line.quantity <= 0) cart.lines = cart.lines.filter((l) => l !== line);
    }
  }
  cart.updatedAt = nowMs();
  return { ok: true, data: { cart_count: cart.lines.reduce((a, l) => a + l.quantity, 0), product_qty: productQty(cart, productId) } };
}

export function clearCart(store: string | null, cartId: string) {
  const cart = getCart(store, cartId);
  cart.lines = [];
  cart.coupon = null;
}

export function setCurrency(store: string | null, cartId: string, currency: Currency) {
  getCart(store, cartId).currency = currency;
}

// ── Coupon / contact / restore (`[NEEDS BACKEND]`, M11 §7) ───────────────────────────
export function applyCoupon(store: string | null, cartId: string, rawCode: unknown): Result<Cart> {
  const cart = getCart(store, cartId);
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!code) return { ok: false, status: 400, body: { code: ["أدخل كود الخصم."] } };
  const spec = COUPONS[code];
  if (!spec) return { ok: false, status: 400, body: { detail: "كود الخصم غير صحيح." } };
  if (spec.state !== "ok") return { ok: false, status: 400, body: { detail: COUPON_ERRORS[spec.state] } };
  if (spec.min_sar) {
    const rates = storeRates(store);
    const totals = cartTotals(store, cart, priceLines(store, cart, "SAR", rates), "SAR", rates);
    if (totals.subtotal < spec.min_sar) {
      return { ok: false, status: 400, body: { detail: `هذا الكوبون يتطلب طلباً بقيمة ${fmt(convert(spec.min_sar, "SAR", cart.currency, rates), cart.currency)} على الأقل.` } };
    }
  }
  cart.coupon = code;
  return { ok: true, data: serializeCart(store, cart) };
}

export function removeCoupon(store: string | null, cartId: string): Cart {
  const cart = getCart(store, cartId);
  cart.coupon = null;
  return serializeCart(store, cart);
}

export function saveContact(store: string | null, cartId: string, body: Record<string, unknown>): Result<null> {
  const phone = normalizeBuyerPhone(body.phone);
  if (!phone) return { ok: false, status: 400, body: { phone: ["رقم واتساب غير صحيح."] } };
  const cart = getCart(store, cartId);
  cart.contact = { phone, name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : null };
  return { ok: true, data: null, status: 204 };
}

/** Recovery links (`AbandonedCart.cart_url`) carry an opaque token; `demo` is the documented fixture. */
export function restoreCart(store: string | null, cartId: string, token: unknown): Result<Cart> {
  if (token !== "demo") return { ok: false, status: 404, body: { detail: "رابط استرداد السلة غير صالح أو انتهت صلاحيته." } };
  const cart = getCart(store, cartId);
  const state = catalog(store);
  const pick = (name: string) => state.products.find((p) => p.name === name && findVisible(store, p.id));
  const rows = [pick("عطر عود ملكي 50مل"), pick("بخور معمول")].filter((p): p is NonNullable<typeof p> => Boolean(p));
  for (const p of rows) {
    const key = lineKey(p.id, null, null, null);
    if (!cart.lines.some((l) => l.key === key)) {
      cart.lines.unshift({ key, product_id: p.id, size: null, color: null, variant_id: null, quantity: 1, start_datetime: null, personalization: null });
    }
  }
  cart.coupon = "WELCOME10";
  return { ok: true, data: serializeCart(store, cart) };
}
