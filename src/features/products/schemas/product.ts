import { z } from "zod";
import { compareDecimal, isDecimal } from "@/lib/decimal";
import { toWesternDigits } from "@/lib/format";
import { paginated } from "@/lib/schemas/pagination";
import {
  CURRENCY_CODES,
  HAZARD_CLASSES,
  PAYMENT_POLICIES,
  PRICING_TYPES,
  PRODUCT_STATUSES,
  PRODUCT_TEMPLATES,
  PRODUCT_TYPES,
  UNITS,
  VARIANT_DISPLAY_STYLES,
} from "@/features/products/schemas/enums";
import { productVariantSchema } from "@/features/products/schemas/variants";

/**
 * M04 Product contracts (data-model §4, discovery 02 §2 + §15 `ProductForm`).
 * All rows are `[NEEDS BACKEND]` (M04 §7): these are the PROPOSED `/api/v1/products/`
 * shapes, served by `/api/bff/products/**` from `src/mocks/catalog/*`.
 *
 * Money in: decimal TEXT (`"120.00"`), never a float (data-model §6).
 * Money out: `display_*` strings, rendered verbatim by `<Money>`.
 */
const decimalText = z.string().regex(/^\d+(\.\d+)?$/);
const nullableDecimal = decimalText.nullable();

export const productStatusSchema = z.enum(PRODUCT_STATUSES);

// ── List row (M04 §7 «قائمة المنتجات») ────────────────────────────────────────────────
export const productListItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  sku: z.string(),
  image: z.string().nullable(),
  display_price: z.string(),
  display_old_price: z.string().nullable(),
  /** Decimal(12,3) as text. */
  stock: z.string(),
  unit: z.enum(UNITS),
  is_low_stock: z.boolean(),
  category: z.object({ id: z.number().int(), name: z.string() }).nullable(),
  status: productStatusSchema,
  has_variants: z.boolean(),
  updated_at: z.string(),
  // [NEEDS BACKEND] extensions the list needs (M04 §8 edge cases):
  is_serialized: z.boolean().optional(),
  is_auction_active: z.boolean().optional(),
  /** Raw price for in-place editing (FR-04.11). */
  price: decimalText.optional(),
});
export type ProductListItem = z.infer<typeof productListItemSchema>;

/** [NEEDS BACKEND] extension: the text number strip above the list (M04 §11 I). */
export const productSummarySchema = z.object({
  published: z.number().int(),
  draft: z.number().int(),
  scheduled: z.number().int(),
  archived: z.number().int(),
  low_stock: z.number().int(),
  out_of_stock: z.number().int(),
});
export type ProductSummary = z.infer<typeof productSummarySchema>;

export const productListResponseSchema = paginated(productListItemSchema).extend({
  summary: productSummarySchema.optional(),
});
export type ProductListResponse = z.infer<typeof productListResponseSchema>;

// ── Detail (all ProductForm fields + read-only derived) ──────────────────────────────
export const productImageSchema = z.object({
  id: z.number().int(),
  url: z.string(),
  sort_order: z.number().int(),
});
export type ProductImage = z.infer<typeof productImageSchema>;

export const activeBadgeSchema = z.object({ name: z.string(), color: z.string(), reason: z.string() });

export const productDetailSchema = z.object({
  id: z.number().int(),
  // identity
  name: z.string(),
  name_en: z.string(),
  slug: z.string(),
  sku: z.string(),
  barcode: z.string(),
  product_type: z.enum(PRODUCT_TYPES),
  // taxonomy
  category_id: z.number().int().nullable(),
  brand_id: z.number().int().nullable(),
  tag_ids: z.array(z.number().int()),
  badge_ids: z.array(z.number().int()),
  collection_ids: z.array(z.number().int()),
  blueprint_id: z.number().int().nullable(),
  // pricing
  price: decimalText,
  old_price: nullableDecimal,
  sale_start_at: z.string().nullable(),
  sale_end_at: z.string().nullable(),
  cost_price: nullableDecimal,
  currency: z.enum(CURRENCY_CODES),
  payment_policy: z.enum(PAYMENT_POLICIES),
  deposit_required: nullableDecimal,
  is_taxable: z.boolean(),
  tax_rate: nullableDecimal,
  // formula
  pricing_type: z.enum(PRICING_TYPES),
  live_rate_ref: z.string().nullable(),
  formula_unit_price: nullableDecimal,
  formula_coefficient: nullableDecimal,
  formula_fixed_extra: nullableDecimal,
  // refundable deposit (discovery: `has_refundable_deposit`, `refundable_deposit_amount`, `_refund_rule`, `_return_event`)
  has_refundable_deposit: z.boolean(),
  refundable_deposit_amount: nullableDecimal,
  refundable_deposit_refund_rule: z.string(),
  refundable_deposit_return_event: z.string(),
  // flags
  is_serialized: z.boolean(),
  is_bundle: z.boolean(),
  bundle_build_fee: nullableDecimal,
  is_auction: z.boolean(),
  is_personalizable: z.boolean(),
  is_bookable: z.boolean(),
  booking_duration_minutes: z.number().int().nullable(),
  // inventory
  stock: decimalText,
  unit: z.enum(UNITS),
  low_stock_threshold: z.number().int().nullable(),
  allow_backorder: z.boolean(),
  // Decimal(12,3) text — fractional for weight/length products (decision D3, 2026-10-22).
  min_quantity: nullableDecimal,
  max_quantity: nullableDecimal,
  allow_variable_quantity: z.boolean(),
  // content
  description: z.string(),
  description_en: z.string(),
  images: z.array(productImageSchema),
  image_url: z.string(),
  video_url: z.string(),
  variant_display_style: z.enum(VARIANT_DISPLAY_STYLES),
  product_template: z.enum(PRODUCT_TEMPLATES),
  // lifecycle
  is_available: z.boolean(),
  published_at: z.string().nullable(),
  archived_at: z.string().nullable(),
  is_featured: z.boolean(),
  // shipping
  is_free_shipping: z.boolean(),
  delivery_duration: z.string(),
  weight: nullableDecimal,
  length: nullableDecimal,
  width: nullableDecimal,
  height: nullableDecimal,
  is_hazardous: z.boolean(),
  hazard_class: z.enum(HAZARD_CLASSES),
  // SEO mixin
  meta_title: z.string(),
  meta_description: z.string(),
  meta_keywords: z.string(),
  og_image: z.string().nullable(),
  // variants
  variant_attribute_ids: z.array(z.number().int()),
  variants: z.array(productVariantSchema),
  // read-only / derived (server)
  status: productStatusSchema,
  display_price: z.string(),
  display_old_price: z.string().nullable(),
  display_price_with_tax: z.string().nullable(),
  profit_margin_percent: z.string().nullable(),
  is_on_sale: z.boolean(),
  sale_state: z.enum(["none", "scheduled", "active", "ended"]),
  active_badges: z.array(activeBadgeSchema),
  has_variants: z.boolean(),
  variants_stock_total: z.string().nullable(),
  serial_available: z.number().int().nullable(),
  auction_status: z.enum(["draft", "active", "ended"]).nullable(),
  has_orders: z.boolean(),
  live_rate_refs: z.array(z.object({ key: z.string(), label: z.string(), display_rate: z.string() })),
  views_count: z.number().int(),
  add_to_cart_count: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProductDetail = z.infer<typeof productDetailSchema>;

// ── Form (RHF + Zod). Conditional fields are validated only when they apply (FR-04.04). ─
/**
 * Numbers as the merchant types them: Arabic-Indic digits (١٢٠), the Arabic decimal mark (٫)
 * and thousands separators (٬ ,) are accepted and normalised before any check — an Arabic
 * keyboard must never block the save (schema audit 2026-10-23). `formToPayload` sends the
 * same normalised text.
 */
export function normalizeNumberText(v: string): string {
  return toWesternDigits(v).replace(/٫/g, ".").replace(/[٬,\s]/g, "").trim();
}
const n = (v: string) => normalizeNumberText(v);
const optionalDecimal = z.string().refine((v) => v.trim() === "" || isDecimal(n(v)), "أدخل رقماً صحيحاً (مثال: 120.00)");
const optionalInt = z.string().refine((v) => v.trim() === "" || /^\d+$/.test(n(v)), "أدخل عدداً صحيحاً.");
/** Quantity as decimal text, up to 3 places (Decimal(12,3) in Django — decision D3). */
const optionalQuantity = z
  .string()
  .refine((v) => v.trim() === "" || /^\d+(\.\d{1,3})?$/.test(n(v)), "أدخل كمية (حتى 3 خانات عشرية، مثال: 1.5).");
const isFractional = (v: string) => v.trim() !== "" && Number(n(v)) % 1 !== 0;
/** An optional link: empty, or a web address — a bare «www.…» is completed with https:// on save. */
const optionalUrl = z
  .string()
  .max(500, "الرابط 500 حرف على الأكثر.")
  .refine((v) => v.trim() === "" || /^(https?:\/\/)?[^\s/$.?#][^\s]*\.[^\s]+$/i.test(v.trim()), "أدخل رابطاً صحيحاً (مثال: https://example.com).");

/**
 * Mandatory on «إضافة منتج» (schema audit 2026-10-23, owner directive): the name, the base
 * price (unless a formula computes it), the category and the unit. Everything else —
 * description, slug, SKU, barcode, tags, media, SEO, shipping — is optional and may stay
 * empty. Conditional fields (deposit, tax rate, formula terms…) are required only while their
 * toggle is on, which is also the only time they are shown.
 */
export const PRODUCT_REQUIRED_FIELDS = ["name", "price", "category_id", "unit"] as const;

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "أدخل اسم المنتج.").max(200, "الاسم 200 حرف على الأكثر."),
    name_en: z.string().max(200, "الاسم بالإنجليزية 200 حرف على الأكثر."),
    // Optional and never blocking: whatever is typed becomes a valid slug on save.
    slug: z.string().max(255, "الرابط 255 حرفاً على الأكثر."),
    sku: z.string().max(64, "SKU حتى 64 حرفاً."),
    barcode: z.string().max(64, "الباركود 64 حرفاً على الأكثر."),
    product_type: z.enum(PRODUCT_TYPES),
    category_id: z.string(),
    brand_id: z.string(),
    tag_ids: z.array(z.number().int()),
    badge_ids: z.array(z.number().int()),
    collection_ids: z.array(z.number().int()),
    // Required unless a formula computes the price (superRefine).
    price: z.string(),
    old_price: optionalDecimal,
    sale_start_at: z.string(),
    sale_end_at: z.string(),
    cost_price: optionalDecimal,
    currency: z.enum(CURRENCY_CODES),
    payment_policy: z.enum(PAYMENT_POLICIES),
    deposit_required: optionalDecimal,
    is_taxable: z.boolean(),
    tax_rate: optionalDecimal,
    pricing_type: z.enum(PRICING_TYPES),
    live_rate_ref: z.string().max(50, "المرجع 50 حرفاً على الأكثر."),
    formula_unit_price: optionalDecimal,
    formula_coefficient: optionalDecimal,
    formula_fixed_extra: optionalDecimal,
    has_refundable_deposit: z.boolean(),
    refundable_deposit_amount: optionalDecimal,
    refundable_deposit_refund_rule: z.string(),
    refundable_deposit_return_event: z.string(),
    is_serialized: z.boolean(),
    is_bundle: z.boolean(),
    bundle_build_fee: optionalDecimal,
    is_auction: z.boolean(),
    is_personalizable: z.boolean(),
    is_bookable: z.boolean(),
    booking_duration_minutes: optionalInt,
    // Optional: empty = 0.
    stock: z.string().refine((v) => v.trim() === "" || /^\d+(\.\d{1,3})?$/.test(n(v)), "المخزون رقم حتى 3 خانات عشرية."),
    unit: z.enum(UNITS),
    low_stock_threshold: optionalInt,
    allow_backorder: z.boolean(),
    min_quantity: optionalQuantity,
    max_quantity: optionalQuantity,
    allow_variable_quantity: z.boolean(),
    description: z.string(),
    description_en: z.string(),
    image_url: optionalUrl,
    video_url: optionalUrl,
    variant_display_style: z.enum(VARIANT_DISPLAY_STYLES),
    product_template: z.enum(PRODUCT_TEMPLATES),
    is_available: z.boolean(),
    published_at: z.string(),
    is_featured: z.boolean(),
    is_free_shipping: z.boolean(),
    delivery_duration: z.string().max(100, "مدة التوصيل 100 حرف على الأكثر."),
    weight: optionalDecimal,
    length: optionalDecimal,
    width: optionalDecimal,
    height: optionalDecimal,
    is_hazardous: z.boolean(),
    hazard_class: z.enum(HAZARD_CLASSES),
    meta_title: z.string().max(70, "العنوان 70 حرفاً على الأكثر."),
    meta_description: z.string().max(160, "الوصف 160 حرفاً على الأكثر."),
    meta_keywords: z.string().max(255, "الكلمات 255 حرفاً على الأكثر."),
  })
  .superRefine((v, ctx) => {
    // ── Mandatory ──
    if (v.pricing_type !== "formula" || v.price.trim() !== "") {
      if (!isDecimal(n(v.price))) {
        ctx.addIssue({ code: "custom", path: ["price"], message: v.price.trim() ? "أدخل السعر كرقم (مثال: 120.00)." : "أدخل سعر المنتج." });
      }
    }
    if (!v.category_id) ctx.addIssue({ code: "custom", path: ["category_id"], message: "اختر تصنيف المنتج (أو أنشئ تصنيفاً بزر +)." });
    // ── Optional, but consistent when filled ──
    if (v.old_price.trim() && isDecimal(n(v.old_price)) && isDecimal(n(v.price)) && compareDecimal(n(v.old_price), n(v.price)) <= 0) {
      ctx.addIssue({ code: "custom", path: ["old_price"], message: "السعر القديم يجب أن يكون أكبر من السعر الحالي." });
    }
    if (v.payment_policy === "deposit" && !v.deposit_required.trim()) {
      ctx.addIssue({ code: "custom", path: ["deposit_required"], message: "أدخل قيمة العربون المطلوب." });
    }
    if (v.is_taxable && !v.tax_rate.trim()) {
      ctx.addIssue({ code: "custom", path: ["tax_rate"], message: "أدخل نسبة الضريبة." });
    }
    if (v.pricing_type === "formula") {
      if (!v.formula_unit_price.trim()) ctx.addIssue({ code: "custom", path: ["formula_unit_price"], message: "أدخل سعر الوحدة." });
      if (!v.formula_coefficient.trim()) ctx.addIssue({ code: "custom", path: ["formula_coefficient"], message: "أدخل المعامل." });
    }
    if (v.has_refundable_deposit && !v.refundable_deposit_amount.trim()) {
      ctx.addIssue({ code: "custom", path: ["refundable_deposit_amount"], message: "أدخل مبلغ العربون القابل للاسترجاع." });
    }
    if (v.is_bookable && !v.booking_duration_minutes.trim()) {
      ctx.addIssue({ code: "custom", path: ["booking_duration_minutes"], message: "أدخل مدة الحجز بالدقائق." });
    }
    // Shipping fields exist only for physical products — a hidden field must never block the save.
    if (v.product_type === "physical" && v.is_hazardous && v.hazard_class === "none") {
      ctx.addIssue({ code: "custom", path: ["hazard_class"], message: "اختر فئة الخطورة." });
    }
    // A fractional limit (1.5 كغ) only makes sense when the buyer may order fractions.
    if (!v.allow_variable_quantity) {
      for (const k of ["min_quantity", "max_quantity"] as const) {
        if (isFractional(v[k])) ctx.addIssue({ code: "custom", path: [k], message: "الكمية الكسرية تتطلب تفعيل «كمية متغيرة»." });
      }
    }
    if (v.min_quantity.trim() && v.max_quantity.trim() && Number(n(v.min_quantity)) > Number(n(v.max_quantity))) {
      ctx.addIssue({ code: "custom", path: ["max_quantity"], message: "الحد الأعلى أقل من الحد الأدنى." });
    }
    if (v.sale_start_at && v.sale_end_at && v.sale_start_at > v.sale_end_at) {
      ctx.addIssue({ code: "custom", path: ["sale_end_at"], message: "نهاية التخفيض قبل بدايته." });
    }
  });
export type ProductFormValues = z.infer<typeof productFormSchema>;

// ── Quick add (US-04.2: ProductQuickAddForm fields only) ──────────────────────────────
export const quickAddSchema = z
  .object({
    name: z.string().trim().min(1, "أدخل اسم المنتج.").max(200),
    name_en: z.string().max(200),
    image: z.string().nullable(),
    price: z.string().refine(isDecimal, "أدخل السعر كرقم (مثال: 120.00)."),
    stock: z.string().refine((v) => /^\d+(\.\d{1,3})?$/.test(v), "المخزون رقم حتى 3 خانات عشرية."),
    unit: z.enum(UNITS),
    blueprint_id: z.string(),
    pricing_type: z.enum(PRICING_TYPES),
    formula_unit_price: optionalDecimal,
    formula_coefficient: optionalDecimal,
    formula_fixed_extra: optionalDecimal,
    is_serialized: z.boolean(),
    is_bundle: z.boolean(),
    is_auction: z.boolean(),
    is_personalizable: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.pricing_type === "formula") {
      if (!v.formula_unit_price) ctx.addIssue({ code: "custom", path: ["formula_unit_price"], message: "أدخل سعر الوحدة." });
      if (!v.formula_coefficient) ctx.addIssue({ code: "custom", path: ["formula_coefficient"], message: "أدخل المعامل." });
    }
  });
export type QuickAddValues = z.infer<typeof quickAddSchema>;

export const quickAddResponseSchema = z.object({
  id: z.number().int(),
  /** [NEEDS BACKEND] extension: «طُبِّق قالب {name}: 33 حقلاً» (US-04.2.2). */
  applied_template: z.object({ name: z.string(), fields_count: z.number().int() }).nullable().optional(),
});

// ── Change log (US-04.8) ──────────────────────────────────────────────────────────────
export const changeEntrySchema = z.object({
  id: z.number().int(),
  field: z.string(),
  field_label: z.string(),
  before: z.string().nullable(),
  after: z.string().nullable(),
  actor: z.string(),
  at: z.string(),
});
export type ChangeEntry = z.infer<typeof changeEntrySchema>;
export const changeListSchema = paginated(changeEntrySchema);

// ── Bulk ──────────────────────────────────────────────────────────────────────────────
export const bulkResultSchema = z.object({
  succeeded: z.array(z.number().int()),
  failed: z.array(z.object({ id: z.number().int(), reason: z.string() })),
});
export type BulkResult = z.infer<typeof bulkResultSchema>;

export const stockResponseSchema = z.object({ stock: z.string(), is_low_stock: z.boolean().optional() });

// ── Import (US-04.7, FR-04.13) ────────────────────────────────────────────────────────
export const IMPORT_TARGET_FIELDS = [
  { key: "name", label: "الاسم" },
  { key: "name_en", label: "الاسم بالإنجليزية" },
  { key: "sku", label: "SKU" },
  { key: "barcode", label: "الباركود" },
  { key: "price", label: "السعر" },
  { key: "old_price", label: "السعر القديم" },
  { key: "stock", label: "المخزون" },
  { key: "category", label: "التصنيف" },
  { key: "description", label: "الوصف" },
] as const;

export const importUploadSchema = z.object({
  job_id: z.string(),
  columns: z.array(z.string()),
  preview: z.array(z.record(z.string(), z.string())),
  total_rows: z.number().int(),
  suggested_mapping: z.record(z.string(), z.string()),
  row_errors: z.array(z.object({ row: z.number().int(), msg: z.string() })),
});
export type ImportUpload = z.infer<typeof importUploadSchema>;

export const importStatusSchema = z.object({
  status: z.enum(["uploaded", "previewed", "running", "done", "failed"]),
  done: z.number().int(),
  total: z.number().int(),
  failed: z.array(z.object({ row: z.number().int(), msg: z.string() })),
});
export type ImportStatus = z.infer<typeof importStatusSchema>;
