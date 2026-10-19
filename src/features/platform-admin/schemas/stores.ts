import { z } from "zod";
import { PROVISIONING_STATUSES, actorSchema, listOf } from "@/features/platform-admin/schemas/common";

/**
 * M20 — stores (`Client`), the overview, deactivation lifecycle and the action log.
 * `GET /api/v1/platform/overview/` · `GET /api/v1/platform/stores/?status&plan&is_active&q&page`
 * · `GET /stores/<schema>/` · `POST /stores/reprovision/` · `POST /stores/<schema>/sharwa-ship/`
 * · `GET/POST /stores/<schema>/deactivation/` (M20 §7).
 */
export const SUBSCRIPTION_STATUSES = ["active", "cancelled", "expired"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, string> = { active: "نشط", cancelled: "ملغي", expired: "منتهٍ" };

export const SHARWA_SHIP_STATES = ["inactive", "activating", "active", "deactivating"] as const;
export type SharwaShipState = (typeof SHARWA_SHIP_STATES)[number];
export const SHARWA_SHIP_LABELS: Record<SharwaShipState, string> = {
  inactive: "غير مفعّل",
  activating: "قيد التفعيل",
  active: "مفعّل",
  deactivating: "قيد الإلغاء",
};

export const DEACTIVATION_STATUSES = ["suspended", "deactivated", "closed"] as const;
export type DeactivationStatus = (typeof DEACTIVATION_STATUSES)[number];
export const DEACTIVATION_LABELS: Record<DeactivationStatus, string> = { suspended: "معلّق", deactivated: "معطّل", closed: "مغلق" };
export const DEACTIVATION_ACTIONS = ["suspend", "deactivate", "close", "reinstate"] as const;
export type DeactivationAction = (typeof DEACTIVATION_ACTIONS)[number];
export const DEACTIVATION_ACTION_LABELS: Record<DeactivationAction, string> = {
  suspend: "تعليق",
  deactivate: "تعطيل",
  close: "إغلاق",
  reinstate: "إعادة التفعيل",
};

export const storeRowSchema = z.object({
  schema_name: z.string(),
  name: z.string(),
  primary_domain: z.string(),
  merchant_phone: z.string().nullable(),
  provisioning_status: z.enum(PROVISIONING_STATUSES),
  /** `provisioning` for > 30 min — the server's flag, mirrors `retry_stalled_tenant_provisioning` (§8). */
  is_stalled: z.boolean().default(false),
  current_plan: z.object({ id: z.number().int(), code: z.string(), name: z.string() }).nullable(),
  is_active: z.boolean(),
  deactivation_status: z.enum(DEACTIVATION_STATUSES).nullable(),
  sharwa_ship: z.enum(SHARWA_SHIP_STATES),
  created_on: z.string(),
});
export type StoreRow = z.infer<typeof storeRowSchema>;
export const storeListSchema = listOf(storeRowSchema);

export const overviewSchema = z.object({
  total_stores: z.number().int(),
  display_total_sales: z.string(),
  total_orders: z.number().int(),
  failed_stores: z.number().int(),
  stalled_stores: z.number().int(),
  pending_topups: z.number().int(),
  pending_withdrawals: z.number().int(),
  pending_webhook_events: z.number().int(),
  snapshot_date: z.string().nullable(),
  recent_stores: z.array(storeRowSchema),
});
export type Overview = z.infer<typeof overviewSchema>;

export const domainRowSchema = z.object({ id: z.number().int(), domain: z.string(), is_primary: z.boolean() });

export const subscriptionRowSchema = z.object({
  id: z.number().int(),
  schema_name: z.string(),
  store_name: z.string(),
  plan: z.object({ id: z.number().int(), code: z.string(), name: z.string() }),
  status: z.enum(SUBSCRIPTION_STATUSES),
  is_current: z.boolean(),
  started_at: z.string(),
  current_period_end: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  notes: z.string(),
});
export type SubscriptionRow = z.infer<typeof subscriptionRowSchema>;

export const deactivationRecordSchema = z.object({
  id: z.number().int(),
  status: z.enum(DEACTIVATION_STATUSES),
  reason: z.string(),
  grace_period_ends_at: z.string().nullable(),
  settled_custody: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  by: z.string(),
});
export type DeactivationRecord = z.infer<typeof deactivationRecordSchema>;

/** One transition the server allows next, or a disabled one with its reason (FR-20.06). */
export const lifecycleOptionSchema = z.object({
  action: z.enum(DEACTIVATION_ACTIONS),
  allowed: z.boolean(),
  reason: z.string().nullable(),
});

export const deactivationStateSchema = z.object({
  current: deactivationRecordSchema.nullable(),
  history: z.array(deactivationRecordSchema),
  options: z.array(lifecycleOptionSchema),
});
export type DeactivationState = z.infer<typeof deactivationStateSchema>;

export const actionLogRowSchema = z.object({
  id: z.number().int(),
  at: z.string(),
  actor: actorSchema,
  action: z.string(),
  detail: z.string(),
});
export type ActionLogRow = z.infer<typeof actionLogRowSchema>;

export const installationRowSchema = z.object({
  id: z.number().int(),
  app_code: z.string(),
  app_name: z.string(),
  is_active: z.boolean(),
  suspended_by_platform: z.boolean(),
  subscription_expires_at: z.string().nullable(),
  installed_at: z.string(),
});
export type InstallationRow = z.infer<typeof installationRowSchema>;

export const storeDetailSchema = storeRowSchema.extend({
  provisioning_error: z.string().nullable(),
  provisioned_at: z.string().nullable(),
  interested_categories: z.array(z.string()),
  terms_accepted_at: z.string().nullable(),
  domains: z.array(domainRowSchema),
  subscription: subscriptionRowSchema.nullable(),
  subscription_history: z.array(subscriptionRowSchema),
  installations: z.array(installationRowSchema),
  override_count: z.number().int(),
  recent_actions: z.array(actionLogRowSchema),
});
export type StoreDetail = z.infer<typeof storeDetailSchema>;

export const reprovisionReportSchema = z.object({
  detail: z.string(),
  results: z.array(z.object({ schema_name: z.string(), queued: z.boolean(), reason: z.string().nullable() })),
});
export type ReprovisionReport = z.infer<typeof reprovisionReportSchema>;

/** `GET /api/v1/platform/clients/?q` — the picker shared by M20 ⌘K and M46 bulk tools. */
export const clientOptionSchema = z.object({
  schema_name: z.string(),
  name: z.string(),
  merchant_phone: z.string().nullable(),
  primary_domain: z.string(),
  current_plan: z.string().nullable(),
});
export type ClientOption = z.infer<typeof clientOptionSchema>;
export const clientOptionListSchema = z.array(clientOptionSchema);
