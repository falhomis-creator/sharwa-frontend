import { z } from "zod";

/** M27 channel settings contract (§7, `[NEEDS BACKEND]`). */
export const CONNECTIONS = ["meta", "tiktok", "telegram"] as const;
export type ConnectionCode = (typeof CONNECTIONS)[number];
export const CONNECTION_LABELS: Record<ConnectionCode, string> = { meta: "Meta (فيسبوك وإنستغرام)", tiktok: "TikTok Shop", telegram: "تيليجرام" };
export const CONNECTION_SHORT: Record<ConnectionCode, string> = { meta: "Meta", tiktok: "TikTok", telegram: "تيليجرام" };

export const channelSchema = z.object({
  channel_code: z.enum(CONNECTIONS),
  connected: z.boolean(),
  account_name: z.string().nullable(),
  bot_username: z.string().nullable().optional(),
  error: z.string().nullable(),
  connected_at: z.string().nullable(),
  open_conversations: z.number().int().default(0),
});
export type Channel = z.infer<typeof channelSchema>;
export const channelListSchema = z.array(channelSchema);

export const telegramConnectSchema = z.object({
  bot_token: z
    .string()
    .trim()
    .regex(/^\d{6,12}:[A-Za-z0-9_-]{30,}$/, "رمز البوت غير صحيح — انسخه كما يعطيه ‎@BotFather."),
});
export const telegramResultSchema = z.object({ bot_username: z.string() });

export const MATCH_TYPES = ["contains", "exact"] as const;
export const MATCH_LABELS: Record<(typeof MATCH_TYPES)[number], string> = { contains: "يحتوي", exact: "مطابق" };
export const REPLY_TYPES = ["text", "product_card", "catalog_link"] as const;
export const REPLY_LABELS: Record<(typeof REPLY_TYPES)[number], string> = { text: "نص", product_card: "بطاقة منتج", catalog_link: "رابط الكتالوج" };

export const keywordSchema = z.object({
  id: z.number().int(),
  keyword: z.string(),
  match_type: z.enum(MATCH_TYPES),
  reply_type: z.enum(REPLY_TYPES),
  reply_text: z.string(),
  product_id: z.number().int().nullable(),
  product_name: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
});
export type Keyword = z.infer<typeof keywordSchema>;
export const keywordListSchema = z.array(keywordSchema);

export const keywordFormSchema = z
  .object({
    keyword: z.string().trim().min(1, "أدخل الكلمة المفتاحية.").max(60, "60 حرفاً كحد أقصى."),
    match_type: z.enum(MATCH_TYPES),
    reply_type: z.enum(REPLY_TYPES),
    reply_text: z.string().trim().max(1000),
    product_id: z.number().int().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.reply_type === "text" && !v.reply_text) ctx.addIssue({ code: "custom", path: ["reply_text"], message: "اكتب نص الردّ." });
    if (v.reply_type === "product_card" && !v.product_id) ctx.addIssue({ code: "custom", path: ["product_id"], message: "اختر المنتج." });
  });
export type KeywordForm = z.infer<typeof keywordFormSchema>;

export const templateSchema = z.object({ id: z.number().int(), title: z.string(), body: z.string(), updated_at: z.string() });
export type ReplyTemplate = z.infer<typeof templateSchema>;
export const templateListSchema = z.array(templateSchema);
export const templateFormSchema = z.object({
  title: z.string().trim().min(1, "أدخل عنوان القالب.").max(60, "60 حرفاً كحد أقصى."),
  body: z.string().trim().min(1, "اكتب نص القالب.").max(1000, "1000 حرف كحد أقصى."),
});
export type TemplateForm = z.infer<typeof templateFormSchema>;

export const SYNC_STATUSES = ["pending", "synced", "error", "hidden_out_of_stock"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];
export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = { pending: "بانتظار المزامنة", synced: "متزامن", error: "خطأ", hidden_out_of_stock: "مخفي — نفد المخزون" };
export const SYNC_STATUS_TONE: Record<SyncStatus, "warning" | "success" | "destructive" | "muted"> = { pending: "warning", synced: "success", error: "destructive", hidden_out_of_stock: "muted" };

export const catalogSyncSchema = z.object({
  channel_code: z.enum(["meta", "tiktok"]),
  scope: z.enum(["all", "selected_categories"]),
  category_ids: z.array(z.number().int()),
  price_adjustment_percent: z.string(),
  stock_shield_enabled: z.boolean(),
  last_run_at: z.string().nullable(),
  included_products_count: z.number().int(),
  report: z.record(z.enum(SYNC_STATUSES), z.number().int()).nullable(),
  categories: z.array(z.object({ id: z.number().int(), name: z.string() })),
});
export type CatalogSync = z.infer<typeof catalogSyncSchema>;

export const syncProductSchema = z.object({
  product_id: z.number().int(),
  name: z.string(),
  sku: z.string(),
  sync_status: z.enum(SYNC_STATUSES),
  error: z.string().nullable(),
  synced_at: z.string().nullable(),
});
export type SyncProduct = z.infer<typeof syncProductSchema>;
export const syncProductListSchema = z.object({ count: z.number().int(), next: z.string().nullable().optional(), previous: z.string().nullable().optional(), results: z.array(syncProductSchema) });

export const tiktokCategorySchema = z.object({ id: z.string(), name: z.string() });
export const tiktokCategoryListSchema = z.array(tiktokCategorySchema);
export const mappingRowSchema = z.object({ category_id: z.number().int(), category_name: z.string(), external_category_id: z.string().nullable() });
export type MappingRow = z.infer<typeof mappingRowSchema>;
export const mappingListSchema = z.array(mappingRowSchema);

export const accessRowSchema = z.object({ staff_id: z.number().int(), channel_code: z.enum(CONNECTIONS), can_view: z.boolean(), can_reply: z.boolean() });
export type AccessRow = z.infer<typeof accessRowSchema>;
export const accessSchema = z.object({ staff: z.array(z.object({ id: z.number().int(), name: z.string() })), rows: z.array(accessRowSchema) });
export type StaffAccess = z.infer<typeof accessSchema>;
