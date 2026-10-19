import { z } from "zod";
import { currencyEnum, listOf } from "@/features/platform-admin/schemas/common";
import { COMMISSION_TYPES } from "@/features/platform-admin/schemas/billing";

/**
 * M45 dues (8 actions) and M20 Sharwa Pay approvals. Every amount is a server string
 * (`display_*`) and every total comes per currency from the server (FR-45.05, FR-20.04).
 */
export const DUE_STATUSES = ["pending", "collected", "waived"] as const;
export type DueStatus = (typeof DUE_STATUSES)[number];
export const DUE_STATUS_LABELS: Record<DueStatus, string> = { pending: "مستحقة", collected: "محصَّلة", waived: "مُعفاة" };

/** FR-45.03 — the only values a dues action may carry. */
export const DUE_ACTIONS = [
  "collect_commission",
  "waive_commission",
  "collect_charge",
  "waive_charge",
  "unwaive_charge",
  "generate_charge",
  "suspend_app",
  "reactivate_app",
] as const;
export type DueAction = (typeof DUE_ACTIONS)[number];

export const walletBalanceSchema = z.object({ currency: currencyEnum, display_balance: z.string() });

export const duesOverviewRowSchema = z.object({
  schema_name: z.string(),
  name: z.string(),
  merchant_phone: z.string().nullable(),
  snapshot: z.object({ date: z.string(), orders_count: z.number().int(), display_revenue_sar: z.string() }).nullable(),
  wallet: z.array(walletBalanceSchema).nullable(),
  pending_count: z.number().int(),
});
export type DuesOverviewRow = z.infer<typeof duesOverviewRowSchema>;
export const duesOverviewSchema = z.object({ period: z.string(), results: z.array(duesOverviewRowSchema) });

export const commissionSchema = z.object({
  id: z.number().int(),
  order_id: z.number().int(),
  plan_name_snapshot: z.string(),
  commission_type: z.enum(COMMISSION_TYPES),
  commission_value: z.string(),
  display_amount: z.string(),
  currency: currencyEnum,
  created_at: z.string(),
  /** `amount=0` with `commission_type='none'` → «إعفاء» only (M45 §8). */
  collectable: z.boolean(),
});
export type Commission = z.infer<typeof commissionSchema>;

export const chargeSchema = z.object({
  id: z.number().int(),
  installation_id: z.number().int(),
  app_code: z.string(),
  app_name_snapshot: z.string(),
  period_label: z.string(),
  display_price: z.string(),
  currency: currencyEnum,
  created_at: z.string(),
});
export type Charge = z.infer<typeof chargeSchema>;

export const uninvoicedSchema = z.object({
  installation_id: z.number().int(),
  app_code: z.string(),
  app_name: z.string(),
  period_label: z.string(),
  /** FR-45.08 — a charge for `(installation, period_label)` exists already. */
  already_generated: z.boolean(),
});

export const appInstallStateSchema = z.object({
  installation_id: z.number().int(),
  app_code: z.string(),
  app_name: z.string(),
  suspended_by_platform: z.boolean(),
  subscription_expires_at: z.string().nullable(),
  expired: z.boolean(),
});
export type AppInstallState = z.infer<typeof appInstallStateSchema>;

export const duesDetailSchema = z.object({
  schema_name: z.string(),
  name: z.string(),
  merchant_phone: z.string().nullable(),
  pending_commissions: z.array(commissionSchema),
  pending_charges: z.array(chargeSchema),
  uninvoiced: z.array(uninvoicedSchema),
  waived_charges: z.array(chargeSchema),
  installations: z.array(appInstallStateSchema),
  totals: z.array(z.object({ currency: currencyEnum, display_commissions: z.string(), display_charges: z.string() })),
  wallet: z.array(walletBalanceSchema).nullable(),
  snapshot: z.object({ date: z.string(), orders_count: z.number().int(), display_revenue_sar: z.string() }).nullable(),
  has_dues: z.boolean(),
});
export type DuesDetail = z.infer<typeof duesDetailSchema>;

export const dueActionInputSchema = z.object({
  action: z.enum(DUE_ACTIONS),
  record_id: z.number().int().optional(),
  app_code: z.string().optional(),
  installation_id: z.number().int().optional(),
});
export type DueActionInput = z.infer<typeof dueActionInputSchema>;

// ── Sharwa Pay ─────────────────────────────────────────────────────────────────────
export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const TOPUP_STATUS_LABELS: Record<RequestStatus, string> = { pending: "قيد المراجعة", approved: "مقبول", rejected: "مرفوض" };
export const WITHDRAWAL_STATUS_LABELS: Record<RequestStatus, string> = { pending: "قيد التنفيذ", approved: "مُنفَّذ", rejected: "مرفوض" };

export const topupSchema = z.object({
  id: z.number().int(),
  customer_phone: z.string(),
  customer_name: z.string().nullable(),
  amount: z.string(),
  display_amount: z.string(),
  currency: currencyEnum,
  bank_name: z.string(),
  bank_transaction_id: z.string(),
  receipt_image: z.string(),
  status: z.enum(REQUEST_STATUSES),
  note: z.string(),
  created_at: z.string(),
  decided_at: z.string().nullable(),
  decided_by: z.string().nullable(),
});
export type Topup = z.infer<typeof topupSchema>;
export const topupListSchema = listOf(topupSchema);

export const withdrawalSchema = z.object({
  id: z.number().int(),
  customer_phone: z.string(),
  customer_name: z.string().nullable(),
  amount: z.string(),
  display_amount: z.string(),
  currency: currencyEnum,
  destination: z.string(),
  status: z.enum(REQUEST_STATUSES),
  note: z.string(),
  created_at: z.string(),
  decided_at: z.string().nullable(),
  decided_by: z.string().nullable(),
});
export type Withdrawal = z.infer<typeof withdrawalSchema>;
export const withdrawalListSchema = listOf(withdrawalSchema);

export const WALLET_REASONS = ["topup_manual", "topup_auto", "purchase", "purchase_refund", "withdrawal", "withdrawal_reversal", "platform_fee"] as const;
export const WALLET_REASON_LABELS: Record<(typeof WALLET_REASONS)[number], string> = {
  topup_manual: "شحن يدوي",
  topup_auto: "شحن تلقائي",
  purchase: "شراء",
  purchase_refund: "استرداد شراء",
  withdrawal: "سحب",
  withdrawal_reversal: "إعادة سحب مرفوض",
  platform_fee: "رسوم المنصة",
};

export const walletDetailSchema = z.object({
  customer_phone: z.string(),
  customer_name: z.string().nullable(),
  is_merchant: z.boolean(),
  balances: z.array(walletBalanceSchema),
  transactions: z.array(
    z.object({
      id: z.number().int(),
      reason: z.enum(WALLET_REASONS),
      display_amount: z.string(),
      currency: currencyEnum,
      direction: z.enum(["credit", "debit"]),
      reference: z.string(),
      created_at: z.string(),
    }),
  ),
});
export type WalletDetail = z.infer<typeof walletDetailSchema>;
