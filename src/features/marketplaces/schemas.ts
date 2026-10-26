import { z } from "zod";

/** M28 — الأسواق الإلكترونية (T157). Values verbatim from discovery; Arabic labels fixed (FR-28.06). */
export const MARKETS = ["amazon", "noon"] as const;
export type Market = (typeof MARKETS)[number];
export const MARKET_LABELS: Record<Market, string> = { amazon: "أمازون", noon: "نون" };

export const IDENTIFIER_TYPES = ["asin", "nsku", "ean", "upc", "gtin"] as const;
export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

export const SYNC_STATUSES = ["needs_identifier", "pending", "synced", "failed", "unpublished", "hidden_out_of_stock"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];
export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  needs_identifier: "يحتاج معرّفاً",
  pending: "قيد الانتظار",
  synced: "متزامن",
  failed: "فشل",
  unpublished: "غير منشور",
  hidden_out_of_stock: "مخفي لنفاد المخزون",
};
export type Tone = "warning" | "info" | "destructive" | "success" | "muted";
export const SYNC_STATUS_TONE: Record<SyncStatus, Tone> = {
  needs_identifier: "warning",
  pending: "info",
  synced: "success",
  failed: "destructive",
  unpublished: "muted",
  hidden_out_of_stock: "muted",
};

export const JOB_TYPES = ["catalog_push", "price_update", "inventory_update", "order_pull", "barcode_match", "feed_result", "shipment_confirm", "fba_inventory"] as const;
export type JobType = (typeof JOB_TYPES)[number];
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  catalog_push: "دفع الكتالوج",
  price_update: "تحديث الأسعار",
  inventory_update: "تحديث المخزون",
  order_pull: "سحب الطلبات",
  barcode_match: "مطابقة الباركود",
  feed_result: "نتيجة الملف",
  shipment_confirm: "تأكيد الشحنة",
  fba_inventory: "مخزون FBA",
};
export const JOB_STATUSES = ["queued", "running", "completed", "completed_with_errors", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  queued: "في الانتظار",
  running: "قيد التنفيذ",
  completed: "اكتملت",
  completed_with_errors: "اكتملت بأخطاء",
  failed: "فشلت",
};
export const JOB_STATUS_TONE: Record<JobStatus, Tone> = { queued: "muted", running: "info", completed: "success", completed_with_errors: "warning", failed: "destructive" };
export const isLive = (s: JobStatus) => s === "queued" || s === "running";

export const MARKET_ORDER_STATUSES = ["pending", "open", "shipped", "canceled", "unknown"] as const;
export const MARKET_ORDER_STATUS_LABELS: Record<(typeof MARKET_ORDER_STATUSES)[number], string> = {
  pending: "معلّق",
  open: "مفتوح",
  shipped: "مشحون",
  canceled: "ملغى",
  unknown: "غير معروف",
};
export const CONFIRM_LABELS = { not_required: "لا يلزم", pending: "بانتظار الشحن", confirmed: "مؤكَّدة للسوق", failed: "فشل التأكيد" } as const;
export const FULFILLMENT_LABELS = { marketplace: "ينفّذه السوق", merchant: "ينفّذه التاجر" } as const;

const page = <T extends z.ZodTypeAny>(item: T) => z.object({ count: z.number(), next: z.number().nullable().optional(), previous: z.number().nullable().optional(), results: z.array(item) });

export const lastJobSchema = z.object({ id: z.number(), job_type: z.enum(JOB_TYPES), status: z.enum(JOB_STATUSES), finished_at: z.string().nullable() });
export const marketRowSchema = z.object({
  marketplace: z.enum(MARKETS),
  connected: z.boolean(),
  needs_reauth: z.boolean(),
  account_label: z.string().nullable(),
  connected_at: z.string().nullable(),
  listings_count: z.number(),
  needs_identifier_count: z.number(),
  failed_count: z.number(),
  last_job: lastJobSchema.nullable(),
});
export type MarketRow = z.infer<typeof marketRowSchema>;

export const settingsSchema = z.object({
  currency: z.enum(["SAR", "AED"]),
  markup_percent: z.string(),
  fx_rate: z.string(),
  auto_push: z.boolean(),
  inventory_sync: z.boolean(),
  stock_buffer: z.number(),
  order_pull: z.boolean(),
  /** Django `import_marketplace_fulfilled_orders` (INT-038): FBA/FBN orders imported for reports only. */
  import_marketplace_fulfilled: z.boolean().default(true),
  default_order_status_id: z.number().nullable(),
  preview: z.object({ sample_product: z.string(), display_store_price: z.string(), display_sample_price: z.string() }),
  order_status_options: z.array(z.object({ id: z.number(), name: z.string() })),
});
export type MarketSettings = z.infer<typeof settingsSchema>;

export const settingsFormSchema = z.object({
  currency: z.enum(["SAR", "AED"]),
  markup_percent: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/, "نسبة الهامش رقم حتى خانتين عشريتين."),
  fx_rate: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "سعر الصرف رقم حتى 4 خانات.")
    .refine((v) => Number(v) > 0, "سعر الصرف أكبر من صفر."),
  auto_push: z.boolean(),
  inventory_sync: z.boolean(),
  stock_buffer: z.string().regex(/^\d+$/, "عدد صحيح غير سالب."),
  order_pull: z.boolean(),
  import_marketplace_fulfilled: z.boolean(),
  default_order_status_id: z.string(),
});
export type SettingsForm = z.infer<typeof settingsFormSchema>;

export const listingSchema = z.object({
  id: z.number(),
  marketplace: z.enum(MARKETS),
  product: z.object({ id: z.number(), name: z.string(), sku: z.string(), image: z.string().nullable(), barcode: z.string().nullable() }),
  identifier_type: z.enum(IDENTIFIER_TYPES).nullable(),
  identifier_value: z.string(),
  display_market_price: z.string(),
  display_computed_price: z.string(),
  price_override: z.string().nullable(),
  sync_status: z.enum(SYNC_STATUSES),
  last_error: z.object({ code: z.string(), message: z.string() }).nullable(),
  last_synced_at: z.string().nullable(),
});
export type Listing = z.infer<typeof listingSchema>;
export const listingListSchema = page(listingSchema);

export const jobSchema = z.object({
  id: z.number(),
  marketplace: z.enum(MARKETS),
  job_type: z.enum(JOB_TYPES),
  status: z.enum(JOB_STATUSES),
  triggered_by: z.string(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  duration_seconds: z.number().nullable(),
  total: z.number(),
  success_count: z.number(),
  error_count: z.number(),
  errors_csv_url: z.string().nullable(),
  summary: z.string().nullable(),
});
export type Job = z.infer<typeof jobSchema>;
export const jobListSchema = page(jobSchema);
export const jobRefSchema = z.object({ job_id: z.number() });

export const marketOrderSchema = z.object({
  order_id: z.number(),
  order_number: z.string(),
  marketplace: z.enum(MARKETS),
  external_order_id: z.string(),
  fulfillment: z.enum(["marketplace", "merchant"]),
  marketplace_status: z.enum(MARKET_ORDER_STATUSES),
  shipment_confirm_status: z.enum(["not_required", "pending", "confirmed", "failed"]),
  shipment_confirm_error: z.string().nullable(),
  display_total: z.string(),
  created_at: z.string(),
});
export type MarketOrder = z.infer<typeof marketOrderSchema>;
export const marketOrderListSchema = page(marketOrderSchema);
