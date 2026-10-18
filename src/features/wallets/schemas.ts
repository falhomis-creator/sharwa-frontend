import { z } from "zod";

/**
 * M35 — customer wallets (SAR only, keyed by phone) and loyalty points, merchant side.
 * Every amount is the server's string (`display_*`); the UI never formats or sums money.
 */
export const WALLET_REASONS = ["manual_topup", "refund", "reward", "order_payment", "adjustment", "loyalty_redeem"] as const;
export type WalletReason = (typeof WALLET_REASONS)[number];
export const WALLET_REASON_LABELS: Record<WalletReason, string> = {
  manual_topup: "تعبئة يدوية",
  refund: "استرجاع",
  reward: "مكافأة",
  order_payment: "دفع طلب",
  adjustment: "تسوية",
  loyalty_redeem: "استبدال نقاط",
};
/** The three a merchant may pick (FR-35.03). */
export const MANUAL_REASONS = ["manual_topup", "reward", "adjustment"] as const;
export type ManualReason = (typeof MANUAL_REASONS)[number];

export const WALLET_SORTS = ["balance", "last_transaction_at"] as const;
export type WalletSort = (typeof WALLET_SORTS)[number];
export const WALLET_SORT_LABELS: Record<WalletSort, string> = { balance: "الرصيد", last_transaction_at: "آخر حركة" };

export const walletListItemSchema = z.object({
  id: z.number(),
  customer_phone: z.string(),
  customer_name: z.string(),
  display_balance: z.string(),
  is_active: z.boolean(),
  last_transaction_at: z.string().nullable(),
  transactions_count: z.number(),
});
export type WalletListItem = z.infer<typeof walletListItemSchema>;

export const walletListResponseSchema = z.object({
  count: z.number(),
  totals: z.object({ display_balance_sum: z.string(), active_count: z.number() }),
  results: z.array(walletListItemSchema),
});
export type WalletListResponse = z.infer<typeof walletListResponseSchema>;

export const walletDetailSchema = walletListItemSchema.extend({
  created_at: z.string(),
  points: z.object({ balance: z.number() }).nullable(),
});
export type WalletDetail = z.infer<typeof walletDetailSchema>;

export const referenceSchema = z.object({ type: z.enum(["order", "refund"]), id: z.number(), label: z.string() }).nullable();

export const walletTransactionSchema = z.object({
  id: z.number(),
  amount: z.string(),
  display_amount: z.string(),
  reason: z.enum(WALLET_REASONS),
  note: z.string().nullable(),
  reference: referenceSchema,
  display_balance_after: z.string(),
  actor: z.string(),
  created_at: z.string(),
});
export type WalletTransaction = z.infer<typeof walletTransactionSchema>;

export const walletTransactionsResponseSchema = z.object({ count: z.number(), results: z.array(walletTransactionSchema) });

export const topupResponseSchema = z.object({ display_balance: z.string(), transaction: walletTransactionSchema });

export const loyaltyProgramSchema = z.object({
  is_enabled: z.boolean(),
  riyals_per_point: z.number(),
  points_per_riyal_redemption: z.number(),
  min_points_to_redeem: z.number(),
});
export type LoyaltyProgram = z.infer<typeof loyaltyProgramSchema>;

export const pointsTransactionSchema = z.object({
  id: z.number(),
  type: z.enum(["earn", "redeem"]),
  points: z.number(),
  order_id: z.number().nullable(),
  wallet_transaction_id: z.number().nullable(),
  created_at: z.string(),
});
export type PointsTransaction = z.infer<typeof pointsTransactionSchema>;

export const pointsTransactionsResponseSchema = z.object({ balance: z.number(), count: z.number(), results: z.array(pointsTransactionSchema) });

export const pointsListItemSchema = z.object({
  customer_phone: z.string(),
  customer_name: z.string(),
  balance: z.number(),
  last_earn_at: z.string().nullable(),
  has_wallet: z.boolean(),
  wallet_id: z.number().nullable(),
});
export type PointsListItem = z.infer<typeof pointsListItemSchema>;
export const pointsListResponseSchema = z.object({ count: z.number(), results: z.array(pointsListItemSchema) });

/** Local forms. */
export const newWalletSchema = z.object({
  customer_phone: z.string().trim().min(9, "أدخل رقم هاتف صالحاً."),
  customer_name: z.string().trim().max(80).optional(),
});
export type NewWalletInput = z.infer<typeof newWalletSchema>;

export const topupSchema = z
  .object({
    amount: z.string().trim().regex(/^-?\d+(\.\d{1,2})?$/, "أدخل مبلغاً بخانتين عشريتين على الأكثر."),
    reason: z.enum(MANUAL_REASONS),
    note: z.string().trim().max(200).optional(),
  })
  .superRefine((v, ctx) => {
    const n = Number(v.amount);
    if (!Number.isFinite(n) || n === 0) ctx.addIssue({ code: "custom", path: ["amount"], message: "أدخل مبلغاً غير صفري." });
    if (n < 0 && v.reason !== "adjustment") ctx.addIssue({ code: "custom", path: ["amount"], message: "الخصم متاح فقط بسبب «تسوية»." });
    if (n < 0 && !v.note) ctx.addIssue({ code: "custom", path: ["note"], message: "الملاحظة مطلوبة عند الخصم." });
  });
export type TopupInput = z.infer<typeof topupSchema>;
