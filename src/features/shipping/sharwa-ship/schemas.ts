import { z } from "zod";
import { SHIPMENT_STATUSES, type ShipmentStatus } from "@/features/shipping/schemas";

/**
 * M39 «شروة شيب» contracts (§7 — every row `[NEEDS BACKEND]`, the proposed
 * `/api/v1/shipping/*` shapes served today by `/api/bff/shipping/*`). Money, cost and
 * weights arrive as server strings and are shown verbatim (FR-39.02/03).
 */
export const BILLING_STATUSES = ["pending", "collected", "waived"] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];
export const BILLING_LABELS: Record<BillingStatus, string> = { pending: "بانتظار التحصيل", collected: "حُصِّلت", waived: "مُعفاة" };

export const CARRIER_CODES_ALL = ["sharwa_ship", "aramex", "smsa"] as const;
export const CARRIER_LABELS: Record<(typeof CARRIER_CODES_ALL)[number], string> = { sharwa_ship: "شروة شيب", aramex: "أرامكس", smsa: "سمسا" };

export const REJECTION_REASONS = ["invalid_transition", "stale_event", "order_already_reversed", "compensated_lost_scan"] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];
export const REJECTION_LABELS: Record<RejectionReason, string> = {
  invalid_transition: "انتقال غير مسموح من الحالة الحالية",
  stale_event: "حدث أقدم من آخر حدث مسجَّل — أُرشِف بلا تغيير",
  order_already_reversed: "الطلب مسترجَع مسبقاً",
  compensated_lost_scan: "شحنة مُعوَّضة كمفقودة — تواصل مع المشرف",
};

export const EVENT_SOURCES = ["webhook", "agent_app", "merchant_manual", "system"] as const;
export const SOURCE_LABELS: Record<(typeof EVENT_SOURCES)[number], string> = { webhook: "Webhook شركة شحن", agent_app: "تطبيق المندوب", merchant_manual: "تعديل يدوي من التاجر", system: "نظامي" };

export const AWB_STATUSES = ["pending", "processing", "issued", "failed"] as const;
export const AWB_LABELS: Record<(typeof AWB_STATUSES)[number], string> = { pending: "معلّق — سيُعاد المحاولة", processing: "قيد المعالجة", issued: "صدرت", failed: "فشل نهائي" };

export const CUSTODY_TYPES = ["collected_cod", "handed_over", "lost", "written_off", "reversed"] as const;
export const CUSTODY_LABELS: Record<(typeof CUSTODY_TYPES)[number], string> = { collected_cod: "تحصيل COD", handed_over: "تسليم عهدة", lost: "فقدان عهدة", written_off: "شطب/إتلاف", reversed: "تراجع تحصيل" };

/** FR-39.06: the same `ALLOWED_TRANSITIONS` the server enforces — only to disable choices. */
export const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  label_pending: ["pending_pickup", "cancelled"],
  pending_pickup: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "returned", "cancelled"],
  in_transit: ["delivered", "returned"],
  delivered: ["returned"],
  returned: [],
  cancelled: [],
  compensated_lost: [],
};

const status = z.enum(SHIPMENT_STATUSES);
const carrier = z.enum(CARRIER_CODES_ALL);

export const weightPreviewSchema = z.object({ actual: z.string(), volumetric: z.string(), chargeable: z.string() });
export const pendingOrderSchema = z.object({
  order_id: z.number(),
  customer_name: z.string(),
  address: z.string(),
  fulfillment_id: z.number().nullable(),
  weight_preview: weightPreviewSchema.nullable(),
  awb_plan_count: z.number(),
  created_at: z.string(),
});
export type PendingOrder = z.infer<typeof pendingOrderSchema>;
export const pendingOrderListSchema = z.object({ count: z.number(), results: z.array(pendingOrderSchema) });

export const zoneOptionSchema = z.object({ code: z.string(), name: z.string(), display_price: z.string(), currency: z.string(), is_active: z.boolean().optional() });
export const zoneOptionListSchema = z.object({ count: z.number(), results: z.array(zoneOptionSchema) });

export const shipmentRowSchema = z.object({
  id: z.number(),
  waybill_number: z.string(),
  order_id: z.number(),
  customer_name: z.string(),
  address: z.string(),
  carrier_code: carrier,
  zone_code: z.string().nullable(),
  zone_name_snapshot: z.string(),
  display_cost: z.string(),
  actual_weight_snapshot: z.string(),
  status,
  billing_status: z.enum(BILLING_STATUSES),
  master_waybill_number: z.string().nullable(),
  parent_shipment: z.number().nullable(),
  children_count: z.number(),
  agent: z.object({ id: z.number(), name: z.string() }).nullable(),
  flagged_for_review: z.boolean(),
  created_at: z.string(),
});
export type ShipmentRow = z.infer<typeof shipmentRowSchema>;
export const shipmentListSchema = z.object({
  count: z.number(),
  results: z.array(shipmentRowSchema),
  counts: z.object({ pending_pickup: z.number(), in_transit: z.number(), delivered: z.number() }),
});

export const shipmentEventSchema = z.object({
  id: z.number(),
  event_time: z.string(),
  received_at: z.string(),
  from_status: status.nullable(),
  to_status: status,
  source: z.enum(EVENT_SOURCES),
  actor_type: z.string(),
  actor_id: z.number().nullable(),
  actor_name: z.string(),
  is_rejected: z.boolean(),
  rejection_reason: z.enum(REJECTION_REASONS).nullable(),
  out_of_order: z.boolean(),
  flagged_for_review: z.boolean(),
  geo: z.object({ lat: z.number(), lng: z.number(), accuracy_m: z.number().nullable() }).nullable(),
});
export type ShipmentEvent = z.infer<typeof shipmentEventSchema>;

export const shipmentDetailSchema = shipmentRowSchema.extend({
  fulfillment_id: z.number().nullable(),
  version: z.number(),
  display_cod_amount: z.string(),
  cod_amount: z.string(),
  delivered_at: z.string().nullable(),
  collected_at: z.string().nullable(),
  allowed_transitions: z.array(status),
  children: z.array(z.object({ id: z.number(), waybill_number: z.string(), status })),
  items: z.array(z.object({ fulfillment_item_id: z.number(), product_name: z.string(), quantity: z.number(), delivered_quantity: z.number().nullable(), rejection_reason: z.string(), display_unit_price: z.string() })),
  events: z.array(shipmentEventSchema),
});
export type ShipmentDetail = z.infer<typeof shipmentDetailSchema>;

export const transitionResultSchema = z.object({
  shipment_id: z.number(),
  waybill_number: z.string(),
  status,
  accepted: z.boolean(),
  rejection_reason: z.enum(REJECTION_REASONS).nullable(),
  flagged_for_review: z.boolean(),
});
export type TransitionResult = z.infer<typeof transitionResultSchema>;

export const awbItemSchema = z.object({
  id: z.number(),
  shipment_id: z.number().nullable(),
  waybill_number: z.string().nullable(),
  order_id: z.number(),
  fulfillment_id: z.number(),
  carrier_code: z.enum(["aramex", "smsa"]),
  status: z.enum(AWB_STATUSES),
  attempts: z.number(),
  error_detail: z.string(),
  updated_at: z.string(),
});
export type AwbItem = z.infer<typeof awbItemSchema>;
export const awbListSchema = z.object({ count: z.number(), results: z.array(awbItemSchema) });

export const rateCardSchema = z.object({
  carrier_code: z.enum(["aramex", "smsa"]),
  zone_code: z.string(),
  zone_name: z.string(),
  currency: z.string(),
  display_expected_price: z.string(),
  display_last_confirmed_price: z.string(),
  drift_percent: z.string(),
  awaiting_confirmation: z.boolean(),
  updated_at: z.string(),
});
export const rateCardListSchema = z.array(rateCardSchema);

export const custodyEntrySchema = z.object({
  id: z.number(),
  entry_type: z.enum(CUSTODY_TYPES),
  display_amount: z.string(),
  sign: z.enum(["+", "-"]),
  currency: z.string(),
  related_shipment: z.object({ id: z.number(), waybill_number: z.string().nullable() }).nullable(),
  related_shift: z.number().nullable(),
  reverses: z.number().nullable(),
  agent_name: z.string(),
  note: z.string(),
  created_at: z.string(),
});
export type CustodyEntry = z.infer<typeof custodyEntrySchema>;

const shiftRef = z.object({ id: z.number(), started_at: z.string(), vehicle_ref: z.string() }).nullable();
export const supervisorSchema = z.object({
  agents: z.array(z.object({ id: z.number(), name: z.string(), is_active: z.boolean(), open_shift: shiftRef, open_shipments: z.number(), display_balance: z.string() })),
  unassigned_new_orders: z.array(shipmentRowSchema),
  reversals: z.array(custodyEntrySchema),
});
export type Supervisor = z.infer<typeof supervisorSchema>;
export const reassignResultSchema = z.object({ detail: z.string(), moved_shipments: z.number(), display_balance_moved: z.string() });

export const shiftListSchema = z.object({
  results: z.array(z.object({ id: z.number(), agent_id: z.number(), agent_name: z.string(), vehicle_ref: z.string(), started_at: z.string(), ended_at: z.string().nullable(), handed_over_to: z.number().nullable(), handed_over_to_name: z.string().nullable() })),
});
