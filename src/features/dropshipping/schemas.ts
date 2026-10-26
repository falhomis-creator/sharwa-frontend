import { z } from "zod";

/** M29 — الدروبشيبينغ وموجزات الموردين (T160). Values verbatim (discovery 02 §14.C); Arabic labels fixed. */
export const SUPPLIER_CODES = ["cj", "makhazen", "knawat", "flat_feed"] as const;
export type SupplierCode = (typeof SUPPLIER_CODES)[number];
export const SUPPLIER_LABELS: Record<SupplierCode, string> = { cj: "CJ Dropshipping", makhazen: "مخازن", knawat: "كنوات", flat_feed: "ملف مسطّح" };
/** INT-039: a job may span every supplier (`price_sync` after a global rule change → `all`). */
export const JOB_SUPPLIER_CODES = [...SUPPLIER_CODES, "all"] as const;
export type JobSupplierCode = (typeof JOB_SUPPLIER_CODES)[number];
export const JOB_SUPPLIER_LABELS: Record<JobSupplierCode, string> = { ...SUPPLIER_LABELS, all: "كل الموردين" };

export const ROUNDINGS = ["none", "nearest_1", "end_99", "end_95", "end_00"] as const;
export type Rounding = (typeof ROUNDINGS)[number];
export const ROUNDING_LABELS: Record<Rounding, string> = { none: "بلا تقريب", nearest_1: "لأقرب 1", end_99: "ينتهي بـ .99", end_95: "ينتهي بـ .95", end_00: "ينتهي بـ .00" };

export const IMPORT_STATUSES = ["not_imported", "importing", "imported", "failed"] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];
export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = { not_imported: "غير مستورد", importing: "قيد الاستيراد", imported: "مستورد", failed: "فشل" };

export const SUPPLIER_ORDER_STATUSES = ["queued", "held", "submitted", "accepted", "processing", "shipped", "delivered", "cancelled", "rejected", "failed"] as const;
export type SupplierOrderStatus = (typeof SUPPLIER_ORDER_STATUSES)[number];
export const SUPPLIER_ORDER_STATUS_LABELS: Record<SupplierOrderStatus, string> = {
  queued: "في الانتظار",
  held: "محجوز",
  submitted: "مُرسَل",
  accepted: "مقبول",
  processing: "قيد المعالجة",
  shipped: "شُحن",
  delivered: "سُلِّم",
  cancelled: "ملغى",
  rejected: "مرفوض",
  failed: "فشل",
};
export const ATTENTION_STATUSES: readonly SupplierOrderStatus[] = ["held", "rejected", "failed"];

export const JOB_TYPES = ["products", "prices", "inventory", "import", "feed"] as const;
export const JOB_TYPE_LABELS: Record<(typeof JOB_TYPES)[number], string> = { products: "مزامنة المنتجات", prices: "مزامنة الأسعار", inventory: "مزامنة المخزون", import: "استيراد منتجات", feed: "تشغيل ملف" };
export const JOB_STATUSES = ["queued", "running", "completed", "completed_with_errors", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const JOB_STATUS_LABELS: Record<JobStatus, string> = { queued: "في الانتظار", running: "قيد التنفيذ", completed: "اكتملت", completed_with_errors: "اكتملت بأخطاء", failed: "فشلت" };
export const isLive = (s: string) => s === "queued" || s === "running";

export const FEED_EXTENSIONS = ["csv", "tsv", "txt", "xlsx"] as const;
export const FEED_FIELD_LABELS: Record<string, string> = {
  sku: "SKU",
  name: "الاسم",
  cost: "تكلفة المورد",
  stock: "المخزون",
  price: "السعر",
  compare_at_price: "السعر قبل الخصم",
  description: "الوصف",
  barcode: "الباركود",
  gtin: "GTIN",
  brand: "العلامة",
  category: "الفئة",
  image_url: "الصورة الرئيسية",
  extra_images: "صور إضافية",
  weight: "الوزن",
  variant_sku: "SKU المتغير",
  option1_name: "اسم الخيار 1",
  option1_value: "قيمة الخيار 1",
  option2_name: "اسم الخيار 2",
  option2_value: "قيمة الخيار 2",
  supplier_url: "رابط المورد",
};

const page = <T extends z.ZodTypeAny>(item: T) => z.object({ count: z.number(), next: z.number().nullable().optional(), previous: z.number().nullable().optional(), results: z.array(item) });

/** INT-039: Django's order-forwarding knobs per supplier (`SupplierConnection`). */
export const orderSettingsSchema = z.object({ forward_enabled: z.boolean(), forward_cod: z.boolean(), default_country_code: z.string(), shipping_method: z.string() });
export type OrderSettings = z.infer<typeof orderSettingsSchema>;

export const syncSettingsSchema = z.object({
  sync_products: z.boolean(),
  sync_prices: z.boolean(),
  sync_inventory: z.boolean(),
  intervals: z.object({ products_minutes: z.number(), prices_minutes: z.number(), inventory_minutes: z.number() }),
  stock_buffer: z.number(),
  hide_when_out_of_stock: z.boolean(),
  orders: orderSettingsSchema.optional(),
});
export type SyncSettings = z.infer<typeof syncSettingsSchema>;

export const connectionSchema = z.object({
  supplier_code: z.enum(SUPPLIER_CODES),
  connected: z.boolean(),
  account_label: z.string().nullable(),
  connected_at: z.string().nullable(),
  last_sync_at: z.string().nullable(),
  last_error: z.string().nullable(),
  settings: syncSettingsSchema,
  webhook_configured: z.boolean(),
  attention_count: z.number(),
  products_count: z.number(),
  // INT-039 — what Django's adapter registry says about this supplier (optional so older fixtures still parse).
  reauth_required: z.boolean().optional(),
  webhook_supported: z.boolean().optional(),
  inventory_sync_supported: z.boolean().optional(),
  credential_fields: z.array(z.object({ name: z.string(), label: z.string(), type: z.string(), help: z.string() })).optional(),
});
export type Connection = z.infer<typeof connectionSchema>;
export const connectionsSchema = z.object({ results: z.array(connectionSchema), attention_total: z.number() });
export const connectionDetailSchema = connectionSchema.extend({ categories: z.array(z.string()) });

export const settingsFormSchema = z.object({
  sync_products: z.boolean(),
  sync_prices: z.boolean(),
  sync_inventory: z.boolean(),
  products_minutes: z.string().regex(/^\d+$/, "عدد دقائق صحيح."),
  prices_minutes: z.string().regex(/^\d+$/, "عدد دقائق صحيح."),
  inventory_minutes: z.string().regex(/^\d+$/, "عدد دقائق صحيح."),
  stock_buffer: z.string().regex(/^\d+$/, "عدد صحيح غير سالب."),
  hide_when_out_of_stock: z.boolean(),
  forward_enabled: z.boolean(),
  forward_cod: z.boolean(),
  default_country_code: z.string().regex(/^([A-Za-z]{2})?$/, "رمز دولة من حرفين لاتينيين (مثل YE أو SA)."),
  shipping_method: z.string().max(100, "100 حرف كحد أقصى."),
});
export type SettingsForm = z.infer<typeof settingsFormSchema>;

export const ruleSchema = z.object({
  id: z.number(),
  name: z.string(),
  scope_type: z.enum(["all", "supplier", "category"]),
  scope_value: z.string(),
  markup_percent: z.string(),
  rounding: z.enum(ROUNDINGS),
  fx_source: z.enum(["fixed", "daily"]),
  fx_rate: z.string(),
  priority: z.number(),
  is_active: z.boolean(),
  // INT-039 — Django's pricing engine terms (`PricingRule`): added before the markup, after it, and the margin floor.
  fixed_add: z.string().optional(),
  shipping_estimate: z.string().optional(),
  min_margin_percent: z.string().optional(),
});
export type PricingRule = z.infer<typeof ruleSchema>;
const optionalMoney = z.string().regex(/^(\d{1,6}(\.\d{1,2})?)?$/, "رقم حتى خانتين.");

export const ruleFormSchema = z
  .object({
    name: z.string().trim().min(1, "اسم القاعدة مطلوب."),
    scope_type: z.enum(["all", "supplier", "category"]),
    scope_value: z.string(),
    markup_percent: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/, "نسبة الهامش رقم حتى خانتين."),
    rounding: z.enum(ROUNDINGS),
    fx_source: z.enum(["fixed", "daily"]),
    fx_rate: z.string(),
    priority: z.string().regex(/^[1-9]\d*$/, "عدد صحيح موجب."),
    is_active: z.boolean(),
    fixed_add: optionalMoney,
    shipping_estimate: optionalMoney,
    min_margin_percent: z.string().regex(/^(\d{1,3}(\.\d{1,2})?)?$/, "نسبة حتى خانتين."),
  })
  .superRefine((v, ctx) => {
    if (v.scope_type !== "all" && !v.scope_value) ctx.addIssue({ code: "custom", path: ["scope_value"], message: v.scope_type === "supplier" ? "اختر المورد." : "اختر الفئة." });
    if (v.fx_source === "fixed" && !(/^\d+(\.\d{1,4})?$/.test(v.fx_rate) && Number(v.fx_rate) > 0)) ctx.addIssue({ code: "custom", path: ["fx_rate"], message: "سعر صرف موجب حتى 4 خانات." });
  });
export type RuleForm = z.infer<typeof ruleFormSchema>;

export const simulationSchema = z.object({
  sample: z.array(z.object({ product: z.object({ id: z.number(), name: z.string(), supplier_code: z.enum(SUPPLIER_CODES) }), display_cost: z.string(), display_current: z.string(), display_after: z.string(), below_cost: z.boolean() })),
  affected_count: z.number(),
  below_cost_count: z.number(),
  overlaps: z.array(z.object({ id: z.number(), name: z.string(), priority: z.number() })),
});
export type Simulation = z.infer<typeof simulationSchema>;

export const catalogItemSchema = z.object({
  /** A row id; a live-search hit not stored yet (CJ) is `ext:<pid>` (INT-039). */
  id: z.union([z.number(), z.string()]),
  name: z.string(),
  image: z.string().nullable(),
  category: z.string(),
  display_cost: z.string(),
  display_suggested_price: z.string(),
  variants_count: z.number(),
  import_status: z.enum(IMPORT_STATUSES),
  import_error: z.string().nullable(),
  product_id: z.number().nullable(),
});
export type CatalogItem = z.infer<typeof catalogItemSchema>;
export const catalogListSchema = page(catalogItemSchema);

export const jobSchema = z.object({
  id: z.number(),
  supplier_code: z.enum(JOB_SUPPLIER_CODES),
  job_type: z.enum(JOB_TYPES),
  status: z.enum(JOB_STATUSES),
  created_at: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  duration_seconds: z.number().nullable(),
  processed: z.number(),
  errors_count: z.number(),
  errors_csv_url: z.string().nullable(),
  last_error: z.string().nullable(),
  feed_id: z.number().nullable(),
});
export type SyncJob = z.infer<typeof jobSchema>;
export const jobListSchema = page(jobSchema);
export const jobRefSchema = z.object({ job_id: z.number() });

export const FEED_STATUSES = ["draft", "mapped", "approved", "running", "completed", "completed_with_errors", "failed"] as const;
export const FEED_STATUS_LABELS: Record<(typeof FEED_STATUSES)[number], string> = {
  draft: "مسودة",
  mapped: "مربوط",
  approved: "معتمد",
  running: "قيد المعالجة",
  completed: "اكتمل",
  completed_with_errors: "اكتمل بأخطاء",
  failed: "فشل",
};
export const feedSchema = z.object({
  id: z.number(),
  name: z.string(),
  source_kind: z.enum(["file", "url"]),
  filename: z.string().nullable(),
  url: z.string().nullable(),
  sheet_name: z.string().nullable(),
  columns: z.array(z.string()),
  mapping: z.record(z.string(), z.string()),
  missing_required: z.array(z.string()),
  status: z.enum(FEED_STATUSES),
  schedule_interval: z.number().nullable(),
  last_job: jobSchema.nullable(),
  created_at: z.string(),
});
export type Feed = z.infer<typeof feedSchema>;
export const previewSchema = z.object({
  rows: z.array(z.object({ row: z.number(), values: z.record(z.string(), z.string()), errors: z.array(z.string()) })),
  errors_count: z.number(),
  total_rows: z.number(),
  fields: z.array(z.string()),
});
export type FeedPreview = z.infer<typeof previewSchema>;
export const metaSchema = z.object({ feed_fields: z.array(z.object({ key: z.string(), required: z.boolean() })), feed_extensions: z.array(z.string()) });

export const supplierOrderSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  order_number: z.string(),
  supplier_code: z.enum(SUPPLIER_CODES),
  status: z.enum(SUPPLIER_ORDER_STATUSES),
  supplier_reference: z.string().nullable(),
  tracking_number: z.string().nullable(),
  display_cost: z.string(),
  last_error: z.string().nullable(),
  can_resubmit: z.boolean(),
  updated_at: z.string(),
});
export type SupplierOrder = z.infer<typeof supplierOrderSchema>;
export const supplierOrderListSchema = page(supplierOrderSchema);

/** FR-29.07: local check against `FEED_EXTENSIONS`; the server checks again. */
export function feedExtensionOk(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return (FEED_EXTENSIONS as readonly string[]).includes(ext);
}
