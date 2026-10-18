import { z } from "zod";
import { CURRENCIES, currencySchema } from "@/lib/schemas/money";

/**
 * Cart contracts — ready-api-v1 #5–#7 (session cookie) plus the `[NEEDS BACKEND]`
 * extensions M11 §7 proposes. Every amount is a server string; the UI never sums.
 */
export const CART_ACTIONS = ["add", "decrease", "remove_line"] as const;
export type CartActionType = (typeof CART_ACTIONS)[number];

export const CartItemSchema = z.object({
  product_id: z.number().int(),
  name: z.string(),
  size: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  quantity: z.coerce.number(),
  display_price: z.string().nullable(),
  display_subtotal: z.string().nullable(),
  // [NEEDS BACKEND] item extensions (M11 §7).
  image: z.string().nullable().optional(),
  variant_id: z.number().int().nullable().optional(),
  variant_label: z.string().nullable().optional(),
  product_slug: z.string().nullable().optional(),
  max_quantity: z.number().int().nullable().optional(),
  stock: z.coerce.number().nullable().optional(),
  is_auction: z.boolean().optional(),
  start_datetime: z.string().nullable().optional(),
  is_available: z.boolean().optional(),
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const AppliedOfferSchema = z.object({
  name: z.string(),
  offer_type: z.enum(["discount", "free_shipping", "buy_x_get_y"]),
  display_discount: z.string().nullable().optional(),
});

export const CartSchema = z.object({
  items: z.array(CartItemSchema),
  count: z.number().int().nonnegative(),
  currency: currencySchema,
  display_subtotal: z.string(),
  // [NEEDS BACKEND] (M11 §7)
  coupon_code: z.string().nullable().optional(),
  display_discount: z.string().nullable().optional(),
  applied_offers: z.array(AppliedOfferSchema).optional(),
  display_total: z.string().nullable().optional(),
  free_shipping_applies: z.boolean().optional(),
  display_free_shipping_remaining: z.string().nullable().optional(),
  // 0–100, server-computed, so the progress bar never divides money locally.
  free_shipping_progress: z.number().min(0).max(100).nullable().optional(),
});
export type Cart = z.infer<typeof CartSchema>;

export const CartActionResultSchema = z.object({
  cart_count: z.number().int().nonnegative(),
  product_qty: z.number().nonnegative(),
});
export type CartActionResult = z.infer<typeof CartActionResultSchema>;

export interface CartActionInput {
  product_id: number;
  size?: string | null;
  color?: string | null;
  action_type: CartActionType;
  // [NEEDS BACKEND] extended action contract (M10 FR-10.04).
  variant_id?: number | null;
  quantity?: number;
  personalization?: Record<string, unknown>;
  start_datetime?: string | null;
}

/** The server's line key — `"{product_id}_v{variant_id}"` or `"{product_id}_{size}_{color}"` (`products/cart.py`). */
export function lineKey(item: { product_id: number; size?: string | null; color?: string | null; variant_id?: number | null }): string {
  if (item.variant_id) return `${item.product_id}_v${item.variant_id}`;
  return `${item.product_id}_${item.size ?? ""}_${item.color ?? ""}`.replace(/_+$/, "");
}

export const CouponResultSchema = CartSchema;
export { CURRENCIES };
