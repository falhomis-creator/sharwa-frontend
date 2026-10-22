import { z } from "zod";
import { DATA_TYPES, FIELD_TYPES } from "@/features/products/schemas/enums";

/**
 * Merchant blueprints (`ProductTemplate`) and the 35 central sectors
 * (`GlobalVariantTemplate`, read-only for merchants) — discovery 02 §2, M04 US-04.6.
 * `fields` is the deep copy of the scalar Product fields — since decision D1 (2026-10-22) a
 * JSONField on Django's ProductTemplate, the single source of truth: exactly these keys are
 * copied into a product (create or «تطبيق على منتجات»), nothing else is touched.
 */
export const productTemplateSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  global_template_id: z.number().int().nullable(),
  variant_attribute_ids: z.array(z.number().int()),
  fields: z.record(z.string(), z.union([z.string(), z.boolean(), z.number(), z.null()])),
  products_count: z.number().int(),
  updated_at: z.string(),
});
export type ProductTemplate = z.infer<typeof productTemplateSchema>;
export const productTemplateListSchema = z.array(productTemplateSchema);

export const globalTemplateSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  attributes: z.array(
    z.object({
      /** The store-dictionary attribute this row is (integration Step 2): match by id, not by name. */
      attribute_id: z.number().int().optional(),
      name: z.string(),
      field_type: z.enum(FIELD_TYPES),
      data_type: z.enum(DATA_TYPES),
      values: z.array(z.string()),
    }),
  ),
});
export type GlobalTemplate = z.infer<typeof globalTemplateSchema>;
export const globalTemplateListSchema = z.array(globalTemplateSchema);

export const applyTemplateResultSchema = z.object({
  applied: z.number().int(),
  skipped: z.array(z.object({ id: z.number().int(), reason: z.string() })),
  /** Fields that were replaced (preview + report, US-04.6.2). */
  fields: z.array(z.string()).optional(),
});
export type ApplyTemplateResult = z.infer<typeof applyTemplateResultSchema>;

export const applyGlobalResultSchema = z.object({
  added_attributes: z.array(z.string()),
  existing_attributes: z.array(z.string()),
});

export type BlueprintValue = string | boolean | number | null;

/**
 * Typed starting value of every blueprint field (what «+ إضافة حقل» inserts). Booleans stay
 * booleans and counts stay numbers, so the JSON a template stores matches the Product model.
 */
export const BLUEPRINT_FIELD_DEFAULTS: Record<string, BlueprintValue> = {
  product_type: "physical",
  unit: "piece",
  currency: "SAR",
  payment_policy: "cod",
  deposit_required: "",
  is_taxable: false,
  tax_rate: "",
  old_price: "",
  cost_price: "",
  sale_start_at: "",
  sale_end_at: "",
  barcode: "",
  description: "",
  description_en: "",
  video_url: "",
  published_at: "",
  meta_title: "",
  meta_description: "",
  pricing_type: "fixed",
  formula_coefficient: "",
  formula_fixed_extra: "",
  low_stock_threshold: 3,
  allow_backorder: false,
  min_quantity: "1",
  max_quantity: "",
  allow_variable_quantity: false,
  variant_display_style: "dropdown",
  product_template: "standard",
  is_available: true,
  is_featured: false,
  is_free_shipping: false,
  delivery_duration: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  is_hazardous: false,
  hazard_class: "none",
  is_serialized: false,
  is_bundle: false,
  bundle_build_fee: "",
  is_personalizable: false,
  is_bookable: false,
  booking_duration_minutes: 60,
  has_refundable_deposit: false,
  refundable_deposit_amount: "",
};

/**
 * The blueprint a template starts with when it is NOT copied from a product (bug fix
 * 2026-10-22: a template built from scratch used to save `fields: {}` and show «0 حقلاً»).
 * The merchant edits or removes any of them in the template form.
 */
export const DEFAULT_BLUEPRINT_KEYS = [
  "product_type",
  "unit",
  "currency",
  "payment_policy",
  "is_taxable",
  "low_stock_threshold",
  "variant_display_style",
  "is_free_shipping",
  "delivery_duration",
] as const;

export function defaultBlueprintFields(): Record<string, BlueprintValue> {
  return Object.fromEntries(DEFAULT_BLUEPRINT_KEYS.map((k) => [k, BLUEPRINT_FIELD_DEFAULTS[k] ?? null]));
}

/** Labels for the scalar blueprint fields shown in the template editor/preview. */
export const BLUEPRINT_FIELD_LABELS: Record<string, string> = {
  product_type: "نوع المنتج",
  unit: "الوحدة",
  currency: "العملة",
  payment_policy: "سياسة الدفع",
  deposit_required: "العربون المطلوب",
  is_taxable: "خاضع للضريبة",
  // Keys Django's `BLUEPRINT_SCALAR_FIELDS` already copies (decision D1 keeps them in the JSON).
  old_price: "السعر القديم",
  cost_price: "سعر التكلفة",
  sale_start_at: "بداية التخفيض",
  sale_end_at: "نهاية التخفيض",
  barcode: "الباركود",
  description: "الوصف",
  description_en: "الوصف بالإنجليزية",
  video_url: "رابط فيديو",
  published_at: "تاريخ النشر",
  meta_title: "عنوان SEO",
  meta_description: "وصف SEO",
  tax_rate: "نسبة الضريبة",
  pricing_type: "نوع التسعير",
  formula_coefficient: "معامل الصيغة",
  formula_fixed_extra: "إضافة ثابتة",
  low_stock_threshold: "حد المخزون المنخفض",
  allow_backorder: "السماح بالطلب المسبق",
  min_quantity: "الحد الأدنى للكمية",
  max_quantity: "الحد الأعلى للكمية",
  allow_variable_quantity: "كمية متغيرة",
  variant_display_style: "نمط عرض المتغيرات",
  product_template: "تخطيط صفحة المنتج",
  is_available: "متاح للبيع",
  is_featured: "منتج مميز",
  is_free_shipping: "شحن مجاني",
  delivery_duration: "مدة التوصيل",
  weight: "الوزن (كغ)",
  length: "الطول (سم)",
  width: "العرض (سم)",
  height: "الارتفاع (سم)",
  is_hazardous: "مادة خطرة",
  hazard_class: "فئة الخطورة",
  is_serialized: "أرقام تسلسلية",
  is_bundle: "حزمة",
  bundle_build_fee: "رسوم تجميع الحزمة",
  is_personalizable: "قابل للتخصيص",
  is_bookable: "قابل للحجز",
  booking_duration_minutes: "مدة الحجز (دقيقة)",
  has_refundable_deposit: "عربون قابل للاسترجاع",
  refundable_deposit_amount: "مبلغ العربون القابل للاسترجاع",
};
