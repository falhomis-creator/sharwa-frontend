import { z } from "zod";
import { paginated } from "@/lib/schemas/pagination";
import {
  FULFILLMENT_STATES,
  ORDER_STATUSES,
  PAYMENT_INTENT_METHODS,
  PAYMENT_INTENT_STATUSES,
  PAYMENT_STATUSES,
  REFUND_METHODS,
  SALES_CHANNELS,
  TIMELINE_SOURCES,
  TRAFFIC_SOURCES,
} from "@/features/orders/schemas/enums";

/**
 * M06 contracts (data-model §4, discovery 02 §3/§8). The list/actions rows are
 * `[NEEDS BACKEND]` (M06 §7); returns and B2B drafts stay on the Ready `/api/v1/*`
 * passthrough. TWO status axes, never merged: `status` (financial, system) and
 * `fulfillment_status` (merchant-defined, coloured).
 */
export const orderStatusEnum = z.enum(ORDER_STATUSES);
export const paymentStatusEnum = z.enum(PAYMENT_STATUSES);

export const fulfillmentRefSchema = z.object({ id: z.number().int(), name: z.string(), color: z.string() });
export type FulfillmentRef = z.infer<typeof fulfillmentRefSchema>;

// ── Merchant fulfilment workflow (`OrderStatus`) ─────────────────────────────────────
export const orderStatusDefSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  color: z.string(),
  sort_order: z.number().int(),
  is_default: z.boolean(),
  releases_stock: z.boolean(),
  marks_completed: z.boolean(),
  orders_count: z.number().int(),
});
export type OrderStatusDef = z.infer<typeof orderStatusDefSchema>;
export const orderStatusDefListSchema = z.array(orderStatusDefSchema);

export const orderStatusDefInputSchema = z.object({
  name: z.string().trim().min(1, "أدخل اسم الحالة.").max(60, "الاسم 60 حرفاً على الأكثر."),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "لون بصيغة #RRGGBB."),
  is_default: z.boolean(),
  releases_stock: z.boolean(),
  marks_completed: z.boolean(),
});
export type OrderStatusDefInput = z.infer<typeof orderStatusDefInputSchema>;

// ── List ──────────────────────────────────────────────────────────────────────────────
export const orderListItemSchema = z.object({
  id: z.number().int(),
  customer_name: z.string(),
  customer_phone: z.string(),
  display_total: z.string(),
  status: orderStatusEnum,
  payment_status: paymentStatusEnum,
  fulfillment_status: fulfillmentRefSchema.nullable(),
  sales_channel: z.enum(SALES_CHANNELS),
  created_at: z.string(),
  /** Optimistic lock (data-model §6) — every write carries it back. */
  version: z.number().int(),
  // [NEEDS BACKEND] list extensions used by the table and the guards:
  traffic_source: z.enum(TRAFFIC_SOURCES).optional(),
  source_location: z.object({ id: z.number().int(), name: z.string() }).nullable().optional(),
  items_count: z.number().int().optional(),
  /** Marketplace orders (amazon/noon) are read-only here (M06 US-06.3.4). */
  locked_reason: z.string().nullable().optional(),
});
export type OrderListItem = z.infer<typeof orderListItemSchema>;
export const orderListResponseSchema = paginated(orderListItemSchema);
export type OrderListResponse = z.infer<typeof orderListResponseSchema>;

/** `GET /api/v1/orders/counters/` (shape proposed here — M06 §7 names the route only). */
export const orderCountersSchema = z.object({
  new: z.number().int(),
  pending_payment: z.number().int(),
  awaiting_payment: z.number().int(),
  payment_review: z.number().int(),
  by_fulfillment: z.array(fulfillmentRefSchema.extend({ count: z.number().int() })),
});
export type OrderCounters = z.infer<typeof orderCountersSchema>;

// ── Detail ────────────────────────────────────────────────────────────────────────────
export const orderItemSchema = z.object({
  id: z.number().int(),
  product_id: z.number().int().nullable(),
  product_name: z.string(),
  variant_label: z.string().nullable(),
  sku_snapshot: z.string(),
  product_image_snapshot: z.string().nullable(),
  quantity: z.string(),
  display_price: z.string(),
  display_line_total: z.string(),
  display_tax_amount: z.string().nullable(),
  source_location: z.object({ id: z.number().int(), name: z.string() }).nullable(),
  /** The product was deleted — render from the snapshot with «محذوف» (M06 §8). */
  product_deleted: z.boolean(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const fulfillmentSchema = z.object({
  id: z.number().int(),
  location: z.object({ id: z.number().int(), name: z.string() }),
  status: z.enum(FULFILLMENT_STATES),
  item_ids: z.array(z.number().int()),
  tracking_number: z.string().nullable(),
  shipping_provider: z.string().nullable(),
});

export const paymentIntentSchema = z.object({
  id: z.number().int(),
  method: z.enum(PAYMENT_INTENT_METHODS),
  status: z.enum(PAYMENT_INTENT_STATUSES),
  display_amount: z.string(),
  gateway_transaction_id: z.string().nullable(),
  created_at: z.string(),
});

export const refundSchema = z.object({
  id: z.number().int(),
  method: z.enum(REFUND_METHODS),
  display_amount: z.string(),
  reason: z.string(),
  created_at: z.string(),
  actor: z.string(),
});

export const timelineEventSchema = z.object({
  id: z.number().int(),
  at: z.string(),
  kind: z.enum(["created", "status", "fulfillment", "payment", "shipment", "approval", "refund", "note"]),
  source: z.enum(TIMELINE_SOURCES),
  text: z.string(),
  actor: z.string().nullable(),
});
export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const orderDetailSchema = orderListItemSchema.extend({
  public_uuid: z.string(),
  customer_email: z.string().nullable(),
  address: z.string(),
  is_gift: z.boolean(),
  recipient_name: z.string().nullable(),
  recipient_phone: z.string().nullable(),
  gift_message: z.string().nullable(),
  currency: z.enum(["SAR", "USD", "YER_OLD", "YER_NEW"]),
  /** Locked at order time — shown in the tooltip when it differs from the store currency (M06 §8). */
  exchange_rate_locked: z.string().nullable(),
  invoice: z.object({
    display_subtotal: z.string(),
    display_discount: z.string().nullable(),
    display_promotion_discount: z.string().nullable(),
    coupon_code: z.string().nullable(),
    display_delivery_fee: z.string(),
    display_total: z.string(),
    display_deposit: z.string().nullable(),
    display_upfront_paid: z.string().nullable(),
    display_amount_on_delivery: z.string().nullable(),
    display_wallet_used: z.string().nullable(),
    display_refunded: z.string().nullable(),
  }),
  /** Raw decimals the refund form needs for its client-side ceiling check. */
  refundable_amount: z.string(),
  delivery_method_name: z.string().nullable(),
  pickup_location: z.object({ id: z.number().int(), name: z.string() }).nullable(),
  tracking_number: z.string().nullable(),
  items: z.array(orderItemSchema),
  fulfillments: z.array(fulfillmentSchema),
  payments: z.array(paymentIntentSchema),
  refunds: z.array(refundSchema),
  timeline: z.array(timelineEventSchema),
  payment_receipt: z
    .object({
      image: z.string().nullable(),
      display_reported_amount: z.string(),
      display_required_amount: z.string(),
      display_difference: z.string(),
      difference_sign: z.enum(["under", "exact", "over"]),
      uploaded_at: z.string(),
    })
    .nullable(),
  trust: z
    .object({
      successful_cod_orders: z.number().int(),
      failed_cod_orders: z.number().int(),
      risk_percentage: z.string(),
    })
    .nullable(),
  fraud_score: z.number().nullable(),
  is_backordered: z.boolean(),
  pending_approval: z.object({ id: z.number().int(), status: z.enum(["pending", "approved", "rejected"]) }).nullable(),
  tracking_url: z.string().nullable(),
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;

// ── Writes ────────────────────────────────────────────────────────────────────────────
export const refundInputSchema = z.object({
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "أدخل مبلغاً صحيحاً (مثال: 120.00)"),
  method: z.enum(REFUND_METHODS),
  reason: z.string().trim().min(3, "اكتب سبب الاسترجاع.").max(255),
});
export type RefundInput = z.infer<typeof refundInputSchema>;

export const orderFormOptionsSchema = z.object({
  delivery_methods: z.array(z.object({ id: z.number().int(), name: z.string(), display_price: z.string(), estimated_time: z.string() })),
  pickup_locations: z.array(z.object({ id: z.number().int(), name: z.string(), address: z.string() })),
  /** Fulfilment source locations for the `location` filter (M22 owns the list). */
  locations: z.array(z.object({ id: z.number().int(), name: z.string() })).default([]),
});
export type OrderFormOptions = z.infer<typeof orderFormOptionsSchema>;

export const createOrderResponseSchema = z.object({
  id: z.number().int(),
  pending_approval: z.object({ id: z.number().int() }).nullable(),
});
