import { z } from "zod";
import type { FeatureKey } from "@/lib/access";
import { CURRENCIES, CURRENCY_LABELS, currencySchema } from "@/lib/schemas/money";

/**
 * M34 contracts (data-model §4 «StoreSetting», M34 §5/§7 — every write row `[NEEDS BACKEND]`).
 * The fields are EXACTLY those of Django's seven forms (FR-34.02, SC-34.5); nothing secret
 * (`admin_password`) and nothing owned elsewhere (logo/colours/fonts → M08) is ever here.
 */
export const WEEK_START_DAYS = ["sunday", "monday"] as const;
export const WEEK_START_LABELS: Record<(typeof WEEK_START_DAYS)[number], string> = { sunday: "الأحد", monday: "الاثنين" };

export const SCROLL_SPEEDS = ["slow", "medium", "fast"] as const;
export const SCROLL_SPEED_LABELS: Record<(typeof SCROLL_SPEEDS)[number], string> = { slow: "بطيء", medium: "متوسط", fast: "سريع" };
/** Seconds for one pass of the announcement marquee, per speed (storefront component). */
export const SCROLL_SPEED_SECONDS: Record<(typeof SCROLL_SPEEDS)[number], number> = { slow: 30, medium: 18, fast: 10 };

export { CURRENCIES, CURRENCY_LABELS };

/** Model defaults (discovery 03 §5) — used by the seed and the «القيمة الافتراضية» hints. */
export const DEFAULT_TIMEZONE = "Asia/Aden";
export const DEFAULT_FX = { usd_to_sar: "3.75", sar_to_yer_old: "140.00", sar_to_yer_new: "520.00" } as const;
export const DEFAULT_ANNOUNCEMENT_COLORS = { bg: "#18181b", text: "#ffffff" } as const;

export const SEO_LIMITS = { seo_title: 70, seo_description: 160, seo_keywords: 255 } as const;
export const STORE_NAME_MAX = 100;
export const ABOUT_US_MAX = 2000;
export const ANNOUNCEMENT_SOFT_MAX = 200;
export const ANNOUNCEMENT_MAX = 255;
export const RETURN_POLICY_MAX = 10000;

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const DECIMAL_RE = /^\d+(\.\d{1,2})?$/;
const RATE_RE = /^\d+(\.\d{1,4})?$/;

// ── Read model ──────────────────────────────────────────────────────────────────────
export const fxPreviewRowSchema = z.object({ currency: currencySchema, display_100_sar: z.string() });

export const settingsSchema = z.object({
  // Identity (StoreIdentityForm)
  store_name: z.string(),
  about_us: z.string(),
  timezone: z.string(),
  week_start_day: z.enum(WEEK_START_DAYS),
  // Contact (ContactInfoForm)
  whatsapp_number: z.string(),
  contact_email: z.string(),
  custom_domain: z.string().nullable(),
  facebook_link: z.string(),
  instagram_link: z.string(),
  tiktok_link: z.string(),
  snapchat_link: z.string(),
  // Policies (StorePoliciesForm)
  return_policy: z.string(),
  // Shipping (ShippingSettingsForm) — stored in YER_NEW (FR-34.07)
  default_delivery_fee: z.string(),
  free_shipping_threshold: z.string(),
  display_default_delivery_fee: z.string(),
  display_free_shipping_threshold: z.string(),
  // Currency (CurrencySettingsForm)
  currency: currencySchema,
  usd_to_sar: z.string(),
  sar_to_yer_old: z.string(),
  sar_to_yer_new: z.string(),
  fx_preview: z.array(fxPreviewRowSchema),
  // SEO (SEOSettingsForm)
  seo_title: z.string(),
  seo_description: z.string(),
  seo_keywords: z.string(),
  seo_og_image: z.string().nullable(),
  // Announcement bar (AnnouncementBarForm — 9 fields)
  enable_announcement_bar: z.boolean(),
  announcement_text: z.string(),
  announcement_bg_color: z.string(),
  announcement_text_color: z.string(),
  announcement_scroll_speed: z.enum(SCROLL_SPEEDS),
  show_banner_on_home: z.boolean(),
  show_banner_on_products: z.boolean(),
  show_banner_on_product_detail: z.boolean(),
  show_banner_on_checkout: z.boolean(),
  // Toggles
  enable_manual_payment: z.boolean(),
  enable_sharwa_pay: z.boolean(),
  multi_location_enabled: z.boolean(),
  /** [NEEDS BACKEND] — the store's own URL for the SEO preview. */
  store_url: z.string(),
  /** [NEEDS BACKEND] — open `pending_payment` orders, for the Sharwa Pay warning (M34 §8). */
  pending_payment_orders: z.number().int(),
  updated_at: z.string(),
});
export type StoreSettings = z.infer<typeof settingsSchema>;

/** `409` body of `POST settings/multi-location/` — readable conflicts (T084). */
export const multiLocationConflictSchema = z.object({
  detail: z.string(),
  conflicts: z.array(z.object({ location: z.string(), products_with_stock: z.number().int() })),
});

// ── Write models (one per Django form) ───────────────────────────────────────────────
const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/\S+\.\S+/.test(v), "أدخل رابطاً كاملاً يبدأ بـ https://");

export const identityInputSchema = z.object({
  store_name: z.string().trim().min(3, "اسم المتجر من 3 إلى 100 حرف").max(STORE_NAME_MAX, "اسم المتجر من 3 إلى 100 حرف"),
  about_us: z.string().max(ABOUT_US_MAX, `${ABOUT_US_MAX} حرف على الأكثر.`),
  timezone: z.string().min(1, "اختر المنطقة الزمنية."),
  week_start_day: z.enum(WEEK_START_DAYS),
});

export const contactInputSchema = z.object({
  whatsapp_number: z
    .string()
    .trim()
    .refine((v) => v === "" || /^(967|966)\d{9}$/.test(v), "رقم واتساب غير صحيح"),
  contact_email: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "بريد إلكتروني غير صحيح"),
  facebook_link: optionalUrl,
  instagram_link: optionalUrl,
  tiktok_link: optionalUrl,
  snapchat_link: optionalUrl,
});

export const policiesInputSchema = z.object({
  return_policy: z.string().max(RETURN_POLICY_MAX, `${RETURN_POLICY_MAX} حرف على الأكثر.`),
});

export const shippingInputSchema = z.object({
  default_delivery_fee: z.string().trim().regex(DECIMAL_RE, "أدخل مبلغاً صحيحاً (مثال: 1500.00)"),
  free_shipping_threshold: z.string().trim().regex(DECIMAL_RE, "أدخل مبلغاً صحيحاً (مثال: 30000.00)"),
});

const rate = z
  .string()
  .trim()
  .regex(RATE_RE, "أدخل رقماً (حتى 4 خانات عشرية)")
  .refine((v) => Number(v) > 0, "يجب أن يكون أكبر من صفر");

export const currencyInputSchema = z.object({
  currency: currencySchema,
  usd_to_sar: rate,
  sar_to_yer_old: rate,
  sar_to_yer_new: rate,
});

export const seoInputSchema = z.object({
  seo_title: z.string().max(SEO_LIMITS.seo_title, `${SEO_LIMITS.seo_title} حرفاً على الأكثر.`),
  seo_description: z.string().max(SEO_LIMITS.seo_description, `${SEO_LIMITS.seo_description} حرفاً على الأكثر.`),
  seo_keywords: z.string().max(SEO_LIMITS.seo_keywords, `${SEO_LIMITS.seo_keywords} حرفاً على الأكثر.`),
  seo_og_image: z.string().nullable(),
});

export const announcementInputSchema = z.object({
  enable_announcement_bar: z.boolean(),
  announcement_text: z.string().max(ANNOUNCEMENT_MAX, `${ANNOUNCEMENT_MAX} حرفاً على الأكثر.`),
  announcement_bg_color: z.string().regex(HEX_RE, "لون بصيغة #RRGGBB."),
  announcement_text_color: z.string().regex(HEX_RE, "لون بصيغة #RRGGBB."),
  announcement_scroll_speed: z.enum(SCROLL_SPEEDS),
  show_banner_on_home: z.boolean(),
  show_banner_on_products: z.boolean(),
  show_banner_on_product_detail: z.boolean(),
  show_banner_on_checkout: z.boolean(),
});

export const paymentsInputSchema = z.object({
  enable_manual_payment: z.boolean(),
  enable_sharwa_pay: z.boolean(),
});

export type IdentityInput = z.infer<typeof identityInputSchema>;
export type ContactInput = z.infer<typeof contactInputSchema>;
export type PoliciesInput = z.infer<typeof policiesInputSchema>;
export type ShippingInput = z.infer<typeof shippingInputSchema>;
export type CurrencyInput = z.infer<typeof currencyInputSchema>;
export type SeoInput = z.infer<typeof seoInputSchema>;
export type AnnouncementInput = z.infer<typeof announcementInputSchema>;
export type PaymentsInput = z.infer<typeof paymentsInputSchema>;

// ── Sections ─────────────────────────────────────────────────────────────────────────
export const SETTINGS_SECTIONS = [
  "identity",
  "contact",
  "policies",
  "shipping",
  "currency",
  "seo",
  "announcement",
  "payments",
  "locations",
] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export interface SectionMeta {
  key: SettingsSection;
  title: string;
  description: string;
  /** FR-34.11 — hidden (and not routable) when the store lacks the feature. */
  feature?: FeatureKey;
  /** FR-34.03 auto-save vs FR-34.04 explicit save behind a confirmation. */
  mode: "auto" | "explicit";
  /** Money/structure: owner only (M34 §2, §10 assumption). */
  ownerOnly: boolean;
  /** The BFF route segment. */
  endpoint: string;
  /** Searchable field labels for ⌘K «إعداد: …» (US-34.1.3) → `#<field>` anchors. */
  fields: Array<{ id: string; label: string; keywords?: string[] }>;
}

export const SECTION_META: Record<SettingsSection, SectionMeta> = {
  identity: {
    key: "identity",
    title: "الهوية",
    description: "اسم المتجر ونبذة عنه، المنطقة الزمنية وبداية الأسبوع.",
    mode: "auto",
    ownerOnly: false,
    endpoint: "identity",
    fields: [
      { id: "store_name", label: "اسم المتجر" },
      { id: "about_us", label: "نبذة عن المتجر", keywords: ["من نحن", "about"] },
      { id: "timezone", label: "المنطقة الزمنية", keywords: ["التوقيت", "timezone"] },
      { id: "week_start_day", label: "بداية الأسبوع", keywords: ["الأسبوع"] },
    ],
  },
  contact: {
    key: "contact",
    title: "التواصل",
    description: "واتساب والبريد وروابط التواصل الاجتماعي.",
    feature: "contact_info",
    mode: "auto",
    ownerOnly: false,
    endpoint: "contact",
    fields: [
      { id: "whatsapp_number", label: "رقم واتساب", keywords: ["whatsapp", "هاتف"] },
      { id: "contact_email", label: "البريد الإلكتروني", keywords: ["email"] },
      { id: "custom_domain", label: "النطاق الخاص", keywords: ["دومين", "domain"] },
      { id: "instagram_link", label: "روابط التواصل الاجتماعي", keywords: ["فيسبوك", "إنستغرام", "تيك توك", "سناب"] },
    ],
  },
  policies: {
    key: "policies",
    title: "السياسات",
    description: "سياسة الاسترجاع كما يقرؤها المشتري.",
    feature: "store_policies",
    mode: "auto",
    ownerOnly: false,
    endpoint: "policies",
    fields: [{ id: "return_policy", label: "سياسة الاسترجاع", keywords: ["إرجاع", "استبدال"] }],
  },
  shipping: {
    key: "shipping",
    title: "الشحن",
    description: "رسوم التوصيل الافتراضية وحدّ الشحن المجاني.",
    feature: "shipping_settings",
    mode: "explicit",
    ownerOnly: true,
    endpoint: "shipping",
    fields: [
      { id: "default_delivery_fee", label: "رسوم التوصيل الافتراضية", keywords: ["توصيل"] },
      { id: "free_shipping_threshold", label: "حد الشحن المجاني", keywords: ["شحن مجاني"] },
    ],
  },
  currency: {
    key: "currency",
    title: "العملات",
    description: "عملة العرض وأسعار الصرف الثلاثة.",
    feature: "currency_settings",
    mode: "explicit",
    ownerOnly: true,
    endpoint: "currency",
    fields: [
      { id: "currency", label: "عملة العرض", keywords: ["عملة", "currency"] },
      { id: "usd_to_sar", label: "أسعار الصرف", keywords: ["صرف", "دولار", "ريال يمني"] },
    ],
  },
  seo: {
    key: "seo",
    title: "SEO",
    description: "كيف يظهر متجرك في نتائج البحث وعند المشاركة.",
    feature: "seo_settings",
    mode: "auto",
    ownerOnly: false,
    endpoint: "seo",
    fields: [
      { id: "seo_title", label: "عنوان SEO", keywords: ["محركات البحث"] },
      { id: "seo_description", label: "وصف SEO" },
      { id: "seo_og_image", label: "صورة المشاركة", keywords: ["og"] },
    ],
  },
  announcement: {
    key: "announcement",
    title: "شريط الإعلانات",
    description: "نص متحرك أعلى صفحات المتجر.",
    feature: "coupon",
    mode: "auto",
    ownerOnly: false,
    endpoint: "announcement",
    fields: [{ id: "announcement_text", label: "نص شريط الإعلانات", keywords: ["إعلان", "بانر"] }],
  },
  payments: {
    key: "payments",
    title: "الدفع",
    description: "الدفع اليدوي وشروة باي.",
    mode: "explicit",
    ownerOnly: true,
    endpoint: "payments",
    fields: [
      { id: "enable_manual_payment", label: "الدفع اليدوي", keywords: ["تحويل بنكي"] },
      { id: "enable_sharwa_pay", label: "شروة باي", keywords: ["sharwa pay"] },
    ],
  },
  locations: {
    key: "locations",
    title: "المواقع",
    description: "إدارة المخزون لكل موقع أو كمخزون واحد.",
    feature: "multi_location",
    mode: "explicit",
    ownerOnly: true,
    endpoint: "multi-location",
    fields: [{ id: "multi_location_enabled", label: "تعدد المواقع", keywords: ["فروع", "مستودعات"] }],
  },
};

/** WCAG relative-luminance contrast between two hex colours (announcement bar, US-34.6.3). */
export function contrastRatio(a: string, b: string): number {
  if (!HEX_RE.test(a) || !HEX_RE.test(b)) return 21;
  const lum = (hex: string) => {
    const ch = (i: number) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
