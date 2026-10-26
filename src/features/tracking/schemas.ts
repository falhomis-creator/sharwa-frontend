import { z } from "zod";

/** M41 §7 `GET /api/v1/orders/track/<public_uuid>/` (Django since INT-015). No internal field is part of the shape (FR-41.04). */
export const ShipmentSchema = z.object({
  waybill_number: z.string(),
  carrier_code: z.string(),
  carrier_name: z.string().nullable().optional(),
  status: z.string(),
  status_label: z.string(),
  explanation: z.string().nullable().optional(),
  courier: z.object({ name: z.string(), phone: z.string() }).nullable().optional(),
  events: z.array(z.object({ to_status: z.string(), event_time: z.string() })),
});

const ItemSchema = z.object({ product_name: z.string(), variant_label: z.string().nullable(), quantity: z.number(), image: z.string().nullable() });

export const TrackingSchema = z.object({
  order_number: z.string(),
  public_uuid: z.string(),
  created_at: z.string(),
  status: z.string(),
  status_label: z.string(),
  payment_status: z.string(),
  fulfillment_status: z.object({ name: z.string(), color: z.string() }).nullable(),
  rollup_label: z.string(),
  display_total: z.string().nullable(),
  display_amount_on_delivery: z.string().nullable(),
  display_deposit_amount: z.string().nullable(),
  delivery_method_name: z.string().nullable(),
  is_gift: z.boolean(),
  recipient_name: z.string().nullable(),
  gift_message: z.string().nullable(),
  customer_name: z.string().nullable(),
  customer_phone_masked: z.string().nullable(),
  address_text: z.string().nullable(),
  pickup_location: z.object({ name: z.string(), address: z.string(), phone: z.string().nullable() }).nullable(),
  items: z.array(ItemSchema),
  fulfillments: z.array(
    z.object({ id: z.number(), status: z.string(), status_label: z.string(), items: z.array(ItemSchema), pickup_code: z.string().nullable(), shipment: ShipmentSchema.nullable() }),
  ),
  return_policy_excerpt: z.string().nullable(),
});
export type Tracking = z.infer<typeof TrackingSchema>;

/** Fallback labels for the fixed states only (M41 §10) — the server sends its own. */
export const SHIPMENT_STEPS = [
  { status: "pending_pickup", label: "بانتظار الاستلام من التاجر" },
  { status: "picked_up", label: "تم الاستلام" },
  { status: "in_transit", label: "قيد التوصيل" },
  { status: "delivered", label: "تم التسليم" },
] as const;
