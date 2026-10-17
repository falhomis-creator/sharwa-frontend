import type { Overview } from "@/features/dashboard-shell/schemas";

/**
 * Arabic labels for the order axes shown on the overview. The two axes are NEVER merged
 * into one badge (data-model §4): a row shows its financial status and its payment status
 * separately, plus the merchant-defined fulfilment status as a coloured dot.
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "بانتظار الدفع",
  new: "جديد",
  awaiting_payment: "بانتظار التحويل",
  payment_review: "مراجعة الدفع",
  completed: "مكتمل",
  cancelled: "ملغي",
  refunded: "مسترد",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "غير مدفوع",
  pending: "معلّق",
  partial: "مدفوع جزئياً",
  paid: "مدفوع",
  failed: "فشل",
  indeterminate: "غير محدد",
};

export const SALES_CHANNEL_LABELS: Record<string, string> = {
  online: "المتجر",
  pos: "نقطة بيع",
  b2b_draft: "طلب جملة",
  phone: "هاتفي",
};

/** The six numbers of the today bar, in order (FR-03.09). */
export const TODAY_FIELDS = [
  { key: "orders_count", label: "الطلبات" },
  { key: "completed_orders_count", label: "المكتملة" },
  { key: "cancelled_orders_count", label: "الملغاة" },
  { key: "refunded_orders_count", label: "المستردة" },
  { key: "display_gross_revenue", label: "الإيراد الإجمالي", money: true },
  { key: "display_net_revenue", label: "الإيراد الصافي", money: true },
] as const;

export type TodayField = (typeof TODAY_FIELDS)[number];

/** The four «يحتاج تدخلك» rows and where each one leads (FR-03.11, SC-03.4). */
export function attentionRows(attention: Overview["attention"]) {
  const alerts = attention.unread_behavior_alerts;
  return [
    { key: "approvals", label: "طلبات موافقة معلّقة", count: attention.pending_approvals, href: "/dashboard/staff/approvals" },
    {
      key: "alerts",
      label: "تنبيهات سلوكية غير مقروءة",
      count: alerts.warning + alerts.critical,
      href: "/dashboard/staff/behavior-alerts",
      critical: alerts.critical > 0,
    },
    { key: "stock", label: "منتجات منخفضة المخزون", count: attention.low_stock_products, href: "/dashboard/inventory" },
    { key: "inbox", label: "محادثات غير مقروءة", count: attention.unread_conversations, href: "/dashboard/inbox" },
  ];
}
