import { z } from "zod";

/** M30 app store + M31 Sharwa AI contracts (§7, `[NEEDS BACKEND]`). */
export const WHATSAPP_APP = "whatsapp_bot";
export const AI_APP = "sharwa_ai";
/** The app's own panel, when it has one (M30 §6: WhatsApp dashboard; M31 for Sharwa AI). */
export const APP_PANELS: Record<string, string> = { [WHATSAPP_APP]: "/dashboard/apps/whatsapp", [AI_APP]: "/dashboard/apps/sharwa-ai" };

export const installationSchema = z.object({
  is_active: z.boolean(),
  suspended_by_platform: z.boolean(),
  subscription_expires_at: z.string().nullable(),
  installed_at: z.string().optional(),
});
export type Installation = z.infer<typeof installationSchema>;

export const appSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  is_free: z.boolean(),
  display_price: z.string().nullable(),
  billing_interval: z.enum(["monthly", "yearly"]),
  billing_enabled: z.boolean(),
  installation: installationSchema.nullable(),
});
export type StoreApp = z.infer<typeof appSchema>;
export const appListSchema = z.array(appSchema);

export const appDetailSchema = appSchema.extend({
  install_preview: z.object({ display_price: z.string(), interval_label: z.string(), note: z.string() }).nullable(),
  suspension_reason: z.string().nullable(),
});
export type AppDetail = z.infer<typeof appDetailSchema>;
export const installResultSchema = z.object({ installation: installationSchema.nullable() });

export const INTERVAL_LABELS = { monthly: "شهرياً", yearly: "سنوياً" } as const;

export const APP_EVENTS = ["installed", "activated", "deactivated", "subscription_renewed", "subscription_expired", "suspended_by_platform", "reactivated_by_platform"] as const;
export const APP_EVENT_LABELS: Record<(typeof APP_EVENTS)[number], string> = {
  installed: "تثبيت",
  activated: "تفعيل",
  deactivated: "تعطيل",
  subscription_renewed: "تجديد",
  subscription_expired: "انتهاء الاشتراك",
  suspended_by_platform: "تعليق من المنصة",
  reactivated_by_platform: "إعادة تفعيل من المنصة",
};
export const appEventListSchema = z.array(z.object({ event: z.enum(APP_EVENTS), created_at: z.string(), note: z.string() }));

export const CHARGE_STATUS_LABELS = { pending: "مستحقة", collected: "محصَّلة", waived: "معفاة" } as const;
export const appChargeListSchema = z.array(
  z.object({ id: z.number().int(), period_label: z.string(), display_amount: z.string(), status: z.enum(["pending", "collected", "waived"]), created_at: z.string() }),
);

// WhatsApp -----------------------------------------------------------------------------
export const USAGE_EVENTS = ["order_new", "order_shipping_update", "payment_confirmed", "abandoned_cart_reminder", "otp", "manual"] as const;
export const USAGE_EVENT_LABELS: Record<(typeof USAGE_EVENTS)[number], string> = {
  order_new: "طلب جديد",
  order_shipping_update: "تحديث شحن",
  payment_confirmed: "تأكيد دفع",
  abandoned_cart_reminder: "تذكير سلة",
  otp: "رمز تحقق",
  manual: "يدوي",
};
export const USAGE_STATUSES = ["queued", "sent", "delivered", "read", "failed", "skipped"] as const;
export const USAGE_STATUS_LABELS: Record<(typeof USAGE_STATUSES)[number], string> = { queued: "في الطابور", sent: "مُرسَلة", delivered: "تم التوصيل", read: "مقروءة", failed: "فشلت", skipped: "متجاوَزة" };
export const USAGE_STATUS_TONE = { queued: "warning", sent: "info", delivered: "success", read: "success", failed: "destructive", skipped: "muted" } as const;

export const usageRowSchema = z.object({
  id: z.number().int(),
  event_type: z.enum(USAGE_EVENTS),
  recipient_phone: z.string(),
  status: z.enum(USAGE_STATUSES),
  order_id: z.number().int().nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
});
export type UsageRow = z.infer<typeof usageRowSchema>;
export const usageListSchema = z.object({ count: z.number().int(), next: z.string().nullable().optional(), previous: z.string().nullable().optional(), results: z.array(usageRowSchema) });
export const usageSummarySchema = z.object({ last_7_days: z.number().int(), delivered: z.number().int(), failed: z.number().int(), queued: z.number().int() });

export const waTemplateSchema = z.object({
  id: z.number().int(),
  event_type: z.enum(USAGE_EVENTS),
  name: z.string(),
  body: z.string(),
  variables: z.array(z.string()),
  required: z.array(z.string()).default([]),
  preview: z.string(),
  updated_at: z.string(),
});
export type WaTemplate = z.infer<typeof waTemplateSchema>;
export const waTemplateListSchema = z.array(waTemplateSchema);
export const connectUrlSchema = z.object({ url: z.string(), connected: z.boolean() });

// Sharwa AI ----------------------------------------------------------------------------
export const aiStatusSchema = z.object({ connected: z.boolean(), connecting: z.boolean(), error: z.string().nullable(), connected_at: z.string().nullable() });
export type AiStatus = z.infer<typeof aiStatusSchema>;
export const aiSettingsSchema = z.object({ ai_enabled: z.boolean(), max_consecutive_bot_replies_override: z.number().int().nullable(), platform_default_max_replies: z.number().int() });
export type AiSettings = z.infer<typeof aiSettingsSchema>;
export const aiSettingsFormSchema = z.object({
  ai_enabled: z.boolean(),
  max_consecutive_bot_replies_override: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1), "عدد صحيح 1 أو أكثر، أو اتركه فارغاً."),
});
export type AiSettingsForm = z.infer<typeof aiSettingsFormSchema>;
export const consoleTokenSchema = z.object({ console_url: z.string().url(), token: z.string(), expires_in: z.number().int() });
