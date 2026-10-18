import { z } from "zod";
import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@/lib/schemas/money";

/**
 * M14 — payment gateways, Sharwa Pay / manual payment switches, payout accounts, the
 * merchant wallet (four currencies, never summed), withdrawals and platform dues.
 * FR-14.01: no schema here carries a secret value — only `has_credentials`, the field
 * descriptors and the server's short mask (`masked_hint`).
 */
export { CURRENCIES, CURRENCY_LABELS, type Currency };

/** Short labels for the dense balance rows (M14 US-14.4 acceptance 1). */
export const CURRENCY_SHORT: Record<Currency, string> = {
  SAR: "ريال سعودي",
  USD: "دولار أمريكي",
  YER_OLD: "يمني صنعاء",
  YER_NEW: "يمني عدن",
};

// ── Gateways ─────────────────────────────────────────────────────────────────────────
export const gatewayFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  is_secret: z.boolean(),
  required: z.boolean(),
  /** «••••7f2a» for a stored secret; null when nothing is stored. */
  masked_hint: z.string().nullable().optional(),
  /** The current value of a NON-secret field (read-only display); always null for secrets. */
  value: z.string().nullable().optional(),
});
export type GatewayField = z.infer<typeof gatewayFieldSchema>;

export const gatewaySchema = z.object({
  gateway_code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  is_enabled: z.boolean(),
  has_credentials: z.boolean(),
  updated_at: z.string().nullable().optional(),
  fields: z.array(gatewayFieldSchema),
});
export type Gateway = z.infer<typeof gatewaySchema>;
export const gatewaysResponseSchema = z.array(gatewaySchema);

export type GatewayState = "unlinked" | "linked_disabled" | "linked_enabled";
export function gatewayState(g: Pick<Gateway, "has_credentials" | "is_enabled">): GatewayState {
  if (!g.has_credentials) return "unlinked";
  return g.is_enabled ? "linked_enabled" : "linked_disabled";
}
export const GATEWAY_STATE_LABELS: Record<GatewayState, string> = {
  unlinked: "غير مربوطة",
  linked_disabled: "مربوطة — معطّلة",
  linked_enabled: "مربوطة — مفعّلة",
};

// ── Store switches ───────────────────────────────────────────────────────────────────
export const storePaymentsSchema = z.object({
  enable_sharwa_pay: z.boolean(),
  enable_manual_payment: z.boolean(),
  active_payout_accounts: z.number(),
});
export type StorePayments = z.infer<typeof storePaymentsSchema>;

// ── Payout accounts ──────────────────────────────────────────────────────────────────
export const ACCOUNT_TYPES = ["bank", "wallet"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = { bank: "بنك", wallet: "محفظة" };
export const ACCOUNT_TAB_LABELS: Record<AccountType, string> = { bank: "الحسابات البنكية", wallet: "المحافظ المحلية" };

export const payoutAccountSchema = z.object({
  id: z.number(),
  account_type: z.enum(ACCOUNT_TYPES),
  provider_name: z.string(),
  account_number: z.string(),
  account_name: z.string(),
  is_active: z.boolean(),
  sort_order: z.number(),
});
export type PayoutAccount = z.infer<typeof payoutAccountSchema>;
export const payoutAccountsResponseSchema = z.object({
  count: z.number(),
  counts: z.object({ bank: z.number(), wallet: z.number() }),
  results: z.array(payoutAccountSchema),
});
export type PayoutAccountsResponse = z.infer<typeof payoutAccountsResponseSchema>;

export const payoutAccountInputSchema = z.object({
  account_type: z.enum(ACCOUNT_TYPES),
  provider_name: z.string().trim().min(1, "اكتب اسم البنك أو المحفظة.").max(80, "80 حرفاً على الأكثر."),
  account_number: z
    .string()
    .trim()
    .min(4, "أدخل رقم الحساب أو الآيبان.")
    .max(40, "40 خانة على الأكثر.")
    .regex(/^[A-Za-z0-9 -]+$/, "أرقام وحروف لاتينية فقط."),
  account_name: z.string().trim().min(2, "اكتب اسم صاحب الحساب.").max(120, "120 حرفاً على الأكثر."),
  is_active: z.boolean(),
});
export type PayoutAccountInput = z.infer<typeof payoutAccountInputSchema>;

// ── Wallet ───────────────────────────────────────────────────────────────────────────
export const walletBalanceSchema = z.object({
  currency: z.enum(CURRENCIES),
  display_balance: z.string(),
  display_available: z.string(),
  /** Decimal string of the available amount — only for the local «≤ المتاح» check (FR-14.04). */
  available: z.string(),
  display_reserved: z.string(),
  pending_withdrawals: z.number(),
});
export type WalletBalance = z.infer<typeof walletBalanceSchema>;
export const walletSchema = z.object({ balances: z.array(walletBalanceSchema), updated_at: z.string() });
export type MerchantWallet = z.infer<typeof walletSchema>;

export const TRANSACTION_TYPES = ["order_payment", "refund", "commission", "withdrawal", "adjustment"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  order_payment: "تحصيل طلب",
  refund: "استرجاع",
  commission: "عمولة المنصة",
  withdrawal: "سحب",
  adjustment: "تسوية",
};

export const REFERENCE_KINDS = ["order", "commission", "withdrawal"] as const;
export const referenceSchema = z.object({ kind: z.enum(REFERENCE_KINDS), id: z.number(), label: z.string() }).nullable();

export const walletTransactionSchema = z.object({
  id: z.number(),
  type: z.enum(TRANSACTION_TYPES),
  currency: z.enum(CURRENCIES),
  reason: z.string(),
  reference: referenceSchema,
  /** Signed decimal — only its sign is read (colour); the display string is shown as is. */
  amount: z.string(),
  display_amount: z.string(),
  display_balance_after: z.string(),
  created_at: z.string(),
});
export type WalletTransaction = z.infer<typeof walletTransactionSchema>;
export const walletTransactionsResponseSchema = z.object({ count: z.number(), results: z.array(walletTransactionSchema) });

// ── Withdrawals ──────────────────────────────────────────────────────────────────────
export const WITHDRAWAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];
export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = { pending: "قيد المراجعة", approved: "مُنفَّذ", rejected: "مرفوض" };
export const WITHDRAWAL_STATUS_TONE: Record<WithdrawalStatus, { dot: string; text: string }> = {
  pending: { dot: "bg-warning", text: "text-warning" },
  approved: { dot: "bg-success", text: "text-success" },
  rejected: { dot: "bg-destructive", text: "text-destructive" },
};

export const withdrawalSchema = z.object({
  id: z.number(),
  currency: z.enum(CURRENCIES),
  amount: z.string(),
  display_amount: z.string(),
  status: z.enum(WITHDRAWAL_STATUSES),
  payout_account: z.object({ id: z.number(), label: z.string(), account_number: z.string() }),
  created_at: z.string(),
  decided_at: z.string().nullable(),
  rejection_reason: z.string().nullable(),
});
export type Withdrawal = z.infer<typeof withdrawalSchema>;
export const withdrawalsResponseSchema = z.object({ count: z.number(), results: z.array(withdrawalSchema) });
export const withdrawalCreatedSchema = z.object({ id: z.number(), status: z.enum(WITHDRAWAL_STATUSES) });

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
export const withdrawalInputSchema = z.object({
  currency: z.enum(CURRENCIES),
  amount: z
    .string()
    .trim()
    .regex(AMOUNT_RE, "أدخل مبلغاً بخانتين عشريتين على الأكثر (مثال: 250.00).")
    .refine((v) => Number(v) > 0, "المبلغ يجب أن يكون أكبر من صفر."),
  payout_account_id: z.string().min(1, "اختر حساب الاستلام."),
});
export type WithdrawalInput = z.infer<typeof withdrawalInputSchema>;

// ── Dues ─────────────────────────────────────────────────────────────────────────────
export const DUE_KINDS = ["commission", "app_charge"] as const;
export type DueKind = (typeof DUE_KINDS)[number];
export const DUE_KIND_LABELS: Record<DueKind, string> = { commission: "العمولات", app_charge: "رسوم التطبيقات" };
export const DUE_STATUSES = ["pending", "collected", "waived"] as const;
export type DueStatus = (typeof DUE_STATUSES)[number];
export const DUE_STATUS_LABELS: Record<DueStatus, string> = { pending: "مستحق", collected: "محصَّل", waived: "مُعفى" };
export const DUE_STATUS_TONE: Record<DueStatus, { dot: string; text: string }> = {
  pending: { dot: "bg-warning", text: "text-warning" },
  collected: { dot: "bg-success", text: "text-muted-foreground" },
  waived: { dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

export const dueSchema = z.object({
  id: z.number(),
  kind: z.enum(DUE_KINDS),
  status: z.enum(DUE_STATUSES),
  title: z.string(),
  detail: z.string().nullable(),
  reference: referenceSchema,
  display_amount: z.string(),
  created_at: z.string(),
  settled_at: z.string().nullable(),
});
export type Due = z.infer<typeof dueSchema>;
export const duesResponseSchema = z.object({
  commission_enabled: z.boolean(),
  totals: z.object({ pending: z.string(), collected: z.string(), waived: z.string() }),
  counts: z.object({ pending: z.number(), collected: z.number(), waived: z.number() }),
  count: z.number(),
  results: z.array(dueSchema),
});
export type DuesResponse = z.infer<typeof duesResponseSchema>;
