import { z } from "zod";
import { ProductCardSchema } from "@/features/storefront/schemas/catalog";

/** M42 contracts (§7). */
export const ShopperPhoneSchema = z.object({ phone_normalized: z.string().nullable() });
export type ShopperPhone = z.infer<typeof ShopperPhoneSchema>;

export const WishlistProductSchema = ProductCardSchema.extend({
  allow_backorder: z.boolean().optional().default(false),
  is_available: z.boolean().optional().default(true),
});
export type WishlistProduct = z.infer<typeof WishlistProductSchema>;

export const WishlistViewSchema = z.object({
  phone_normalized: z.string().nullable().optional(),
  items: z.array(z.object({ product: WishlistProductSchema, created_at: z.string() })),
});
export type WishlistView = z.infer<typeof WishlistViewSchema>;

export const WishlistToggleSchema = z.object({ saved: z.boolean() });

export const BackInStockSchema = z.object({ subscribed: z.literal(true), already: z.boolean().optional() });

export const StoreReviewSchema = z.object({
  id: z.number().int(),
  customer_name: z.string(),
  rating: z.number().int(),
  comment: z.string(),
  created_at: z.string(),
});
export const StoreReviewsSchema = z.object({
  average_rating: z.coerce.number(),
  count: z.number().int(),
  results: z.array(StoreReviewSchema),
});
export type StoreReviews = z.infer<typeof StoreReviewsSchema>;

/** The three display states of a saved product (M42 §5). */
export function wishlistItemState(p: WishlistProduct): "available" | "sold_out" | "unavailable" {
  if (!p.is_available) return "unavailable";
  if (p.stock <= 0 && !p.allow_backorder) return "sold_out";
  return "available";
}
