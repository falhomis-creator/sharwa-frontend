import { z } from "zod";
import { currencySchema } from "@/lib/schemas/money";
import { normalizePhone } from "@/lib/format";

/**
 * M12 contracts — served by Django since INT-014 (`api/views_checkout.py`); the mock keeps the
 * same shapes. Amounts are `display_*` strings only (FR-12.03).
 */
export const DeliveryOptionsSchema = z.object({
  delivery_methods: z.array(
    z.object({ id: z.number().int(), name: z.string(), display_price: z.string(), estimated_time: z.string().nullable().optional(), is_sharwa_official: z.boolean().optional() }),
  ),
  pickup_locations: z.array(z.object({ id: z.number().int(), name: z.string(), address: z.string(), phone: z.string().nullable().optional() })),
  display_default_delivery_fee: z.string().nullable().optional(),
  free_shipping_applies: z.boolean().optional(),
});
export type DeliveryOptions = z.infer<typeof DeliveryOptionsSchema>;

export const PAYMENT_METHODS = ["manual", "sharwa_pay", "jeeb", "kuraimi", "cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PaymentOptionsSchema = z.object({
  methods: z.array(
    z.object({
      code: z.enum(PAYMENT_METHODS),
      label: z.string(),
      enabled: z.boolean(),
      reason: z.string().nullable().optional(),
      /** Direct gateways: what the buyer types at checkout (Jeeb `purchase_code`, Kuraimi `pin`). */
      fields: z.array(z.object({ name: z.string(), label: z.string(), secret: z.boolean().optional() })).optional(),
    }),
  ),
  payout_accounts: z.array(z.object({ account_type: z.enum(["bank", "wallet"]), provider_name: z.string(), account_number: z.string(), account_name: z.string() })),
});
export type PaymentOptions = z.infer<typeof PaymentOptionsSchema>;

export const InvoiceSchema = z.object({
  display_subtotal: z.string(),
  display_discount: z.string().nullable().optional(),
  display_promotion_discount: z.string().nullable().optional(),
  applied_offers: z.array(z.object({ name: z.string(), offer_type: z.string(), display_discount: z.string().nullable().optional() })).optional().default([]),
  coupon_code: z.string().nullable().optional(),
  display_delivery_fee: z.string(),
  free_shipping_applies: z.boolean().optional(),
  display_wallet_amount_used: z.string().nullable().optional(),
  display_loyalty_discount: z.string().nullable().optional(),
  display_total: z.string(),
  display_deposit_amount: z.string().nullable().optional(),
  display_upfront_required: z.string().nullable().optional(),
  display_amount_on_delivery: z.string().nullable().optional(),
  fully_paid_by_wallet: z.boolean().optional(),
  currency: currencySchema,
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const CheckoutResultSchema = z.object({
  order_id: z.number().int(),
  public_uuid: z.string(),
  status: z.string(),
  payment_status: z.string(),
  display_total: z.string(),
  next_action: z.object({ type: z.enum(["none", "redirect_gateway", "show_transfer_instructions"]), url: z.string().optional() }),
});
export type CheckoutResult = z.infer<typeof CheckoutResultSchema>;

export const CodVerifySchema = z.object({ ok: z.boolean(), cod_allowed: z.boolean(), reason: z.string().nullable().optional() });
export const OkSchema = z.object({ ok: z.boolean() }).passthrough();
export const SharwaPayOtpSchema = z.object({ ok: z.boolean(), display_balance: z.string().nullable().optional() });
export const WalletPreviewSchema = z.object({ display_balance: z.string(), display_applicable: z.string(), currency_ok: z.boolean().optional() });
export const LoyaltyBalanceSchema = z.object({ balance: z.number().int(), min_points_to_redeem: z.number().int(), display_value: z.string() });

export const PublicOrderSchema = z.object({
  order_number: z.string(),
  public_uuid: z.string(),
  status: z.string(),
  status_label: z.string(),
  payment_status: z.string(),
  payment_method: z.string(),
  payment_method_label: z.string(),
  display_total: z.string(),
  display_upfront_required: z.string().nullable().optional(),
  display_amount_on_delivery: z.string().nullable().optional(),
  created_at: z.string(),
  is_gift: z.boolean(),
  receipt_attached: z.boolean(),
  payout_accounts: PaymentOptionsSchema.shape.payout_accounts,
  items: z.array(z.object({ product_name: z.string(), variant_label: z.string().nullable(), quantity: z.number(), display_price: z.string() })),
  customer_phone_masked: z.string().optional(),
});
export type PublicOrder = z.infer<typeof PublicOrderSchema>;

/** Local only — `CheckoutDraft` (M12 §5): the form; never holds money. */
const phone = z
  .string()
  .trim()
  .min(1, "أدخل رقم واتساب.")
  .refine((v) => /^(967|966)\d{9}$/.test(normalizePhone(v)), "رقم واتساب غير صحيح.");

export const checkoutDraftSchema = z
  .object({
    name: z.string().trim().min(2, "أدخل اسمك."),
    phone,
    email: z.union([z.literal(""), z.string().trim().email("بريد إلكتروني غير صحيح.")]).optional(),
    fulfillment: z.enum(["delivery", "pickup"]),
    address: z.string().trim().max(500).optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    delivery_method_id: z.string().optional(),
    pickup_location_id: z.string().optional(),
    payment_method: z.enum(PAYMENT_METHODS, { message: "اختر طريقة دفع." }),
    use_wallet: z.boolean(),
    redeem_points: z.string().optional(),
    transfer_amount_reported: z.union([z.literal(""), z.string().regex(/^\d+(\.\d{1,2})?$/, "أدخل المبلغ بالأرقام (مثال: 250.00).")]).optional(),
    is_gift: z.boolean(),
    recipient_name: z.string().trim().optional(),
    recipient_phone: z.string().trim().optional(),
    gift_message: z.string().max(200, "رسالة الهدية 200 حرف كحد أقصى.").optional(),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "delivery" && !v.address?.trim()) ctx.addIssue({ code: "custom", path: ["address"], message: v.is_gift ? "أدخل عنوان المستلم." : "أدخل عنوان التوصيل." });
    if (v.fulfillment === "pickup" && !v.pickup_location_id) ctx.addIssue({ code: "custom", path: ["pickup_location_id"], message: "اختر نقطة الاستلام." });
    if (v.is_gift) {
      if (!v.recipient_name?.trim()) ctx.addIssue({ code: "custom", path: ["recipient_name"], message: "أدخل اسم المستلم." });
      if (!v.recipient_phone || !/^(967|966)\d{9}$/.test(normalizePhone(v.recipient_phone))) ctx.addIssue({ code: "custom", path: ["recipient_phone"], message: "رقم المستلم غير صحيح." });
    }
  });
export type CheckoutDraft = z.infer<typeof checkoutDraftSchema>;
