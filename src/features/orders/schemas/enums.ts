/**
 * Order enums — VERBATIM from discovery 02 §3 (data-model §4 «Order — محوران للحالة»).
 * Labels for `Order.STATUS` and `Fulfillment.STATUS` are the model's own Arabic labels.
 */
export const ORDER_STATUSES = [
  "pending_payment",
  "new",
  "awaiting_payment",
  "payment_review",
  "completed",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "قيد تنفيذ الدفع",
  new: "جديد",
  awaiting_payment: "بانتظار تأكيد الدفع",
  payment_review: "يتطلب مراجعة دفع",
  completed: "مكتمل",
  cancelled: "ملغي",
  refunded: "مسترد",
};
/** Semantic tone of the financial status TEXT (no fills — constitution I-ب). */
export const ORDER_STATUS_TONE: Record<OrderStatus, "default" | "muted" | "success" | "warning" | "destructive" | "info"> = {
  pending_payment: "muted",
  new: "info",
  awaiting_payment: "warning",
  payment_review: "warning",
  completed: "success",
  cancelled: "destructive",
  refunded: "muted",
};

export const PAYMENT_STATUSES = ["unpaid", "pending", "partial", "paid", "failed", "indeterminate"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "غير مدفوع",
  pending: "معلّق",
  partial: "مدفوع جزئياً",
  paid: "مدفوع",
  failed: "فشل الدفع",
  indeterminate: "غير محدد",
};

export const SALES_CHANNELS = ["online", "pos", "b2b_draft", "phone"] as const;
export type SalesChannel = (typeof SALES_CHANNELS)[number];
export const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
  online: "المتجر",
  pos: "نقطة بيع",
  b2b_draft: "مسودة جملة",
  phone: "هاتفي",
};

export const TRAFFIC_SOURCES = ["tiktok", "whatsapp", "instagram", "snapchat", "facebook", "telegram", "amazon", "noon", "direct"] as const;
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

export const FULFILLMENT_STATES = [
  "pending",
  "preparing",
  "ready_for_pickup",
  "shipped",
  "delivered",
  "forwarded_to_supplier",
  "cancelled",
] as const;
export type FulfillmentState = (typeof FULFILLMENT_STATES)[number];
export const FULFILLMENT_STATE_LABELS: Record<FulfillmentState, string> = {
  pending: "بانتظار التجهيز",
  preparing: "قيد التجهيز",
  ready_for_pickup: "جاهز للاستلام",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  forwarded_to_supplier: "حُوِّل إلى المورد",
  cancelled: "ملغي",
};

export const PAYMENT_INTENT_METHODS = ["wallet", "gateway", "cod", "gift_card"] as const;
export const PAYMENT_INTENT_METHOD_LABELS: Record<(typeof PAYMENT_INTENT_METHODS)[number], string> = {
  wallet: "المحفظة",
  gateway: "بوابة دفع",
  cod: "الدفع عند الاستلام",
  gift_card: "بطاقة هدية",
};
export const PAYMENT_INTENT_STATUSES = ["pending", "completed", "failed", "refunded"] as const;
export const PAYMENT_INTENT_STATUS_LABELS: Record<(typeof PAYMENT_INTENT_STATUSES)[number], string> = {
  pending: "معلّق",
  completed: "مكتمل",
  failed: "فشل",
  refunded: "مسترد",
};

export const REFUND_METHODS = ["wallet", "sharwa_pay", "manual", "wallet_credit"] as const;
export type RefundMethod = (typeof REFUND_METHODS)[number];
export const REFUND_METHOD_LABELS: Record<RefundMethod, string> = {
  wallet: "إلى محفظة العميل",
  sharwa_pay: "شروة باي",
  manual: "يدوي (نقداً/تحويل)",
  wallet_credit: "رصيد محفظة",
};

export const TIMELINE_SOURCES = ["webhook", "agent_app", "merchant_manual", "system"] as const;
export type TimelineSource = (typeof TIMELINE_SOURCES)[number];
export const TIMELINE_SOURCE_LABELS: Record<TimelineSource, string> = {
  webhook: "شركة الشحن",
  agent_app: "تطبيق المندوب",
  merchant_manual: "يدوي",
  system: "النظام",
};

/** Default `OrderStatus` seed (discovery 02 §3). Hex is data. */
export const DEFAULT_FULFILLMENT_STATUSES = [
  { name: "قيد الانتظار", color: "#f59e0b", is_default: true, releases_stock: false, marks_completed: false },
  { name: "قيد التجهيز", color: "#3b82f6", is_default: false, releases_stock: false, marks_completed: false },
  { name: "قيد التوصيل", color: "#8b5cf6", is_default: false, releases_stock: false, marks_completed: false },
  { name: "مكتمل", color: "#16a34a", is_default: false, releases_stock: false, marks_completed: true },
  { name: "ملغي", color: "#dc2626", is_default: false, releases_stock: true, marks_completed: false },
] as const;

/**
 * Legal transitions of the FINANCIAL axis (discovery 02 §3 + M06 §5 «قواعد»): `refunded` is
 * reached only through the refund flow; `cancelled → new|completed` deducts stock again.
 * The server is the authority; this copy only decides which options render disabled
 * (FR-06.07 «تُعطَّل مع تلميح، لا تُخفى»).
 */
export const FINANCIAL_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["new", "cancelled"],
  new: ["completed", "cancelled", "awaiting_payment"],
  awaiting_payment: ["new", "payment_review", "cancelled"],
  payment_review: ["new", "cancelled"],
  completed: ["cancelled"],
  cancelled: ["new", "completed"],
  refunded: [],
};

/** Statuses that end the workflow: no fulfilment change is offered after them. */
export const CLOSED_STATUSES: readonly OrderStatus[] = ["refunded"];
