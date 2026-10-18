import { z } from "zod";
import { DATA_TYPES, FIELD_TYPES } from "@/features/products/schemas/enums";

/**
 * Three-tier variants (discovery 02 §2): VariantAttribute (store dictionary) →
 * VariantOption (typed value) → ProductVariant (combination with `extra_price`, `stock`,
 * `sku`, `image`). `effective_price = price + extra_price` comes back formatted from the
 * server as `display_effective_price` (FR-04.14).
 */
export const variantOptionSchema = z.object({
  id: z.number().int(),
  attribute_id: z.number().int(),
  value: z.string(),
  text_value: z.string().nullable(),
  numeric_value: z.string().nullable(),
  unit_value: z.string().nullable(),
  boolean_value: z.boolean().nullable(),
  date_value: z.string().nullable(),
  image: z.string().nullable(),
  /** [NEEDS BACKEND] swatch colour for `field_type=swatches` without an image. Data, not styling. */
  color: z.string().nullable().optional(),
});
export type VariantOption = z.infer<typeof variantOptionSchema>;

export const variantAttributeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  field_type: z.enum(FIELD_TYPES),
  data_type: z.enum(DATA_TYPES),
  unit: z.string(),
  min_value: z.string().nullable(),
  max_value: z.string().nullable(),
  is_required: z.boolean(),
  sort_order: z.number().int(),
  options: z.array(variantOptionSchema),
  /** Products whose variants use this attribute — blocks deletion (M04 §8). */
  products_count: z.number().int(),
});
export type VariantAttribute = z.infer<typeof variantAttributeSchema>;
export const variantAttributeListSchema = z.array(variantAttributeSchema);

export const variantAttributeInputSchema = z
  .object({
    name: z.string().trim().min(1, "أدخل اسم السمة.").max(100),
    field_type: z.enum(FIELD_TYPES),
    data_type: z.enum(DATA_TYPES),
    unit: z.string().max(20),
    min_value: z.string().refine((v) => v === "" || /^-?\d+(\.\d+)?$/.test(v), "رقم صحيح أو عشري."),
    max_value: z.string().refine((v) => v === "" || /^-?\d+(\.\d+)?$/.test(v), "رقم صحيح أو عشري."),
    is_required: z.boolean(),
    sort_order: z.string().refine((v) => /^\d+$/.test(v), "عدد صحيح."),
  })
  .superRefine((v, ctx) => {
    if (v.data_type === "unit" && !v.unit.trim()) {
      ctx.addIssue({ code: "custom", path: ["unit"], message: "أدخل الوحدة (مثال: سم، غ)." });
    }
    if (v.min_value && v.max_value && Number(v.min_value) > Number(v.max_value)) {
      ctx.addIssue({ code: "custom", path: ["max_value"], message: "الحد الأعلى أقل من الحد الأدنى." });
    }
  });
export type VariantAttributeInput = z.infer<typeof variantAttributeInputSchema>;

export const productVariantSchema = z.object({
  id: z.number().int(),
  option_ids: z.array(z.number().int()),
  /** Display label «أحمر / M» built server-side in attribute order. */
  label: z.string(),
  sku: z.string(),
  extra_price: z.string(),
  stock: z.string(),
  image: z.string().nullable(),
  display_effective_price: z.string(),
});
export type ProductVariant = z.infer<typeof productVariantSchema>;
export const productVariantListSchema = z.array(productVariantSchema);

export const generateVariantsRequestSchema = z.object({
  attribute_ids: z.array(z.number().int()),
  /** Option-id tuples to leave out (FR-04.09). */
  exclude: z.array(z.array(z.number().int())),
  /** [NEEDS BACKEND] extension: which values of each attribute take part (US-04.5). */
  option_ids: z.array(z.number().int()).optional(),
});
export type GenerateVariantsRequest = z.infer<typeof generateVariantsRequestSchema>;

export const variantPatchSchema = z.object({
  id: z.number().int(),
  sku: z.string().optional(),
  extra_price: z.string().optional(),
  stock: z.string().optional(),
});
