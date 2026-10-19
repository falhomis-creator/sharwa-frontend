import { z } from "zod";

/**
 * M40 contracts (§7 — every row `[NEEDS BACKEND]`, the proposed `/api/v1/sharwa-pay/*`
 * shapes served by `/api/bff/sharwa-pay/*`). Balances arrive formatted per currency and are
 * shown as they are: four rows, never converted, never summed (FR-40.03, SC-40.3).
 */
export const PAY_CURRENCIES = ["SAR", "USD", "YER_OLD", "YER_NEW"] as const;
export type PayCurrency = (typeof PAY_CURRENCIES)[number];
export const CURRENCY_LABELS: Record<PayCurrency, string> = { SAR: "ريال سعودي", USD: "دولار أمريكي", YER_OLD: "ريال يمني (قديم)", YER_NEW: "ريال يمني (جديد)" };

export const REASONS = ["topup_manual", "topup_auto", "purchase", "purchase_refund", "withdrawal", "withdrawal_reversal", "platform_fee"] as const;
export type Reason = (typeof REASONS)[number];
export const REASON_LABELS: Record<Reason, string> = {
  topup_manual: "شحن بمراجعة",
  topup_auto: "شحن تلقائي (بنك)",
  purchase: "شراء",
  purchase_refund: "استرجاع شراء",
  withdrawal: "سحب",
  withdrawal_reversal: "استرجاع مبلغ سحب مرفوض",
  platform_fee: "رسوم المنصة",
};

export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
/** SC-40.5: the six labels — `approved` reads «مقبول» for a top-up and «مُنفَّذ» for a withdrawal. */
export const TOPUP_STATUS_LABELS: Record<RequestStatus, string> = { pending: "قيد المراجعة", approved: "مقبول", rejected: "مرفوض" };
export const WITHDRAWAL_STATUS_LABELS: Record<RequestStatus, string> = { pending: "قيد المراجعة", approved: "مُنفَّذ", rejected: "مرفوض" };

const currency = z.enum(PAY_CURRENCIES);

export const otpSentSchema = z.object({ ok: z.literal(true), phone: z.string(), expires_in: z.number() });
export const otpVerifiedSchema = z.object({ ok: z.literal(true), phone: z.string() });

export const walletSchema = z.object({
  customer_phone: z.string(),
  customer_name: z.string().nullable(),
  is_active: z.boolean(),
  exists: z.boolean().optional(),
  balances: z.array(z.object({ currency, display_balance: z.string(), balance: z.string().optional() })),
});
export type Wallet = z.infer<typeof walletSchema>;

export const transactionSchema = z.object({
  id: z.number(),
  transaction_type: z.enum(["credit", "debit"]),
  reason: z.enum(REASONS),
  display_amount: z.string(),
  currency,
  display_balance_after: z.string(),
  source_tenant_schema: z.string().nullable(),
  source_store_name: z.string().nullable(),
  source_store_available: z.boolean().optional(),
  source_order_id: z.number().nullable(),
  related_request: z.object({ kind: z.enum(["topup", "withdrawal"]), id: z.number() }).nullable().optional(),
  created_at: z.string(),
});
export type Transaction = z.infer<typeof transactionSchema>;
export const transactionListSchema = z.object({ count: z.number(), results: z.array(transactionSchema) });

export const requestsSchema = z.object({
  topups: z.array(z.object({ id: z.number(), display_amount: z.string(), currency, bank_transaction_id: z.string(), reference_note: z.string().optional(), status: z.enum(REQUEST_STATUSES), rejection_reason: z.string().nullable(), credited_at: z.string().nullable(), created_at: z.string() })),
  withdrawals: z.array(z.object({ id: z.number(), display_amount: z.string(), currency, payout_destination: z.string(), status: z.enum(REQUEST_STATUSES), rejection_reason: z.string().nullable(), created_at: z.string() })),
});
export type Requests = z.infer<typeof requestsSchema>;

export const topupCreatedSchema = z.object({ id: z.number(), status: z.literal("pending") });
export const withdrawalCreatedSchema = z.object({ id: z.number(), status: z.literal("pending"), display_balance_after: z.string() });

export const RECEIPT_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"] as const;
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
