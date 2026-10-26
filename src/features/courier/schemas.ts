import { z } from "zod";

/**
 * M38 contracts. The five `/api/v1/agent/*` POSTs (Ready; INT-046 aligned their bodies: `agent` and
 * `handed_over_to` are `{id, name}`) and the four reads (`/api/bff/agent/{me,shipments,custody}` →
 * Django `api/views_courier.py`, module `courier`). Amounts are
 * server strings shown verbatim in Mono (FR-38.10). Defined here, not imported from the
 * dashboard's shipping feature: route groups never share feature folders (VIII).
 */
export const SHIPMENT_STATUSES = ["label_pending", "pending_pickup", "picked_up", "in_transit", "delivered", "returned", "cancelled", "compensated_lost"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  label_pending: "بانتظار تأكيد الملصق",
  pending_pickup: "بانتظار الاستلام",
  picked_up: "تم الاستلام",
  in_transit: "قيد التوصيل",
  delivered: "تم التسليم",
  returned: "مُعاد",
  cancelled: "ملغي",
  compensated_lost: "شحنة مُعوَّضة",
};
/** Button wording for a move TO a status. */
export const ACTION_LABELS: Record<ShipmentStatus, string> = {
  label_pending: "بانتظار الملصق",
  pending_pickup: "جاهزة للاستلام",
  picked_up: "تم الاستلام",
  in_transit: "بدء التوصيل",
  delivered: "تم التسليم",
  returned: "مُعاد",
  cancelled: "إلغاء",
  compensated_lost: "مفقودة",
};

/** FR-38.04 — derived from the server's state machine; terminal states have no buttons. */
export const TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  label_pending: ["pending_pickup", "cancelled"],
  pending_pickup: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "returned", "cancelled"],
  in_transit: ["delivered", "returned"],
  delivered: ["returned"],
  returned: [],
  cancelled: [],
  compensated_lost: [],
};

export const TABS = ["pending_pickup", "picked_up", "in_transit", "delivered", "other"] as const;
export type Tab = (typeof TABS)[number];
export const TAB_LABELS: Record<Tab, string> = { pending_pickup: "بانتظار الاستلام", picked_up: "تم الاستلام", in_transit: "قيد التوصيل", delivered: "تم التسليم", other: "أخرى" };

export const REJECTION_REASONS = ["invalid_transition", "stale_event", "order_already_reversed", "compensated_lost_scan"] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];
export const REJECTION_TEXT: Record<RejectionReason, string> = {
  invalid_transition: "انتقال غير مسموح — تغيّرت حالة الشحنة. المعروض الآن حالتها الفعلية.",
  stale_event: "حدث أقدم من آخر حدث مسجَّل — أُرشِف بلا تغيير. تحقق من وقت الجهاز.",
  order_already_reversed: "الطلب مسترجَع مسبقاً — لم يُطبَّق الحدث.",
  compensated_lost_scan: "هذه شحنة مُعوَّضة كمفقودة — تواصل مع المشرف.",
};

export const CUSTODY_TYPES = ["collected_cod", "handed_over", "lost", "written_off", "reversed"] as const;
export const CUSTODY_LABELS: Record<(typeof CUSTODY_TYPES)[number], string> = { collected_cod: "تحصيل COD", handed_over: "تسليم عهدة", lost: "فقدان عهدة", written_off: "شطب/إتلاف", reversed: "تراجع تحصيل" };

const status = z.enum(SHIPMENT_STATUSES);
const shiftRef = z.object({ id: z.number(), started_at: z.string(), vehicle_ref: z.string() });

export const meSchema = z.object({ agent: z.object({ id: z.number(), name: z.string() }), open_shift: shiftRef.nullable(), display_balance: z.string(), currency: z.string() });
export type Me = z.infer<typeof meSchema>;

export const shipmentSchema = z.object({
  id: z.number(),
  waybill_number: z.string(),
  status,
  customer_name: z.string(),
  address: z.string(),
  display_cod_amount: z.string(),
  fulfillment_id: z.number().nullable(),
  flagged_for_review: z.boolean(),
  items: z.array(z.object({ fulfillment_item_id: z.number(), product_name: z.string(), quantity: z.number() })),
});
export type AgentShipment = z.infer<typeof shipmentSchema>;
export const shipmentListSchema = z.object({ count: z.number(), counts: z.record(z.string(), z.number()), results: z.array(shipmentSchema) });
export type ShipmentList = z.infer<typeof shipmentListSchema>;

export const eventSchema = z.object({
  id: z.number(),
  event_time: z.string(),
  received_at: z.string(),
  from_status: status.nullable(),
  to_status: status,
  source: z.string(),
  actor_name: z.string(),
  is_rejected: z.boolean(),
  rejection_reason: z.enum(REJECTION_REASONS).nullable(),
  flagged_for_review: z.boolean(),
});
export const shipmentDetailSchema = shipmentSchema.extend({
  items: z.array(z.object({ fulfillment_item_id: z.number(), product_name: z.string(), quantity: z.number(), delivered_quantity: z.number().nullable(), rejection_reason: z.string() })),
  allowed_transitions: z.array(status),
  events: z.array(eventSchema),
});
export type AgentShipmentDetail = z.infer<typeof shipmentDetailSchema>;

export const custodySchema = z.object({
  count: z.number(),
  display_balance: z.string(),
  results: z.array(
    z.object({
      id: z.number(),
      entry_type: z.enum(CUSTODY_TYPES),
      display_amount: z.string(),
      sign: z.enum(["+", "-"]),
      currency: z.string(),
      related_shipment: z.object({ id: z.number(), waybill_number: z.string().nullable() }).nullable(),
      related_shift: z.number().nullable(),
      reverses: z.number().nullable(),
      note: z.string(),
      created_at: z.string(),
    }),
  ),
});
export type Custody = z.infer<typeof custodySchema>;

export const transitionResultSchema = z.object({ shipment_id: z.number(), waybill_number: z.string(), status, accepted: z.boolean(), rejection_reason: z.enum(REJECTION_REASONS).nullable(), flagged_for_review: z.boolean() });
export type TransitionResult = z.infer<typeof transitionResultSchema>;
export const partialResultSchema = z.object({ collected_amount: z.string(), display_collected_amount: z.string().optional(), currency: z.string(), delivered: z.number(), rejected: z.number(), duplicate: z.boolean(), status: status.optional() });
export type PartialResult = z.infer<typeof partialResultSchema>;
export const scanResultSchema = z.object({ ok: z.literal(true), fulfillment_id: z.number() });
export const startShiftSchema = z.object({ shift_id: z.number(), agent: z.object({ id: z.number(), name: z.string() }), started_at: z.string(), closed_previous_shift_id: z.number().nullable().optional() });
export const endShiftSchema = z.union([
  z.object({ new_shift_id: z.number(), handed_over_to: z.object({ id: z.number(), name: z.string() }), balance: z.string() }),
  z.object({ shift_id: z.number(), ended_at: z.string() }),
]);
