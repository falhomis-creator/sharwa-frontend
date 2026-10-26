import type { MockResult } from "@/lib/bff/mock-route";
import { compareDecimal, isDecimal } from "@/lib/decimal";
import type { Currency } from "@/lib/schemas/money";
import {
  ABOUT_US_MAX,
  ANNOUNCEMENT_MAX,
  CURRENCIES,
  DEFAULT_ANNOUNCEMENT_COLORS,
  DEFAULT_FX,
  DEFAULT_TIMEZONE,
  HEX_RE,
  RETURN_POLICY_MAX,
  SCROLL_SPEEDS,
  SEO_LIMITS,
  STORE_NAME_MAX,
  WEEK_START_DAYS,
  type StoreSettings,
} from "@/features/settings/schemas";
import { displayMoney } from "@/mocks/_fixtures";
import { ordersState } from "@/mocks/orders/state";
import { settingsOverlay } from "@/mocks/settings/overlay";
import { storeState } from "@/mocks/store-state";
import { tenantFixture } from "@/mocks/tenant/config";

/**
 * `StoreSetting` fixture (M34 §7 — every row `[NEEDS BACKEND]`), one per store on
 * `globalThis` like the other dashboard fixtures. Validation mirrors Django's forms and
 * answers DRF-shaped `{field:[msg]}` 400s; `multi-location` answers a readable 409 when
 * turning it off would merge stock held in several locations.
 */
type Raw = Omit<StoreSettings, "display_default_delivery_fee" | "display_free_shipping_threshold" | "fx_preview" | "store_url" | "pending_payment_orders">;
type Body = Record<string, unknown>;

const RICH_POLICY = `## سياسة الاسترجاع

يمكنك إرجاع المنتج خلال 7 أيام من الاستلام إذا كان بحالته الأصلية.

- العطور والمنتجات المفتوحة لا تُسترجع.
- يتحمّل المتجر رسوم الإرجاع إذا كان المنتج تالفاً أو غير مطابق.
- يُعاد المبلغ إلى محفظتك خلال 3 أيام عمل من فحص المنتج.`;

function seed(store: string | null): Raw {
  const cfg = tenantFixture(store)?.config;
  const full = store === "noor";
  return {
    store_name: cfg?.store_name ?? "متجري",
    about_us: full ? "متجر نور للعطور والهدايا اليمنية منذ 2019 — نختار كل قطعة بأنفسنا." : "",
    timezone: DEFAULT_TIMEZONE,
    week_start_day: "sunday",
    whatsapp_number: cfg?.whatsapp_number ?? "",
    contact_email: full ? "hello@noor-store.com" : "",
    custom_domain: full ? "noor-store.com" : null,
    facebook_link: full ? "https://facebook.com/noorstore" : "",
    instagram_link: full ? "https://instagram.com/noorstore" : "",
    tiktok_link: "",
    snapchat_link: "",
    return_policy: full ? RICH_POLICY : "",
    default_delivery_fee: full ? "2500.00" : "0.00",
    free_shipping_threshold: full ? "300.00" : "0.00",
    currency: "SAR",
    usd_to_sar: DEFAULT_FX.usd_to_sar,
    sar_to_yer_old: DEFAULT_FX.sar_to_yer_old,
    sar_to_yer_new: DEFAULT_FX.sar_to_yer_new,
    seo_title: full ? "متجر نور — عطور وهدايا يمنية" : "",
    seo_description: full ? "عود ومسك وبخور يمني أصلي، وهدايا مختارة بتوصيل سريع داخل اليمن والسعودية." : "",
    seo_keywords: full ? "عود, بخور, عطور يمنية, هدايا" : "",
    seo_og_image: null,
    enable_announcement_bar: cfg?.enable_announcement_bar ?? false,
    announcement_text: cfg?.announcement_text ?? "",
    announcement_bg_color: DEFAULT_ANNOUNCEMENT_COLORS.bg,
    announcement_text_color: DEFAULT_ANNOUNCEMENT_COLORS.text,
    announcement_scroll_speed: "medium",
    show_banner_on_home: true,
    show_banner_on_products: true,
    show_banner_on_product_detail: false,
    show_banner_on_checkout: false,
    enable_manual_payment: true,
    enable_sharwa_pay: full,
    multi_location_enabled: full,
    updated_at: new Date(Date.UTC(2026, 9, 15, 9, 30)).toISOString(),
  };
}

function state(store: string | null): Raw {
  return storeState(store, "settings", () => seed(store));
}

function fxPreview(s: Raw): StoreSettings["fx_preview"] {
  const sar = 100;
  const amounts: Record<Currency, number> = {
    SAR: sar,
    USD: sar / Number(s.usd_to_sar),
    YER_OLD: sar * Number(s.sar_to_yer_old),
    YER_NEW: sar * Number(s.sar_to_yer_new),
  };
  return CURRENCIES.map((c) => ({ currency: c, display_100_sar: displayMoney(amounts[c], c) }));
}

export function readSettings(store: string | null, storeHost: string): StoreSettings {
  const s = state(store);
  const pending = store ? ordersState(store).orders.filter((o) => o.status === "pending_payment").length : 0;
  return {
    ...s,
    display_default_delivery_fee: displayMoney(Number(s.default_delivery_fee), "YER_NEW"),
    // Dashboard currency — what Django's pricing compares against (INT-013).
    display_free_shipping_threshold: displayMoney(Number(s.free_shipping_threshold), s.currency),
    fx_preview: fxPreview(s),
    store_url: `https://${storeHost}`,
    pending_payment_orders: pending,
  };
}

// ── Validation helpers ───────────────────────────────────────────────────────────────
const str = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));
const URL_RE = /^https?:\/\/\S+\.\S+/;

function pick(body: Body, keys: readonly string[]): Body {
  return Object.fromEntries(Object.entries(body).filter(([k]) => keys.includes(k)));
}

function commit(store: string | null, storeHost: string, patch: Partial<Raw>): MockResult<StoreSettings> {
  const s = state(store);
  Object.assign(s, patch, { updated_at: new Date().toISOString() });
  const overlay = settingsOverlay(store);
  if ("store_name" in patch) overlay.store_name = s.store_name;
  if ("whatsapp_number" in patch) overlay.whatsapp_number = s.whatsapp_number;
  if ("announcement_text" in patch) overlay.announcement_text = s.announcement_text || null;
  if ("enable_announcement_bar" in patch) overlay.enable_announcement_bar = s.enable_announcement_bar;
  return { ok: true, data: readSettings(store, storeHost) };
}

function fail(e: Record<string, string[]>): MockResult<never> | null {
  return Object.keys(e).length ? { ok: false, status: 400, body: e } : null;
}

// ── Sections ─────────────────────────────────────────────────────────────────────────
export function patchIdentity(store: string | null, host: string, body: Body): MockResult<StoreSettings> {
  const b = pick(body, ["store_name", "about_us", "timezone", "week_start_day"]);
  const e: Record<string, string[]> = {};
  if ("store_name" in b) {
    const n = str(b.store_name).trim();
    if (n.length < 3 || n.length > STORE_NAME_MAX) e.store_name = ["اسم المتجر من 3 إلى 100 حرف"];
    b.store_name = n;
  }
  if ("about_us" in b && str(b.about_us).length > ABOUT_US_MAX) e.about_us = [`${ABOUT_US_MAX} حرف على الأكثر.`];
  if ("timezone" in b) {
    let ok = false;
    try {
      new Intl.DateTimeFormat("en", { timeZone: str(b.timezone) });
      ok = Boolean(str(b.timezone));
    } catch {
      ok = false;
    }
    if (!ok) e.timezone = ["منطقة زمنية غير معروفة."];
  }
  if ("week_start_day" in b && !(WEEK_START_DAYS as readonly string[]).includes(str(b.week_start_day))) e.week_start_day = ["اختر الأحد أو الاثنين."];
  return fail(e) ?? commit(store, host, b as Partial<Raw>);
}

export function patchContact(store: string | null, host: string, body: Body): MockResult<StoreSettings> {
  const b = pick(body, ["whatsapp_number", "contact_email", "facebook_link", "instagram_link", "tiktok_link", "snapchat_link"]);
  const e: Record<string, string[]> = {};
  if ("whatsapp_number" in b) {
    const p = str(b.whatsapp_number).replace(/\D/g, "");
    if (p && !/^(967|966)\d{9}$/.test(p)) e.whatsapp_number = ["رقم واتساب غير صحيح"];
    b.whatsapp_number = p;
  }
  if ("contact_email" in b) {
    const m = str(b.contact_email).trim();
    if (m && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) e.contact_email = ["أدخل بريداً إلكترونياً صحيحاً."];
    b.contact_email = m;
  }
  for (const k of ["facebook_link", "instagram_link", "tiktok_link", "snapchat_link"]) {
    if (k in b) {
      const u = str(b[k]).trim();
      if (u && !URL_RE.test(u)) e[k] = ["أدخل رابطاً صحيحاً."];
      b[k] = u;
    }
  }
  return fail(e) ?? commit(store, host, b as Partial<Raw>);
}

export function patchPolicies(store: string | null, host: string, body: Body): MockResult<StoreSettings> {
  const b = pick(body, ["return_policy"]);
  if (str(b.return_policy).length > RETURN_POLICY_MAX) return { ok: false, status: 400, body: { return_policy: [`${RETURN_POLICY_MAX} حرف على الأكثر.`] } };
  return commit(store, host, { return_policy: str(b.return_policy) });
}

export function patchShipping(store: string | null, host: string, body: Body): MockResult<StoreSettings> {
  const b = pick(body, ["default_delivery_fee", "free_shipping_threshold"]);
  const e: Record<string, string[]> = {};
  for (const k of ["default_delivery_fee", "free_shipping_threshold"]) {
    if (k in b && !isDecimal(str(b[k]))) e[k] = ["أدخل مبلغاً صحيحاً (مثال: 1500.00)"];
  }
  return fail(e) ?? commit(store, host, b as Partial<Raw>);
}

export function patchCurrency(store: string | null, host: string, body: Body): MockResult<StoreSettings> {
  const b = pick(body, ["currency", "usd_to_sar", "sar_to_yer_old", "sar_to_yer_new"]);
  const e: Record<string, string[]> = {};
  if ("currency" in b && !(CURRENCIES as readonly string[]).includes(str(b.currency))) e.currency = ["اختر عملة من القائمة."];
  for (const k of ["usd_to_sar", "sar_to_yer_old", "sar_to_yer_new"]) {
    if (!(k in b)) continue;
    const v = str(b[k]).trim();
    if (!/^\d+(\.\d{1,4})?$/.test(v)) e[k] = ["أدخل رقماً صحيحاً."];
    else if (compareDecimal(v, "0") <= 0) e[k] = ["يجب أن يكون أكبر من صفر."];
    b[k] = v;
  }
  return fail(e) ?? commit(store, host, b as Partial<Raw>);
}

export function patchSeo(store: string | null, host: string, body: Body): MockResult<StoreSettings> {
  const b = pick(body, ["seo_title", "seo_description", "seo_keywords", "seo_og_image"]);
  const e: Record<string, string[]> = {};
  for (const [k, max] of Object.entries(SEO_LIMITS)) {
    if (k in b && str(b[k]).length > max) e[k] = [`${max} حرفاً على الأكثر.`];
  }
  if ("seo_og_image" in b && b.seo_og_image !== null && !/^(data:image\/(jpe?g|png|webp|gif);|https?:\/\/)/.test(str(b.seo_og_image))) {
    e.seo_og_image = ["الصيغ المسموحة: jpg, jpeg, png, webp, gif"];
  }
  return fail(e) ?? commit(store, host, b as Partial<Raw>);
}

export function patchAnnouncement(store: string | null, host: string, body: Body): MockResult<StoreSettings> {
  const keys = [
    "enable_announcement_bar",
    "announcement_text",
    "announcement_bg_color",
    "announcement_text_color",
    "announcement_scroll_speed",
    "show_banner_on_home",
    "show_banner_on_products",
    "show_banner_on_product_detail",
    "show_banner_on_checkout",
  ];
  const b = pick(body, keys);
  const e: Record<string, string[]> = {};
  if ("announcement_text" in b && str(b.announcement_text).length > ANNOUNCEMENT_MAX) e.announcement_text = [`${ANNOUNCEMENT_MAX} حرفاً على الأكثر.`];
  for (const k of ["announcement_bg_color", "announcement_text_color"]) {
    if (k in b && !HEX_RE.test(str(b[k]))) e[k] = ["لون بصيغة #RRGGBB."];
  }
  if ("announcement_scroll_speed" in b && !(SCROLL_SPEEDS as readonly string[]).includes(str(b.announcement_scroll_speed))) e.announcement_scroll_speed = ["اختر سرعة."];
  // Checked on the merged row: an enabled bar never has an empty text, whichever field changed.
  const enabled = "enable_announcement_bar" in b ? b.enable_announcement_bar === true : state(store).enable_announcement_bar;
  const text = "announcement_text" in b ? str(b.announcement_text) : state(store).announcement_text;
  if (enabled && !text.trim()) e.announcement_text = ["اكتب نص الشريط قبل تفعيله، أو أوقفه."];
  return fail(e) ?? commit(store, host, b as Partial<Raw>);
}

export function patchPayments(store: string | null, host: string, body: Body): MockResult<StoreSettings> {
  const b = pick(body, ["enable_manual_payment", "enable_sharwa_pay"]);
  for (const k of Object.keys(b)) if (typeof b[k] !== "boolean") return { ok: false, status: 400, body: { [k]: ["قيمة غير صالحة."] } };
  return commit(store, host, b as Partial<Raw>);
}

/**
 * `POST settings/multi-location/` `{enabled, merge?}`. Turning it OFF while more than one
 * location holds stock is a 409 with the conflicting locations, unless `merge: true`
 * (each product's stock becomes one number — the sum of its locations, as Django mirrors it).
 */
export function setMultiLocation(store: string | null, host: string, body: Body): MockResult<StoreSettings> {
  if (typeof body.enabled !== "boolean") return { ok: false, status: 400, body: { enabled: ["قيمة غير صالحة."] } };
  const s = state(store);
  if (!body.enabled && s.multi_location_enabled && body.merge !== true && store === "noor") {
    return {
      ok: false,
      status: 409,
      body: {
        detail: "يوجد مخزون في أكثر من موقع؛ الإيقاف يجعل مخزون كل منتج رقماً واحداً (مجموع المواقع).",
        conflicts: [{ location: "فرع الرياض", products_with_stock: 14 }],
      },
    };
  }
  return commit(store, host, { multi_location_enabled: body.enabled });
}
