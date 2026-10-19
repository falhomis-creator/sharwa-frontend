import { z } from "zod";
import { currencyEnum, listOf } from "@/features/platform-admin/schemas/common";

/**
 * M46 apps + overrides, M20 market categories, Sharwa Ship zones and pending webhook
 * events (US-20.6/20.7).
 */
export const APP_INTERVALS = ["monthly", "yearly"] as const;
export const APP_INTERVAL_LABELS: Record<(typeof APP_INTERVALS)[number], string> = { monthly: "شهري", yearly: "سنوي" };

export const appSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  is_listed: z.boolean(),
  is_free: z.boolean(),
  price: z.string(),
  display_price: z.string(),
  currency: currencyEnum,
  billing_interval: z.enum(APP_INTERVALS),
  billing_enabled: z.boolean(),
  installations: z.number().int(),
});
export type App = z.infer<typeof appSchema>;
export const appListSchema = z.array(appSchema);

export const appInputSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9_]{2,40}$/, "حروف لاتينية صغيرة وأرقام و_ (2–40)."),
  name: z.string().trim().min(1, "أدخل اسم التطبيق.").max(80),
  description: z.string().max(500),
  icon: z.string().max(40),
  is_listed: z.boolean(),
  is_free: z.boolean(),
  price: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "أدخل سعراً صحيحاً."),
  currency: currencyEnum,
  billing_interval: z.enum(APP_INTERVALS),
  billing_enabled: z.boolean(),
});
export type AppInput = z.infer<typeof appInputSchema>;

export const appOverrideSchema = z.object({
  id: z.number().int(),
  app_code: z.string(),
  app_name: z.string(),
  schema_name: z.string(),
  store_name: z.string(),
  is_billed: z.boolean(),
  notes: z.string(),
});
export type AppOverride = z.infer<typeof appOverrideSchema>;
export const appOverrideListSchema = z.array(appOverrideSchema);

export const marketCategorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  display_order: z.number().int(),
  is_active: z.boolean(),
  stores_count: z.number().int(),
});
export type MarketCategory = z.infer<typeof marketCategorySchema>;
export const marketCategoryListSchema = z.array(marketCategorySchema);

export const zoneSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  name: z.string(),
  price: z.string(),
  display_price: z.string(),
  currency: currencyEnum,
  volumetric_divisor: z.number().int(),
  center_latitude: z.string(),
  center_longitude: z.string(),
  radius_km: z.string(),
  is_active: z.boolean(),
  sort_order: z.number().int(),
});
export type Zone = z.infer<typeof zoneSchema>;
export const zoneListSchema = z.array(zoneSchema);

export const zoneInputSchema = z.object({
  code: z.string().trim().regex(/^[A-Z]{3}-\d{2}$/, "مثل SAN-01."),
  name: z.string().trim().min(1, "أدخل اسم المنطقة.").max(80),
  price: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "أدخل سعراً صحيحاً."),
  currency: currencyEnum,
  volumetric_divisor: z.coerce.number().int().min(1000).max(10000),
  center_latitude: z.string().trim().regex(/^-?\d{1,2}(\.\d{1,6})?$/, "خط عرض صحيح."),
  center_longitude: z.string().trim().regex(/^-?\d{1,3}(\.\d{1,6})?$/, "خط طول صحيح."),
  radius_km: z.string().trim().regex(/^\d{1,3}(\.\d{1,2})?$/, "نصف قطر صحيح بالكيلومتر."),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0),
});
export type ZoneInput = z.infer<typeof zoneInputSchema>;

export const WEBHOOK_EVENT_STATUSES = ["pending", "resolved", "discarded"] as const;
export type WebhookEventStatus = (typeof WEBHOOK_EVENT_STATUSES)[number];
export const WEBHOOK_EVENT_LABELS: Record<WebhookEventStatus, string> = { pending: "معلّق", resolved: "عولج", discarded: "مُتجاهَل" };

export const webhookEventSchema = z.object({
  id: z.number().int(),
  source: z.string(),
  event_type: z.string(),
  schema_name: z.string().nullable(),
  store_name: z.string().nullable(),
  /** The store was deleted since — only «تجاهل» applies (M20 §8). */
  store_missing: z.boolean(),
  status: z.enum(WEBHOOK_EVENT_STATUSES),
  reason: z.string(),
  payload: z.string(),
  attempts: z.number().int(),
  received_at: z.string(),
  resolved_at: z.string().nullable(),
});
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
export const webhookEventListSchema = listOf(webhookEventSchema);
