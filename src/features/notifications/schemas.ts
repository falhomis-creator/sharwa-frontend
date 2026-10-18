import { z } from "zod";
import { paginated } from "@/lib/schemas/pagination";

/**
 * M49 contracts (data-model §1 «Notification», M49 §5/§7 — every row `[NEEDS BACKEND]`).
 * `kind` stays an open string on the wire: a kind the backend adds later must render with
 * the generic icon and label «إشعار», never fail validation (M49 §10).
 */
export const NOTIFICATION_KINDS = [
  "order_new",
  "payment_review",
  "approval_pending",
  "behavior_alert",
  "inbox_unread",
  "low_stock",
  "sync_failed",
  "awb_failed",
  "export_ready",
  "billing_notice",
  "provisioning_notice",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  order_new: "طلب جديد",
  payment_review: "دفع يحتاج مراجعة",
  approval_pending: "طلب موافقة",
  behavior_alert: "تنبيه سلوكي",
  inbox_unread: "محادثة غير مقروءة",
  low_stock: "مخزون منخفض",
  sync_failed: "فشل مزامنة",
  awb_failed: "فشل إصدار بوليصة",
  export_ready: "تصدير",
  billing_notice: "نظام",
  provisioning_notice: "نظام",
};

/** Filter chips of the panel (US-49.2): label → kinds. The URL carries `?kind=<codes>`. */
export const NOTIFICATION_FILTERS = [
  { key: "order_new", label: "طلبات", kinds: ["order_new"] },
  { key: "payment_review", label: "دفع", kinds: ["payment_review"] },
  { key: "approval_pending", label: "موافقات", kinds: ["approval_pending"] },
  { key: "low_stock", label: "مخزون", kinds: ["low_stock"] },
  { key: "inbox_unread", label: "محادثات", kinds: ["inbox_unread"] },
  { key: "sync_failed", label: "مزامنة", kinds: ["sync_failed"] },
  {
    key: "system",
    label: "نظام",
    kinds: ["billing_notice", "provisioning_notice", "export_ready", "awb_failed", "behavior_alert"],
  },
] as const;

export const severitySchema = z.enum(["info", "warning", "critical"]);

export const notificationSchema = z.object({
  id: z.number().int(),
  kind: z.string(),
  severity: severitySchema,
  title: z.string(),
  body: z.string(),
  /** Relative path inside `(dashboard)`; anything else is dropped (FR-49.04). */
  link: z.string(),
  group_key: z.string(),
  count: z.number().int(),
  created_at: z.string(),
  read_at: z.string().nullable(),
  source_ref: z.object({ type: z.string(), id: z.union([z.number(), z.string()]) }).nullable(),
});
export type Notification = z.infer<typeof notificationSchema>;

export const notificationListSchema = paginated(notificationSchema);

export const notificationSummarySchema = z.object({
  unread_total: z.number().int(),
  by_kind: z.record(z.string(), z.number().int()),
  has_critical: z.boolean(),
});
export type NotificationSummary = z.infer<typeof notificationSummarySchema>;

export const readResponseSchema = z.object({ read_at: z.string() });
export const readAllResponseSchema = z.object({ updated: z.number().int() });

/** FR-49.04: only same-app dashboard paths are followed. */
export function safeDashboardLink(link: string): string | null {
  return /^\/dashboard(\/|$|\?)/.test(link) && !link.startsWith("//") ? link : null;
}
