import { z } from "zod";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/access";
import { currencyEnum, listOf } from "@/features/platform-admin/schemas/common";

/**
 * M46 — plans, the plan × feature matrix, the feature catalogue + kill switch, per-store
 * overrides, subscriptions, the two master switches and the resolution check.
 */
export const BILLING_INTERVALS = ["monthly", "yearly", "lifetime"] as const;
export const BILLING_INTERVAL_LABELS: Record<(typeof BILLING_INTERVALS)[number], string> = { monthly: "شهري", yearly: "سنوي", lifetime: "مدى الحياة" };
export const COMMISSION_TYPES = ["none", "percentage", "fixed"] as const;
export const COMMISSION_TYPE_LABELS: Record<(typeof COMMISSION_TYPES)[number], string> = { none: "بلا عمولة", percentage: "نسبة", fixed: "مبلغ ثابت" };

export const planSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  is_free: z.boolean(),
  price: z.string(),
  display_price: z.string(),
  currency: currencyEnum,
  billing_interval: z.enum(BILLING_INTERVALS),
  commission_type: z.enum(COMMISSION_TYPES),
  commission_value: z.string(),
  display_commission: z.string(),
  max_products: z.number().int().nullable(),
  max_orders_per_month: z.number().int().nullable(),
  is_active: z.boolean(),
  is_default_free: z.boolean(),
  display_order: z.number().int(),
  current_subscriptions: z.number().int(),
});
export type Plan = z.infer<typeof planSchema>;
export const planListSchema = z.array(planSchema);

/** FR-46.02 — exactly the model fields; `is_default_free` requires `is_free` (US-46.1 a1). */
export const planInputSchema = z
  .object({
    code: z.string().trim().regex(/^[a-z0-9_]{2,30}$/, "حروف لاتينية صغيرة وأرقام و_ (2–30)."),
    name: z.string().trim().min(1, "أدخل اسم الباقة.").max(80),
    description: z.string().max(500),
    is_free: z.boolean(),
    price: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "أدخل سعراً صحيحاً (مثال: 49.00)."),
    currency: currencyEnum,
    billing_interval: z.enum(BILLING_INTERVALS),
    commission_type: z.enum(COMMISSION_TYPES),
    commission_value: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "أدخل قيمة صحيحة."),
    max_products: z.string().trim().regex(/^\d*$/, "رقم صحيح أو فارغ (بلا حد)."),
    max_orders_per_month: z.string().trim().regex(/^\d*$/, "رقم صحيح أو فارغ (بلا حد)."),
    is_active: z.boolean(),
    is_default_free: z.boolean(),
    display_order: z.coerce.number().int().min(0),
  })
  .superRefine((v, ctx) => {
    if (v.is_default_free && !v.is_free) ctx.addIssue({ code: "custom", path: ["is_default_free"], message: "الباقة الافتراضية يجب أن تكون مجانية." });
    if (v.is_free && Number(v.price) > 0) ctx.addIssue({ code: "custom", path: ["price"], message: "الباقة المجانية سعرها 0." });
    if (v.commission_type === "percentage" && Number(v.commission_value) > 100) ctx.addIssue({ code: "custom", path: ["commission_value"], message: "النسبة 100 على الأكثر." });
  });
export type PlanInput = z.infer<typeof planInputSchema>;

export const planFeatureCellSchema = z.object({ plan_id: z.number().int(), feature_code: z.string(), is_enabled: z.boolean() });
export const planFeatureListSchema = z.array(planFeatureCellSchema);
export type PlanFeatureCell = z.infer<typeof planFeatureCellSchema>;

/**
 * Sidebar groups of the 39 keys + `pos` (M46 §5). The catalogue comes from the server; this map
 * only orders and labels it — a key it does not know lands in «أخرى» (M46 §8).
 */
export const MODULE_GROUPS = [
  { key: "orders", label: "الطلبات", codes: ["refunds", "pos"] },
  { key: "products", label: "المنتجات", codes: ["inventory", "bulk_upload", "multi_location", "product_report"] },
  {
    key: "marketing",
    label: "التسويق",
    codes: ["marketing", "coupon", "abandoned_carts", "tracking_tools", "influencers", "promotions", "campaigns", "timeline", "affiliates", "loyalty_settings", "gift_settings"],
  },
  { key: "bookings", label: "الحجوزات", codes: ["bookings"] },
  { key: "storefront", label: "المتجر", codes: ["storefront_design", "contact_info", "store_policies"] },
  { key: "channels", label: "القنوات", codes: ["social_channels", "marketplaces", "dropshipping"] },
  { key: "customers", label: "العملاء", codes: ["customer_report", "customer_wallets"] },
  { key: "staff", label: "الموظفون", codes: ["staff_rbac"] },
  { key: "reports", label: "التقارير", codes: ["reports"] },
  { key: "shipping", label: "الشحن", codes: ["shipping_settings", "pickuplocation", "shipping_companies", "shipping_providers", "sharwa_ship"] },
  { key: "payments", label: "الدفع", codes: ["payment_gateways", "local_wallets", "bank_transfers"] },
  { key: "tools", label: "الأدوات", codes: ["currency_settings", "seo_settings"] },
  { key: "wallet", label: "المحفظة", codes: ["merchantwallet"] },
  { key: "apps", label: "التطبيقات", codes: ["app_marketplace"] },
] as const satisfies ReadonlyArray<{ key: string; label: string; codes: readonly FeatureKey[] }>;

export const OTHER_GROUP = { key: "other", label: "أخرى" } as const;

export function groupOf(code: string): { key: string; label: string } {
  const g = MODULE_GROUPS.find((m) => (m.codes as readonly string[]).includes(code));
  return g ? { key: g.key, label: g.label } : OTHER_GROUP;
}

export const KNOWN_FEATURE_KEYS: readonly string[] = FEATURE_KEYS;

export const featureSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  module_group: z.string(),
  is_active_globally: z.boolean(),
  requires_plan: z.boolean(),
  override_count: z.number().int(),
  /** Overrides with `is_enabled=true` — the stores that keep working after a kill (M46 §8). */
  enabled_override_schemas: z.array(z.string()),
  plans_enabled: z.number().int(),
});
export type Feature = z.infer<typeof featureSchema>;
export const featureListSchema = z.array(featureSchema);

export const overrideSchema = z.object({
  id: z.number().int(),
  feature_code: z.string(),
  schema_name: z.string(),
  store_name: z.string(),
  is_enabled: z.boolean(),
  notes: z.string(),
  updated_at: z.string(),
});
export type FeatureOverride = z.infer<typeof overrideSchema>;
export const overrideListSchema = listOf(overrideSchema);

export const bulkOverrideInputSchema = z.object({
  feature_code: z.string().min(1, "اختر ميزة."),
  schema_names: z.array(z.string()).min(1, "اختر متجراً واحداً على الأقل."),
  /** `null` removes the override for the selected stores (back to «موروثة»). */
  is_enabled: z.boolean().nullable(),
  /** Django's `TenantFeatureOverride.notes` is a 255-char column (INT-030). */
  notes: z.string().max(255),
});
export type BulkOverrideInput = z.infer<typeof bulkOverrideInputSchema>;

/** The server's verdict — FR-46.04 steps; `plan_feature_missing` is step 5 «الغياب = لا». */
export const DECIDED_BY = ["override", "global_kill", "no_plan_required", "subscriptions_disabled", "plan_feature", "plan_feature_missing"] as const;
export type DecidedBy = (typeof DECIDED_BY)[number];
export const DECIDED_BY_STEP: Record<DecidedBy, number> = {
  override: 1,
  global_kill: 2,
  no_plan_required: 3,
  subscriptions_disabled: 4,
  plan_feature: 5,
  plan_feature_missing: 5,
};

export const RESOLUTION_STEPS = [
  "استثناء المتجر (TenantFeatureOverride) — يفوز على كل ما بعده",
  "الإيقاف العالمي (is_active_globally=false) ⇒ غير متاحة",
  "لا تتطلب باقة (requires_plan=false) ⇒ متاحة",
  "الباقات غير مفعّلة (subscriptions_enabled=false) ⇒ متاحة",
  "خلية الباقة الحالية (PlanFeature.is_enabled) — الغياب = غير متاحة",
] as const;

export const resolveSchema = z.object({
  feature_code: z.string(),
  schema_name: z.string(),
  enabled: z.boolean(),
  decided_by: z.enum(DECIDED_BY),
  plan: z.string().nullable(),
});
export type Resolution = z.infer<typeof resolveSchema>;

/** `GET /stores/<schema>/features/` — every key as the server resolves it (FR-20.05). */
export const storeFeatureSchema = z.object({
  code: z.string(),
  name: z.string(),
  module_group: z.string(),
  effective: z.boolean(),
  source: z.enum(DECIDED_BY),
  override: z.object({ is_enabled: z.boolean(), notes: z.string() }).nullable(),
});
export type StoreFeature = z.infer<typeof storeFeatureSchema>;
export const storeFeatureListSchema = z.array(storeFeatureSchema);

export const billingSettingsSchema = z.object({
  subscriptions_enabled: z.boolean(),
  commission_enabled: z.boolean(),
  /** For the edge case of §8: stores with no current subscription when the gate opens. */
  stores_without_subscription: z.number().int(),
  default_free_plan: z.string().nullable(),
  updated_at: z.string(),
});
export type BillingSettings = z.infer<typeof billingSettingsSchema>;

export const assignInputSchema = z.object({
  schema_name: z.string().min(1, "اختر متجراً."),
  plan_id: z.number().int().positive("اختر باقة."),
  status: z.enum(["active", "cancelled", "expired"]).default("active"),
  current_period_end: z.string().optional(),
  notes: z.string().max(255).default(""),
});
export type AssignInput = z.infer<typeof assignInputSchema>;
