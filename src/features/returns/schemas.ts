import { z } from "zod";
import { REFUND_METHODS, REFUND_METHOD_LABELS } from "@/features/orders/schemas";

/**
 * M24 — المرتجعات (T123). Enum VALUES verbatim from the spec §5; labels Arabic.
 * Every `/api/v1/returns/*` and `/api/v1/warehouse/returns/*` response is parsed here (§11 IX).
 */
export const RETURN_STATUSES = ["requested", "approved", "rejected", "processing", "completed"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "مطلوب",
  approved: "معتمد",
  rejected: "مرفوض",
  processing: "قيد المعالجة",
  completed: "مكتمل",
};
export const RETURN_STATUS_TONE: Record<ReturnStatus, "warning" | "info" | "destructive" | "success" | "muted"> = {
  requested: "warning",
  approved: "info",
  rejected: "destructive",
  processing: "info",
  completed: "success",
};
/** FR-24.09: no decision buttons in these. */
export const FINAL_RETURN_STATUSES: readonly ReturnStatus[] = ["rejected", "completed"];

export const RETURN_REFUND_METHODS = ["original_payment", "cash", "wallet", "store_credit"] as const;
export type ReturnRefundMethod = (typeof RETURN_REFUND_METHODS)[number];
export const RETURN_REFUND_METHOD_LABELS: Record<ReturnRefundMethod, string> = {
  original_payment: "طريقة الدفع الأصلية",
  cash: "نقداً",
  wallet: "محفظة العميل",
  store_credit: "رصيد متجر",
};

export const RMA_REASONS = ["customer_rejected", "damaged", "wrong_item", "bundle_partial_return"] as const;
export type RmaReason = (typeof RMA_REASONS)[number];
export const RMA_REASON_LABELS: Record<RmaReason, string> = {
  customer_rejected: "رفض العميل",
  damaged: "تالف",
  wrong_item: "صنف خاطئ",
  bundle_partial_return: "إرجاع جزئي لحزمة",
};

export const RMA_STATUSES = ["requested", "in_transit_back", "received_at_warehouse", "qa_pending", "restocked", "rejected_disposal", "closed"] as const;
export type RmaStatus = (typeof RMA_STATUSES)[number];
export const RMA_STATUS_LABELS: Record<RmaStatus, string> = {
  requested: "مطلوب",
  in_transit_back: "في طريق العودة",
  received_at_warehouse: "وصل المستودع",
  qa_pending: "بانتظار الفحص",
  restocked: "أُعيد للمخزون",
  rejected_disposal: "مرفوض/إعدام",
  closed: "مُغلق",
};
export const RMA_STATUS_TONE: Record<RmaStatus, "warning" | "info" | "destructive" | "success" | "muted"> = {
  requested: "muted",
  in_transit_back: "info",
  received_at_warehouse: "info",
  qa_pending: "warning",
  restocked: "success",
  rejected_disposal: "destructive",
  closed: "muted",
};
export const FINAL_RMA_STATUSES: readonly RmaStatus[] = ["rejected_disposal", "closed", "restocked"];

export const FEE_PAYERS = ["customer", "merchant", "platform"] as const;
export type FeePayer = (typeof FEE_PAYERS)[number];
export const FEE_PAYER_LABELS: Record<FeePayer, string> = { customer: "العميل", merchant: "التاجر", platform: "المنصة" };

export const QA_DECISIONS = ["restocked", "rejected_disposal"] as const;
export type QaDecision = (typeof QA_DECISIONS)[number];

/** The legacy `OrderRefund.method` — the same four values M06 uses. */
export const ORDER_REFUND_METHODS = REFUND_METHODS;
export const ORDER_REFUND_METHOD_LABELS = REFUND_METHOD_LABELS;

const locationRef = z.object({ id: z.number().int(), name: z.string() });

// ── ReturnRequest ──────────────────────────────────────────────────────────────────
export const returnListItemSchema = z.object({
  id: z.number().int(),
  order_id: z.number().int(),
  customer_name: z.string(),
  customer_phone: z.string(),
  lines_count: z.number().int(),
  display_amount: z.string(),
  reason: z.string(),
  refund_method: z.enum(RETURN_REFUND_METHODS),
  status: z.enum(RETURN_STATUSES),
  location: locationRef.nullable(),
  version: z.number().int(),
  created_at: z.string(),
});
export type ReturnListItem = z.infer<typeof returnListItemSchema>;

export const returnListSchema = z.object({
  count: z.number().int(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(returnListItemSchema),
});
export type ReturnList = z.infer<typeof returnListSchema>;

export const returnLineSchema = z.object({
  id: z.number().int(),
  fulfillment_item_id: z.number().int(),
  product_id: z.number().int().nullable().optional(),
  product_name: z.string(),
  sku: z.string().nullable().optional(),
  quantity_returned: z.number().int(),
  refund_amount_allocated: z.string(),
  display_refund_amount: z.string().optional(),
  restock: z.boolean(),
  product_deleted: z.boolean().optional(),
});
export type ReturnLine = z.infer<typeof returnLineSchema>;

export const returnTimelineEventSchema = z.object({ id: z.number().int(), at: z.string(), text: z.string(), actor: z.string().nullable() });
export type ReturnTimelineEvent = z.infer<typeof returnTimelineEventSchema>;

export const returnDetailSchema = returnListItemSchema.extend({
  decision_note: z.string().nullable(),
  updated_at: z.string(),
  line_items: z.array(returnLineSchema),
  timeline: z.array(returnTimelineEventSchema).default([]),
});
export type ReturnDetail = z.infer<typeof returnDetailSchema>;

export const returnableItemSchema = z.object({
  fulfillment_item_id: z.number().int(),
  product_name: z.string(),
  quantity: z.number(),
  remaining: z.number(),
  unit_refund_amount: z.string(),
  location_name: z.string().nullable(),
  sku: z.string().nullable().optional(),
  product_deleted: z.boolean().optional(),
  display_unit_refund_amount: z.string().optional(),
});
export type ReturnableItem = z.infer<typeof returnableItemSchema>;
export const returnableItemsSchema = z.array(returnableItemSchema);

/** The create form (FR-24.02). Quantities are validated against `remaining` in the screen. */
export const newReturnSchema = z.object({
  reason: z.string().trim().min(3, "اكتب سبب الإرجاع.").max(255, "السبب أطول من 255 حرفاً."),
  refund_method: z.enum(RETURN_REFUND_METHODS, { message: "اختر طريقة الاسترجاع." }),
  lines: z.array(
    z.object({
      fulfillment_item_id: z.number().int(),
      selected: z.boolean(),
      quantity: z.string(),
      restock: z.boolean(),
    }),
  ),
});
export type NewReturnInput = z.infer<typeof newReturnSchema>;

// ── RMA ────────────────────────────────────────────────────────────────────────────
export const rmaEventSchema = z.object({ to_status: z.enum(RMA_STATUSES), at: z.string(), actor: z.string().nullable() });
export const rmaSchema = z.object({
  id: z.number().int(),
  order_id: z.number().int(),
  fulfillment_item: z.object({ id: z.number().int(), product_id: z.number().int().nullable().optional(), product_name: z.string(), sku: z.string().nullable().optional() }),
  reason: z.enum(RMA_REASONS),
  status: z.enum(RMA_STATUSES),
  fee_payer: z.enum(FEE_PAYERS),
  destination_location: locationRef.nullable(),
  quantity: z.number().int(),
  customer_name: z.string().optional(),
  created_at: z.string().optional(),
  restock_movement_id: z.number().int().nullable().optional(),
  events: z.array(rmaEventSchema),
});
export type Rma = z.infer<typeof rmaSchema>;

export const rmaListSchema = z.object({
  count: z.number().int(),
  counts: z.record(z.string(), z.number().int()).optional(),
  results: z.array(rmaSchema),
});
export type RmaList = z.infer<typeof rmaListSchema>;

export const newRmaSchema = z.object({
  order_id: z.string().trim().regex(/^\d+$/, "أدخل رقم الطلب."),
  fulfillment_item_id: z.string().min(1, "اختر عنصر التنفيذ."),
  destination_location_id: z.string().min(1, "اختر موقع الوجهة."),
  quantity: z.string().trim().regex(/^\d*$/, "الكمية رقم صحيح."),
  reason: z.enum(RMA_REASONS, { message: "اختر السبب." }),
});
export type NewRmaInput = z.infer<typeof newRmaSchema>;

// ── Legacy OrderRefund log ────────────────────────────────────────────────────────
export const orderRefundSchema = z.object({
  id: z.number().int(),
  order_id: z.number().int(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  display_amount: z.string(),
  method: z.enum(REFUND_METHODS),
  reason: z.string(),
  loyalty_points_clawed_back: z.number().int(),
  actor: z.string().optional(),
  created_at: z.string(),
});
export type OrderRefundRow = z.infer<typeof orderRefundSchema>;
export const orderRefundListSchema = z.object({ count: z.number().int(), results: z.array(orderRefundSchema) });

export const returnOptionsSchema = z.object({ locations: z.array(locationRef) });
