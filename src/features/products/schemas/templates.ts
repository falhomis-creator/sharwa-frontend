import { z } from "zod";
import { DATA_TYPES, FIELD_TYPES } from "@/features/products/schemas/enums";

/**
 * Merchant blueprints (`ProductTemplate`) and the 35 central sectors
 * (`GlobalVariantTemplate`, read-only for merchants) — discovery 02 §2, M04 US-04.6.
 * `fields` is the deep copy of the scalar Product fields (`BLUEPRINT_SCALAR_FIELDS`).
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

/** Labels for the scalar blueprint fields shown in the template editor/preview. */
export const BLUEPRINT_FIELD_LABELS: Record<string, string> = {
  product_type: "نوع المنتج",
  unit: "الوحدة",
  currency: "العملة",
  payment_policy: "سياسة الدفع",
  deposit_required: "العربون المطلوب",
  is_taxable: "خاضع للضريبة",
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
  product_template: "قالب الصفحة",
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
