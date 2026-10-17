import { z } from "zod";

/** Verbatim from data-model.md (subscriptions app). */
export const PlanCurrencySchema = z.enum(["SAR", "USD", "YER_OLD", "YER_NEW"]);
export const BillingIntervalSchema = z.enum(["monthly", "yearly", "lifetime"]);

export const PublicPlanSchema = z.object({
  code: z.string(),
  name: z.string(),
  is_free: z.boolean(),
  /** Money arrives pre-formatted from Django; never a JS number. */
  price: z.string(),
  currency: PlanCurrencySchema,
  billing_interval: BillingIntervalSchema,
  max_products: z.number().nullable(),
  max_orders_per_month: z.number().nullable(),
  features: z.array(z.string()),
});

export const PublicPlansResponseSchema = z.object({
  subscriptions_enabled: z.boolean(),
  plans: z.array(PublicPlanSchema),
});

export type PublicPlan = z.infer<typeof PublicPlanSchema>;
export type PublicPlansResponse = z.infer<typeof PublicPlansResponseSchema>;
