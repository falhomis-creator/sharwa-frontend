import { z } from "zod";

/**
 * M17 — التسويق بالعمولة والمؤثرون (T145). Every row is `[NEEDS BACKEND]` (§7): the
 * proposed `/api/v1/{affiliates,influencers}/*` shapes, served today by `/api/bff/*` from
 * `src/mocks/affiliates`. Enum VALUES verbatim from discovery 02 §5; labels Arabic.
 * Money is always a server string (`display_*`) — no local sum, even in previews (FR-17.05).
 */
export const PARTNER_KINDS = ["affiliates", "influencers"] as const;
export type PartnerKind = (typeof PARTNER_KINDS)[number];
export const PARTNER_KIND_LABELS: Record<PartnerKind, { plural: string; one: string; feature: "affiliates" | "influencers"; path: string }> = {
  affiliates: { plural: "المسوّقون", one: "مسوّق", feature: "affiliates", path: "/dashboard/marketing/affiliates" },
  influencers: { plural: "المؤثرون", one: "مؤثر", feature: "influencers", path: "/dashboard/marketing/influencers" },
};

export const COMMISSION_TYPES = ["percent", "fixed"] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];
export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = { percent: "نسبة %", fixed: "مبلغ ثابت" };

export const PAYOUT_STATUSES = ["pending", "paid"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];
export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = { pending: "مستحقة", paid: "مدفوعة" };

/** The order behind a sale, when it moved after the sale was recorded (§8). */
export const SALE_ORDER_STATES = ["active", "cancelled", "refunded"] as const;
export type SaleOrderState = (typeof SALE_ORDER_STATES)[number];
export const SALE_ORDER_STATE_LABELS: Record<SaleOrderState, string> = { active: "", cancelled: "ملغي", refunded: "مسترد" };

const commission = {
  commission_type: z.enum(COMMISSION_TYPES),
  /** Percent as integer text («10»), fixed as a decimal text («15.00»). */
  commission_value: z.string(),
  /** «10%» or «15.00 ر.س» — formatted by the server (FR-17.04). */
  display_commission: z.string(),
};

export const affiliateSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  phone: z.string(),
  referral_code: z.string(),
  is_active: z.boolean(),
  ...commission,
  clicks_count: z.number().int(),
  sales_count: z.number().int(),
  display_sales_total: z.string(),
  display_pending: z.string(),
  display_paid: z.string(),
  has_pending: z.boolean(),
  last_sale_at: z.string().nullable(),
});
export type Affiliate = z.infer<typeof affiliateSchema>;

export const influencerCouponSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  used_count: z.number().int(),
  max_uses: z.number().int().nullable(),
  is_active: z.boolean(),
});
export type InfluencerCoupon = z.infer<typeof influencerCouponSchema>;

export const influencerSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  contact: z.string(),
  referral_code: z.string(),
  is_active: z.boolean(),
  ...commission,
  coupons: z.array(influencerCouponSchema),
  sales_count: z.number().int(),
  display_sales_total: z.string(),
  display_pending: z.string(),
  display_paid: z.string(),
  has_pending: z.boolean(),
  last_sale_at: z.string().nullable(),
});
export type Influencer = z.infer<typeof influencerSchema>;

export type Partner = (Affiliate & { kind: "affiliates" }) | (Influencer & { kind: "influencers" });

export const affiliateListSchema = z.array(affiliateSchema);
export const influencerListSchema = z.array(influencerSchema);

export const saleSchema = z.object({
  id: z.number().int(),
  order_id: z.number().int(),
  order_number: z.string(),
  order_state: z.enum(SALE_ORDER_STATES),
  /** Influencer sales only: which of the influencer's coupons brought it (§8). */
  coupon_code: z.string().nullable().optional(),
  display_order_total: z.string(),
  display_commission: z.string(),
  payout_status: z.enum(PAYOUT_STATUSES),
  paid_at: z.string().nullable(),
  created_at: z.string(),
});
export type Sale = z.infer<typeof saleSchema>;
export const saleListSchema = z.array(saleSchema);

/** `mark-paid` — with `dry_run` the server previews the count/total without writing (FR-17.06). */
export const markPaidResultSchema = z.object({ updated: z.number().int(), display_total: z.string(), dry_run: z.boolean().optional() });
export type MarkPaidResult = z.infer<typeof markPaidResultSchema>;

/** FR-17.09 — the text strip above the list. */
export const partnerSummarySchema = z.object({
  display_pending_total: z.string(),
  display_paid_this_month: z.string(),
  attributed_orders_30d: z.number().int(),
});
export type PartnerSummary = z.infer<typeof partnerSummarySchema>;

// ── Inputs (FR-17.07: the model's real fields only) ───────────────────────────────────
const commissionInput = {
  commission_type: z.enum(COMMISSION_TYPES),
  commission_value: z
    .string()
    .trim()
    .min(1, "أدخل قيمة العمولة.")
    .regex(/^\d+(\.\d{1,2})?$/, "قيمة غير صحيحة."),
};

function percentCap<T extends { commission_type: CommissionType; commission_value: string }>(v: T, ctx: z.RefinementCtx) {
  if (v.commission_type === "percent" && Number(v.commission_value) > 100) ctx.addIssue({ code: "custom", path: ["commission_value"], message: "النسبة بين 0 و100." });
  if (Number(v.commission_value) <= 0) ctx.addIssue({ code: "custom", path: ["commission_value"], message: "العمولة أكبر من صفر." });
}

export const affiliateInputSchema = z
  .object({
    name: z.string().trim().min(2, "أدخل اسم المسوّق."),
    phone: z
      .string()
      .trim()
      .regex(/^(967|966)\d{9}$/, "رقم هاتف بصيغة دولية (967… أو 966…)."),
    ...commissionInput,
  })
  .superRefine(percentCap);
export type AffiliateInput = z.infer<typeof affiliateInputSchema>;

export const influencerInputSchema = z
  .object({
    name: z.string().trim().min(2, "أدخل اسم المؤثر."),
    contact: z.string().trim().min(3, "أدخل وسيلة التواصل (حساب أو هاتف أو بريد)."),
    ...commissionInput,
  })
  .superRefine(percentCap);
export type InfluencerInput = z.infer<typeof influencerInputSchema>;

/** The share link (FR-17.03): the store's REAL origin + `?aff_id=`. */
export function referralLink(storeOrigin: string, code: string): string {
  return `${storeOrigin.replace(/\/$/, "")}/?aff_id=${encodeURIComponent(code)}`;
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
