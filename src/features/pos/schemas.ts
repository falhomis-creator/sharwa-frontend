import { z } from "zod";
import { displayMoney } from "@/lib/schemas/money";

/**
 * M16 POS contracts — `/api/v1/pos/*`, served by Django `api/views_pos.py` (INT-033) when `pos`
 * is in `SHARWA_LIVE_MODULES`, else by the fixture in `src/mocks/pos` (same shapes, same messages).
 * Django keeps `Shift.variance` as expected − actual internally; `display_variance` here is
 * actual − expected (negative = shortage), as before.
 *
 * Money is `display_*` text from the server, never summed or formatted here (FR-16.07).
 * Amounts the cashier TYPES travel as decimal strings ("150.00").
 */

export const SHIFT_STATUSES = ["open", "pending_manager_approval", "closed", "force_closed"] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];
export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  open: "مفتوحة",
  pending_manager_approval: "بانتظار اعتماد المدير",
  closed: "مغلقة",
  force_closed: "مغلقة قسرياً",
};

export const MOVEMENT_TYPES = ["sale", "cash_in", "cash_out", "refund", "rounding_adjustment"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];
/** FR-16.08: the five fixed Arabic labels. */
export const MOVEMENT_LABELS: Record<MovementType, string> = {
  sale: "بيع",
  cash_in: "إدخال نقد",
  cash_out: "سحب نقد",
  refund: "استرجاع",
  rounding_adjustment: "تعديل تقريب",
};

export const PAYMENT_METHODS = ["cash", "sharwa_pay"] as const;
export type PosPaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PosPaymentMethod, string> = {
  cash: "نقداً",
  sharwa_pay: "محفظة شروة باي",
};

const ref = z.object({ id: z.number().int(), name: z.string() });

export const posContextSchema = z.object({
  staff_name: z.string(),
  locations: z.array(ref),
  /** `null` for the owner (no ceiling). Decimal text, e.g. "10.00". */
  max_discount_percent: z.string().nullable(),
  can_discount: z.boolean(),
  can_refund: z.boolean(),
  can_resolve_variance: z.boolean(),
  /** A shift the system force-closed since this cashier's last visit (US-16.4.4). */
  force_closed_notice: z.object({ shift_id: z.number().int(), register_name: z.string(), closed_at: z.string() }).nullable(),
});
export type PosContext = z.infer<typeof posContextSchema>;

export const registerSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  is_active: z.boolean(),
  location: ref,
  open_shift: z
    .object({ id: z.number().int(), staff_name: z.string(), opened_at: z.string(), is_mine: z.boolean() })
    .nullable(),
});
export type Register = z.infer<typeof registerSchema>;
export const registersSchema = z.array(registerSchema);

export const movementSchema = z.object({
  id: z.number().int(),
  movement_type: z.enum(MOVEMENT_TYPES),
  direction: z.enum(["in", "out"]),
  display_amount: displayMoney,
  note: z.string(),
  order_id: z.number().int().nullable(),
  actor: z.string(),
  created_at: z.string(),
});
export type Movement = z.infer<typeof movementSchema>;

export const shiftSchema = z.object({
  id: z.number().int(),
  status: z.enum(SHIFT_STATUSES),
  version: z.number().int(),
  register: z.object({ id: z.number().int(), name: z.string(), location: ref }),
  staff_name: z.string(),
  opened_at: z.string(),
  closed_at: z.string().nullable(),
  display_opening_float: displayMoney,
  display_cash_sales: displayMoney,
  display_refunds: displayMoney,
  display_cash_in: displayMoney,
  display_cash_out: displayMoney,
  display_rounding: displayMoney,
  display_expected_closing: displayMoney,
  display_actual_closing: displayMoney.nullable(),
  display_variance: displayMoney.nullable(),
  variance_kind: z.enum(["shortage", "overage", "none"]).nullable(),
  sales_count: z.number().int(),
  approval: z.object({ id: z.number().int(), status: z.enum(["pending", "approved", "rejected"]), note: z.string().nullable() }).nullable(),
  movements: z.array(movementSchema),
});
export type Shift = z.infer<typeof shiftSchema>;

export const currentShiftSchema = z.object({ shift: shiftSchema.nullable() });

export const closeResultSchema = z.object({
  status: z.enum(SHIFT_STATUSES),
  display_variance: displayMoney,
  approval_id: z.number().int().nullable(),
  shift: shiftSchema,
});

export const posVariantSchema = z.object({
  id: z.number().int(),
  label: z.string(),
  sku: z.string(),
  display_price: displayMoney,
  stock: z.string(),
  out_of_stock: z.boolean(),
});

export const posProductSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  name_en: z.string(),
  sku: z.string(),
  barcode: z.string(),
  image: z.string().nullable(),
  display_price: displayMoney,
  stock: z.string(),
  /** `allow_backorder=false` and nothing at THIS location → «نفد في هذا الفرع». */
  out_of_stock: z.boolean(),
  has_variants: z.boolean(),
  variants: z.array(posVariantSchema),
  min_quantity: z.number().int().nullable(),
  max_quantity: z.number().int().nullable(),
  is_serialized: z.boolean(),
});
export type PosProduct = z.infer<typeof posProductSchema>;

export const productSearchSchema = z.object({
  results: z.array(posProductSchema),
  /** Set when `barcode` matched exactly one product/variant (FR-16.03: add immediately). */
  exact: z.object({ product_id: z.number().int(), variant_id: z.number().int().nullable() }).nullable(),
});

export const cartLineInput = z.object({
  product_id: z.number().int(),
  variant_id: z.number().int().nullable(),
  quantity: z.number().int().positive(),
  discount_percent: z.string().optional(),
});
export type CartLineInput = z.infer<typeof cartLineInput>;

/** `POST /pos/quote/` — the running total is the SERVER's (§10 assumption, FR-16.07). */
export const quoteSchema = z.object({
  lines: z.array(
    z.object({
      product_id: z.number().int(),
      variant_id: z.number().int().nullable(),
      display_unit_price: displayMoney,
      display_line_total: displayMoney,
      error: z.string().nullable(),
    }),
  ),
  display_subtotal: displayMoney,
  display_discount: displayMoney.nullable(),
  display_total: displayMoney,
  items_count: z.number().int(),
  /** The highest discount in the cart is over the role's ceiling (FR-16.05). */
  discount_exceeds_limit: z.boolean(),
});
export type Quote = z.infer<typeof quoteSchema>;

export const receiptSchema = z.object({
  id: z.number().int(),
  number: z.string(),
  created_at: z.string(),
  store_name: z.string(),
  register_name: z.string(),
  location_name: z.string(),
  cashier: z.string(),
  shift_id: z.number().int(),
  payment_method: z.enum(PAYMENT_METHODS),
  lines: z.array(
    z.object({
      name: z.string(),
      variant_label: z.string().nullable(),
      sku: z.string(),
      quantity: z.number().int(),
      display_unit_price: displayMoney,
      discount_percent: z.string().nullable(),
      display_line_total: displayMoney,
    }),
  ),
  display_subtotal: displayMoney,
  display_discount: displayMoney.nullable(),
  display_total: displayMoney,
  display_refunded: displayMoney.nullable(),
  /** Decimal text of what is still refundable — the refund field's ceiling. */
  refundable_amount: z.string(),
  display_refundable: displayMoney,
  approval: z.object({ id: z.number().int(), status: z.enum(["pending", "approved", "rejected"]) }).nullable(),
});
export type Receipt = z.infer<typeof receiptSchema>;

export const createOrderResultSchema = z.object({
  id: z.number().int(),
  display_total: displayMoney,
  receipt: receiptSchema,
});

export const receiptListSchema = z.object({
  results: z.array(
    z.object({
      id: z.number().int(),
      number: z.string(),
      created_at: z.string(),
      items_count: z.number().int(),
      payment_method: z.enum(PAYMENT_METHODS),
      display_total: displayMoney,
      display_refunded: displayMoney.nullable(),
    }),
  ),
});

/** 403 body when a discount is over the ceiling and no manager code/approval came with it. */
export const discountExceededSchema = z.object({
  code: z.literal("discount_exceeds_limit"),
  detail: z.string(),
  max_discount_percent: z.string(),
});

/** 428 body: the server asks for an OTP step-up (US-16.3.2). */
export const otpRequiredSchema = z.object({
  code: z.literal("otp_required"),
  detail: z.string(),
  challenge: z.enum(["shift_step_up", "large_refund", "customer_phone_change"]),
  sent_to: z.string(),
});

export const approvalCreatedSchema = z.object({ approval_id: z.number().int(), status: z.literal("pending"), detail: z.string() });

export const decimalInput = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "أدخل مبلغاً صحيحاً (مثال: 150.00)");
