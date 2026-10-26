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
  /** Optional geo bounds (INT-031): Django allows a zone with no circle — all three or none. */
  center_latitude: z.string().nullable(),
  center_longitude: z.string().nullable(),
  radius_km: z.string().nullable(),
  is_active: z.boolean(),
  sort_order: z.number().int(),
});
export type Zone = z.infer<typeof zoneSchema>;
export const zoneListSchema = z.array(zoneSchema);

const zoneFieldsSchema = z.object({
  name: z.string().trim().min(1, "أدخل اسم المنطقة.").max(80),
  price: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "أدخل سعراً صحيحاً."),
  currency: currencyEnum,
  volumetric_divisor: z.coerce.number().int().min(1000).max(10000),
  // Django stores 7 decimals; empty = no geo bound (the trio is all-or-none, checked below).
  center_latitude: z.string().trim().regex(/^(-?\d{1,2}(\.\d{1,7})?)?$/, "خط عرض صحيح."),
  center_longitude: z.string().trim().regex(/^(-?\d{1,3}(\.\d{1,7})?)?$/, "خط طول صحيح."),
  radius_km: z.string().trim().regex(/^(\d{1,3}(\.\d{1,2})?)?$/, "نصف قطر صحيح بالكيلومتر."),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0),
});

const GEO_KEYS = ["center_latitude", "center_longitude", "radius_km"] as const;
const GEO_TRIO = "حدود المنطقة ثلاثية: المركز ونصف القطر معاً أو لا شيء.";

function geoTrio(v: Pick<z.infer<typeof zoneFieldsSchema>, (typeof GEO_KEYS)[number]>, ctx: z.RefinementCtx) {
  const filled = GEO_KEYS.filter((k) => v[k] !== "");
  if (filled.length === 0 || filled.length === GEO_KEYS.length) return;
  for (const k of GEO_KEYS) if (v[k] === "") ctx.addIssue({ code: "custom", path: [k], message: GEO_TRIO });
}

/** New zone — the code is set once (`SAN-01`) and never changes: issued waybills reference it. */
export const zoneInputSchema = zoneFieldsSchema.extend({ code: z.string().trim().regex(/^[A-Z]{3}-\d{2}$/, "مثل SAN-01.") }).superRefine(geoTrio);
export type ZoneInput = z.infer<typeof zoneInputSchema>;
/** Existing zone (PATCH) — no `code`: Django refuses a change, legacy slugs (`sanaa_inner_city`) stay. */
export const zoneUpdateSchema = zoneFieldsSchema.superRefine(geoTrio);
export type ZoneUpdate = z.infer<typeof zoneUpdateSchema>;

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
