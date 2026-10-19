import { z } from "zod";
import { displayMoney } from "@/lib/schemas/money";

/**
 * M43 contract — `GET /api/v1/merchant/stores/?from&to` (`[NEEDS BACKEND]`; Django has
 * `merchant_master_dashboard` as HTML only). Proposed shape of §7, plus `is_available`
 * (§8 «غير متاح»: provisioning or inactive) so the UI never infers it.
 *
 * Every number is a count or a server-formatted SAR string; totals come from the server
 * (FR-43.03 — never summed in the browser).
 */
export const rollupStoreSchema = z.object({
  name: z.string(),
  schema: z.string(),
  /** Primary domain, or `"#"` when the store has none (§8). */
  domain: z.string(),
  orders: z.number().int(),
  completed: z.number().int(),
  refunded: z.number().int(),
  display_revenue_sar: displayMoney,
  last_snapshot_date: z.string().nullable(),
  is_available: z.boolean(),
});
export type RollupStore = z.infer<typeof rollupStoreSchema>;

export const rollupSchema = z.object({
  has_account: z.boolean(),
  current_schema: z.string(),
  /** The effective range the server applied (default: the last 30 days). */
  from: z.string(),
  to: z.string(),
  stores: z.array(rollupStoreSchema),
  totals: z.object({
    orders: z.number().int(),
    completed: z.number().int(),
    refunded: z.number().int(),
    display_revenue_sar: displayMoney,
  }),
});
export type Rollup = z.infer<typeof rollupSchema>;

export const NO_DOMAIN = "#";
