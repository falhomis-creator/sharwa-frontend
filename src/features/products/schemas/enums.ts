/**
 * Product enums — VERBATIM from discovery 02 §2 (data-model §4). The Arabic labels for
 * `payment_policy` are the model's own; the other labels are display copy.
 */
export const PAYMENT_POLICIES = ["cod", "deposit", "full"] as const;
export type PaymentPolicy = (typeof PAYMENT_POLICIES)[number];
export const PAYMENT_POLICY_LABELS: Record<PaymentPolicy, string> = {
  cod: "الدفع عند الاستلام",
  deposit: "عربون مقدماً والباقي عند الاستلام",
  full: "الدفع كاملاً مقدماً",
};

export const UNITS = [
  "piece",
  "gram",
  "kilogram",
  "milliliter",
  "liter",
  "meter",
  "centimeter",
  "square_meter",
  "dozen",
  "box",
  "bundle",
  "pair",
  "set",
  "roll",
] as const;
export type Unit = (typeof UNITS)[number];
export const UNIT_LABELS: Record<Unit, string> = {
  piece: "قطعة",
  gram: "غرام",
  kilogram: "كيلوغرام",
  milliliter: "مليلتر",
  liter: "لتر",
  meter: "متر",
  centimeter: "سنتيمتر",
  square_meter: "متر مربع",
  dozen: "دزينة",
  box: "صندوق",
  bundle: "حزمة",
  pair: "زوج",
  set: "طقم",
  roll: "لفّة",
};

export const PRODUCT_TYPES = ["physical", "digital", "service"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  physical: "منتج مادي",
  digital: "منتج رقمي",
  service: "خدمة",
};

export const PRICING_TYPES = ["fixed", "formula"] as const;
export type PricingType = (typeof PRICING_TYPES)[number];
export const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  fixed: "سعر ثابت",
  formula: "بالمعادلة (وحدة × معامل + ثابت)",
};

export const HAZARD_CLASSES = ["none", "flammable", "liquid", "fragile"] as const;
export type HazardClass = (typeof HAZARD_CLASSES)[number];
export const HAZARD_CLASS_LABELS: Record<HazardClass, string> = {
  none: "لا شيء",
  flammable: "قابل للاشتعال",
  liquid: "سائل",
  fragile: "قابل للكسر",
};

export const VARIANT_DISPLAY_STYLES = ["swatches", "dropdown", "radio"] as const;
export type VariantDisplayStyle = (typeof VARIANT_DISPLAY_STYLES)[number];
export const VARIANT_DISPLAY_STYLE_LABELS: Record<VariantDisplayStyle, string> = {
  swatches: "مربعات (swatches)",
  dropdown: "قائمة منسدلة",
  radio: "أزرار اختيار",
};

export const PRODUCT_TEMPLATES = ["standard", "landing_page"] as const;
export type ProductTemplateKind = (typeof PRODUCT_TEMPLATES)[number];
export const PRODUCT_TEMPLATE_LABELS: Record<ProductTemplateKind, string> = {
  standard: "صفحة منتج قياسية",
  landing_page: "صفحة هبوط",
};

/** Derived lifecycle state (FR-04.02) — computed server-side exactly as `visible()`. */
export const PRODUCT_STATUSES = ["published", "draft", "scheduled", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  published: "منشور",
  draft: "مسودة",
  scheduled: "مجدول",
  archived: "مؤرشف",
};

export const STOCK_FILTERS = ["in_stock", "low", "out"] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];
export const STOCK_FILTER_LABELS: Record<StockFilter, string> = {
  in_stock: "متاح",
  low: "منخفض",
  out: "نفد",
};

export const PRODUCT_FLAGS = ["variants", "bundle", "auction", "bookable"] as const;
export type ProductFlag = (typeof PRODUCT_FLAGS)[number];
export const PRODUCT_FLAG_LABELS: Record<ProductFlag, string> = {
  variants: "بمتغيرات",
  bundle: "حزمة",
  auction: "مزاد",
  bookable: "قابل للحجز",
};

export const CURRENCY_CODES = ["SAR", "USD", "YER_OLD", "YER_NEW"] as const;

// ── Variant dictionary (FR-04.10) ─────────────────────────────────────────────────────
export const FIELD_TYPES = ["select", "radio", "multi_select", "swatches", "text", "numeric", "date"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  select: "قائمة منسدلة",
  radio: "أزرار اختيار",
  multi_select: "اختيار متعدد",
  swatches: "مربعات (صور/ألوان)",
  text: "نص",
  numeric: "رقم",
  date: "تاريخ",
};

export const DATA_TYPES = ["text", "number", "unit", "bool", "date", "file", "image"] as const;
export type DataType = (typeof DATA_TYPES)[number];
export const DATA_TYPE_LABELS: Record<DataType, string> = {
  text: "نص",
  number: "رقم",
  unit: "رقم بوحدة",
  bool: "نعم/لا",
  date: "تاريخ",
  file: "ملف",
  image: "صورة",
};

// ── Bulk (M04 §7) ─────────────────────────────────────────────────────────────────────
export const PRODUCT_BULK_ACTIONS = [
  "publish",
  "archive",
  "unarchive",
  "delete",
  "set_category",
  "add_tag",
  "remove_tag",
] as const;
export type ProductBulkAction = (typeof PRODUCT_BULK_ACTIONS)[number];

/** `LOW_STOCK_THRESHOLD` (discovery 02 §1, `products/constants.py`). */
export const LOW_STOCK_THRESHOLD = 3;
/** Matrix size above which the generator warns (M04 §10 — a UI decision, not a server limit). */
export const VARIANT_MATRIX_WARN = 100;

/** Default colour offered for a new swatch value (data, stored on the option). */
export const DEFAULT_SWATCH_COLOR = "#18181b";
