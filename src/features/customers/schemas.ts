import { z } from "zod";

/**
 * M07 data contracts (spec §7). Every row is `[NEEDS BACKEND]` — there is no `Customer`
 * model upstream: the customer is DERIVED from orders and keyed by the normalised phone
 * (FR-07.01). Served today by `/api/bff/customers/*` from `src/mocks/customers/*`.
 * Money is always a server string (`display_*`); the UI never formats or sums it (FR-07.04).
 */

/** `AUDIENCE_TYPE` values verbatim (FR-07.09) — passed to M13 campaigns unchanged. */
export const SEGMENTS = ["all", "abandoned_carts", "dormant", "bought_product"] as const;
export type Segment = (typeof SEGMENTS)[number];
export const SEGMENT_LABELS: Record<Segment, string> = {
  all: "الكل",
  abandoned_carts: "سلات متروكة",
  dormant: "خامل",
  bought_product: "اشترى منتجاً",
};

/** COD trust buckets (FR-07.02) — query values, labels as the spec writes them. */
export const TRUST_BUCKETS = ["lt50", "50-80", "gt80"] as const;
export type TrustBucket = (typeof TRUST_BUCKETS)[number];
export const TRUST_BUCKET_LABELS: Record<TrustBucket, string> = { lt50: "< 50%", "50-80": "50–80%", gt80: "> 80%" };

export const ORDERINGS = ["last_order_at", "total_spent", "orders_count", "name"] as const;

export const customerListItemSchema = z.object({
  phone: z.string(),
  phone_available: z.boolean(),
  name: z.string(),
  orders_count: z.number().int(),
  display_total_spent: z.string(),
  last_order_at: z.string(),
  trust: z.object({ platform_risk_percentage: z.number().nullable() }),
  cod_disabled: z.boolean(),
  display_wallet_balance: z.string().nullable(),
  points_balance: z.number().int().nullable(),
});
export type CustomerListItem = z.infer<typeof customerListItemSchema>;

export const customerListResponseSchema = z.object({
  count: z.number().int(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(customerListItemSchema),
});

export const platformTrustSchema = z.object({
  successful_cod_orders: z.number().int(),
  failed_cod_orders: z.number().int(),
  risk_percentage: z.number(),
});
export type PlatformTrust = z.infer<typeof platformTrustSchema>;

export const storeReliabilitySchema = z.object({
  cod_refusals_count: z.number().int(),
  cod_disabled: z.boolean(),
  reason: z.string().nullable(),
  updated_at: z.string().nullable(),
  updated_by: z.string().nullable(),
});
export type StoreReliability = z.infer<typeof storeReliabilitySchema>;

export const customerDetailSchema = z.object({
  phone: z.string(),
  phone_available: z.boolean(),
  name: z.string(),
  other_names: z.array(z.string()).default([]),
  email: z.string().nullable(),
  first_order_at: z.string(),
  last_order_at: z.string(),
  orders_count: z.number().int(),
  display_total_spent: z.string(),
  display_refunded: z.string(),
  display_avg_basket: z.string(),
  segment_flags: z.array(z.string()).default([]),
  trust: z.object({ platform: platformTrustSchema.nullable(), store: storeReliabilitySchema }),
  wallet: z.object({ id: z.number().int(), display_balance: z.string(), is_active: z.boolean() }).nullable(),
  points: z.object({ balance: z.number().int() }).nullable(),
});
export type CustomerDetail = z.infer<typeof customerDetailSchema>;

export const WALLET_REASONS = ["manual_topup", "refund", "reward", "order_payment", "adjustment", "loyalty_redeem"] as const;
export const WALLET_REASON_LABELS: Record<(typeof WALLET_REASONS)[number], string> = {
  manual_topup: "تعبئة يدوية",
  refund: "استرجاع",
  reward: "مكافأة",
  order_payment: "دفع طلب",
  adjustment: "تسوية",
  loyalty_redeem: "استبدال نقاط",
};

export const walletTabSchema = z.object({
  wallet: z.object({ id: z.number().int(), display_balance: z.string(), is_active: z.boolean() }).nullable(),
  results: z.array(
    z.object({
      id: z.number().int(),
      amount: z.string(),
      display_amount: z.string(),
      reason: z.enum(WALLET_REASONS),
      note: z.string().nullable(),
      reference: z.object({ type: z.string(), id: z.number().int(), label: z.string() }).nullable(),
      display_balance_after: z.string(),
      actor: z.string(),
      created_at: z.string(),
    }),
  ),
});
export type WalletTab = z.infer<typeof walletTabSchema>;

export const POINTS_TYPES = ["earn", "redeem"] as const;
export const POINTS_TYPE_LABELS: Record<(typeof POINTS_TYPES)[number], string> = { earn: "اكتساب", redeem: "استبدال" };

export const pointsTabSchema = z.object({
  balance: z.number().int(),
  program_enabled: z.boolean(),
  points_per_riyal_redemption: z.number(),
  display_riyal_equivalent: z.string().nullable(),
  transactions: z.array(
    z.object({ id: z.number().int(), type: z.enum(POINTS_TYPES), points: z.number().int(), order_id: z.number().int().nullable(), created_at: z.string() }),
  ),
});
export type PointsTab = z.infer<typeof pointsTabSchema>;

export const wishlistRowSchema = z.object({
  product_id: z.number().int(),
  product: z
    .object({ id: z.number().int(), name: z.string(), image: z.string().nullable(), display_price: z.string(), stock: z.number() })
    .nullable(),
  in_wishlist: z.boolean(),
  added_at: z.string().nullable(),
  back_in_stock_requested: z.boolean(),
});
export const wishlistTabSchema = z.array(wishlistRowSchema);
export type WishlistRow = z.infer<typeof wishlistRowSchema>;

export const reviewSchema = z.object({
  id: z.number().int(),
  product: z.object({ id: z.number().int(), name: z.string() }),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  created_at: z.string(),
  admin_reply: z.string().nullable(),
  approved: z.boolean(),
});
export const reviewsTabSchema = z.array(reviewSchema);
export type Review = z.infer<typeof reviewSchema>;

export const noteSchema = z.object({
  id: z.number().int(),
  body: z.string(),
  author: z.string(),
  created_at: z.string(),
  can_delete: z.boolean(),
});
export const notesSchema = z.array(noteSchema);
export type Note = z.infer<typeof noteSchema>;

export const segmentCountSchema = z.object({
  segment: z.enum(SEGMENTS),
  count: z.number().int(),
  product: z.object({ id: z.number().int(), name: z.string() }).nullable(),
});

/** The M04 product search (`GET /api/bff/products?q=`) — only what the picker needs. */
export const productOptionsSchema = z.object({
  results: z.array(z.object({ id: z.number().int(), name: z.string(), sku: z.string() })),
});

// ── Forms ─────────────────────────────────────────────────────────────────────────────
export const noteFormSchema = z.object({
  body: z.string().trim().min(1, "اكتب الملاحظة.").max(1000, "الملاحظة أطول من 1000 حرف."),
});
export type NoteForm = z.infer<typeof noteFormSchema>;

export const codFormSchema = z.object({
  reason: z.string().trim().min(3, "اكتب سبباً واضحاً (3 أحرف على الأقل).").max(300, "السبب أطول من 300 حرف."),
  confirm: z.string(),
});
export type CodForm = z.infer<typeof codFormSchema>;

export const replyFormSchema = z.object({
  admin_reply: z.string().trim().max(1000, "الرد أطول من 1000 حرف."),
});
export type ReplyForm = z.infer<typeof replyFormSchema>;

/**
 * The key every profile URL, query key and API path uses (FR-07.01, §8): the normalised
 * international form without `+` — local Yemeni `07…` → `9677…`, Saudi `05…` → `9665…`.
 */
export function normalizeCustomerPhone(raw: string): string {
  let d = raw.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("967") || d.startsWith("966")) return d;
  if (d.startsWith("05")) return `966${d.slice(1)}`;
  if (d.startsWith("0")) return `967${d.slice(1)}`;
  return d;
}


/** The word typed to confirm re-enabling COD (FR-07.10 «تأكيد نصّي»). */
export const COD_CONFIRM_WORD = "تفعيل";
