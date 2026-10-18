import type { PersonalizationField } from "@/features/storefront/schemas/catalog";

/**
 * `[NEEDS BACKEND]` product data the M04 fixture does not model yet (M10 §7): tier prices,
 * bundle components, personalization fields, legacy `sizes_list`/`colors_list`, the auction
 * parameters and the bookable service's hours. Keyed by product NAME so the fixture stays
 * readable; each entry mirrors a Django model (`ProductTierPrice`, `BundleComponent`,
 * `PersonalizationField`, `Auction`, `ServiceAvailability`). Amounts are decimal strings in
 * the product's own currency, converted by the mock server like Django would.
 */
export const TIER_PRICES: Record<string, Array<{ min_quantity: number; price: string }>> = {
  "تمر سكري فاخر 1كغ": [
    { min_quantity: 1, price: "80.00" },
    { min_quantity: 5, price: "72.00" },
    { min_quantity: 10, price: "65.00" },
  ],
  "قهوة عربية مطحونة 500غ": [
    { min_quantity: 1, price: "65.00" },
    { min_quantity: 6, price: "58.00" },
  ],
};

export const BUNDLES: Record<string, Array<{ name: string; quantity: number; is_optional: boolean }>> = {
  "طقم فناجين": [
    { name: "دلة قهوة نحاس", quantity: 1, is_optional: false },
    { name: "ترمس حافظ", quantity: 1, is_optional: true },
    { name: "هيل حب 250غ", quantity: 1, is_optional: true },
  ],
};

/** All nine `field_type`s on one product, so US-10.3.4 is exercised end to end. */
export const PERSONALIZATION: Record<string, Array<Omit<PersonalizationField, "display_price_add"> & { price_add: string | null }>> = {
  "خاتم فضة": [
    { id: 1, label: "الاسم المنقوش", field_type: "text", is_required: true, options: [], price_add: "15.00" },
    { id: 2, label: "نوع الخط", field_type: "select", is_required: true, options: ["نسخ", "ثلث", "ديواني"], price_add: null },
    { id: 3, label: "مقاس الخاتم", field_type: "number", is_required: true, options: [], price_add: null },
    { id: 4, label: "إضافات", field_type: "multi_select", is_required: false, options: ["علبة خشبية", "بطاقة إهداء"], price_add: "10.00" },
    { id: 5, label: "تاريخ المناسبة", field_type: "date", is_required: false, options: [], price_add: null },
    { id: 6, label: "تغليف هدية", field_type: "checkbox", is_required: false, options: [], price_add: "8.00" },
    { id: 7, label: "رسالة داخل العلبة", field_type: "textarea", is_required: false, options: [], price_add: null },
    { id: 8, label: "صورة للنقش", field_type: "image", is_required: false, options: [], price_add: null },
    { id: 9, label: "ملف التصميم", field_type: "file", is_required: false, options: [], price_add: null },
  ],
};

/** A pre-variants product that still sells by `sizes_list`/`colors_list` (US-10.2.4). */
export const LEGACY_OPTIONS: Record<string, { sizes: string[]; colors: string[] }> = {
  "جلابية صيفية": { sizes: ["S", "M", "L", "XL"], colors: ["أزرق", "وردي", "أبيض"] },
};

export const AUCTIONS: Record<string, { start_bid: string; bid_step: string; buy_now: string | null; anti_sniping_seconds: number; seed_bids: string[]; hours_left: number }> = {
  "مسبحة كهرمان": {
    start_bid: "900.00",
    bid_step: "25.00",
    buy_now: "1600.00",
    anti_sniping_seconds: 120,
    seed_bids: ["925.00", "950.00", "975.00", "1000.00"],
    hours_left: 26,
  },
};

/** `ServiceAvailability`: weekday (0 = Monday, Django) → opening hours in the store's timezone. */
export const SERVICE_HOURS: Record<string, { weekdays: number[]; from: number; to: number }> = {
  "ورشة تغليف هدايا": { weekdays: [0, 1, 2, 3, 5, 6], from: 10, to: 17 },
};

/** Free-text review comments, picked deterministically per product. */
export const REVIEW_TEXTS = [
  "جودة ممتازة ووصل قبل الموعد، شكراً لكم.",
  "المنتج مطابق للصور تماماً والتغليف أنيق.",
  "سعر مناسب، لكن التوصيل تأخر يوماً.",
  "رائحة ثابتة طوال اليوم، أنصح به.",
  "الخامة جيدة والمقاس مضبوط.",
  "تعامل راقٍ وسرعة في الرد على واتساب.",
  "جميل لكن اللون أغمق قليلاً من الصورة.",
  "ثاني مرة أطلب منكم ولن تكون الأخيرة.",
];

/** Store's automatic offers (`PromotionalOffer`, M13) — the card content of `promotional_offers`. */
export const OFFERS: Record<string, Array<{ id: number; name: string; offer_type: "discount" | "free_shipping" | "buy_x_get_y"; description: string; cta_text: string; link: string; days_left: number }>> = {
  noor: [
    {
      id: 1,
      name: "البخور: اشترِ 2 والثالث مجاناً",
      offer_type: "buy_x_get_y",
      description: "يُطبَّق تلقائياً في السلة على بخور معمول عند إضافة 3 قطع.",
      cta_text: "أضف البخور",
      link: "/c/5",
      days_left: 9,
    },
    {
      id: 2,
      name: "شحن مجاني للطلبات الكبيرة",
      offer_type: "free_shipping",
      description: "التوصيل مجاني عندما يتجاوز طلبك حدّ الشحن المجاني.",
      cta_text: "تسوّق الآن",
      link: "/products",
      days_left: 30,
    },
    {
      id: 3,
      name: "خصم 10% لأول طلب",
      offer_type: "discount",
      description: "استخدم الكود WELCOME10 في السلة أو صفحة الدفع.",
      cta_text: "ابدأ التسوق",
      link: "/products?is_featured=true",
      days_left: 14,
    },
  ],
};
