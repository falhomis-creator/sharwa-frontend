import { z } from "zod";
import { displayMoney } from "@/lib/schemas/money";
import { provisioningStatusSchema } from "@/lib/schemas/provisioning";

/**
 * M03 data contracts. Every row is `[NEEDS BACKEND]` (contracts/needs-backend-inventory.md
 * §M03 — 12 of 12), so these are the PROPOSED shapes of `/api/v1/auth/me/`,
 * `/api/v1/dashboard/overview/`, `/api/v1/dashboard/counters/` and `/api/v1/account/stores/`.
 * They are served today by `/api/bff/*` from `src/mocks/dashboard/*`; when Django ships the
 * real endpoints only the handler bodies change.
 *
 * Feature and permission keys stay `z.string()` here and are narrowed by
 * `src/lib/access.ts` at the call site — a key the backend adds must not fail validation.
 */

export const staffContextSchema = z.object({
  full_name: z.string(),
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  locations: z.array(z.object({ id: z.number().int(), name: z.string() })).default([]),
  max_discount_percent: z.string().nullable().optional(),
});
export type StaffContext = z.infer<typeof staffContextSchema>;

export const behaviorLevelSchema = z.enum(["none", "warning", "critical"]);

export const sessionSchema = z.object({
  kind: z.enum(["merchant", "staff"]),
  store_name: z.string(),
  store_host: z.string(),
  staff: staffContextSchema.optional(),
  features: z.array(z.string()).default([]),
  behavior: z
    .object({ export: behaviorLevelSchema.default("none"), view: behaviorLevelSchema.default("none") })
    .optional(),
  /** Injected server-side; never persisted in the browser (M47 FR-47.06). */
  csrf_token: z.string().optional(),
});
export type Session = z.infer<typeof sessionSchema>;

/** Order axes — owned by M06 (data-model §4), needed here for the "new orders" block. */
export const ORDER_STATUSES = [
  "pending_payment",
  "new",
  "awaiting_payment",
  "payment_review",
  "completed",
  "cancelled",
  "refunded",
] as const;
export const PAYMENT_STATUSES = ["unpaid", "pending", "partial", "paid", "failed", "indeterminate"] as const;
export const SALES_CHANNELS = ["online", "pos", "b2b_draft", "phone"] as const;

export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);

export const fulfillmentStatusSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  /** Merchant-defined hex from `OrderStatus.color`; rendered as a 6px dot only. */
  color: z.string(),
});

export const overviewOrderRowSchema = z.object({
  id: z.number().int(),
  customer_name: z.string(),
  customer_phone: z.string(),
  display_total: displayMoney,
  status: orderStatusSchema,
  payment_status: paymentStatusSchema,
  fulfillment_status: fulfillmentStatusSchema.nullable(),
  sales_channel: z.enum(SALES_CHANNELS),
  created_at: z.string(),
});
export type OverviewOrderRow = z.infer<typeof overviewOrderRowSchema>;

export const todayMetricsSchema = z.object({
  orders_count: z.number().int(),
  completed_orders_count: z.number().int(),
  cancelled_orders_count: z.number().int(),
  refunded_orders_count: z.number().int(),
  display_gross_revenue: displayMoney,
  display_net_revenue: displayMoney,
  /** `null` before the nightly aggregation has ever run (M03 §8). */
  refreshed_at: z.string().nullable(),
});
export type TodayMetrics = z.infer<typeof todayMetricsSchema>;

export const attentionSchema = z.object({
  pending_approvals: z.number().int(),
  unread_behavior_alerts: z.object({ warning: z.number().int(), critical: z.number().int() }),
  low_stock_products: z.number().int(),
  unread_conversations: z.number().int(),
});

export const topProductSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  image: z.string().nullable(),
  qty: z.number().int(),
  display_revenue: displayMoney,
});

/** The nine `TrafficSource` keys, in the order they are listed (M03 US-03.5.1). */
export const TRAFFIC_SOURCES = [
  "tiktok",
  "whatsapp",
  "instagram",
  "snapchat",
  "facebook",
  "telegram",
  "amazon",
  "noon",
  "direct",
] as const;
export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

export const TRAFFIC_SOURCE_LABELS: Record<TrafficSource, string> = {
  tiktok: "تيك توك",
  whatsapp: "واتساب",
  instagram: "إنستغرام",
  snapchat: "سناب شات",
  facebook: "فيسبوك",
  telegram: "تلغرام",
  amazon: "أمازون",
  noon: "نون",
  direct: "زيارة مباشرة",
};

export const overviewSchema = z.object({
  today: todayMetricsSchema,
  new_orders: z.array(overviewOrderRowSchema),
  attention: attentionSchema,
  top_products: z.array(topProductSchema),
  traffic_sources: z.record(z.string(), z.number().int()),
});
export type Overview = z.infer<typeof overviewSchema>;

export const countersSchema = z.object({
  new_orders: z.number().int(),
  unread_conversations: z.number().int(),
  pending_approvals: z.number().int(),
  unread_behavior_alerts: z.number().int(),
});
export type Counters = z.infer<typeof countersSchema>;

export const accountStoreSchema = z.object({
  name: z.string(),
  host: z.string(),
  is_current: z.boolean(),
  provisioning_status: provisioningStatusSchema.shape.status,
});
export type AccountStore = z.infer<typeof accountStoreSchema>;

export const accountStoresSchema = z.array(accountStoreSchema);
