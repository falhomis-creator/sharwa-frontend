import { z } from "zod";
import { CURRENCIES, currencySchema } from "@/lib/schemas/money";

/**
 * M36 — البيع بالجملة B2B (T169 · INT-044). The three draft rows are Django's:
 *   POST /api/v1/orders/b2b-draft/ · GET /api/v1/orders/b2b-drafts/ ·
 *   POST /api/v1/orders/b2b-draft/<approval_id>/resolve/
 * and go through the transparent `/api/v1/*` passthrough (fixtures only answer while
 * Django is unreachable). Since INT-044 the list carries `created_by_name` + `escalated_at`
 * (escalated first) and is open to approvers too. The form's choices come from
 * `/api/bff/b2b/options` → `GET /api/v1/orders/b2b-options/` (module `b2b`).
 * The browser NEVER sends a price (FR-36.01, SC-36.3): Django prices each line — the
 * quantity price (`ProductTierPrice`) when one applies, in the draft's currency.
 */
export const B2B_DECISIONS = ["approved", "rejected"] as const;
export type B2bDecision = (typeof B2B_DECISIONS)[number];
export const B2B_DECISION_LABELS: Record<B2bDecision, string> = { approved: "مقبول", rejected: "مرفوض" };

export { CURRENCIES as B2B_CURRENCIES };

export const b2bDraftSchema = z.object({
  id: z.number().int(),
  customer_name: z.string(),
  customer_phone: z.string(),
  /** Decimal text from `product.price` at creation — shown verbatim with its currency. */
  total_price: z.string(),
  currency: z.string(),
  created_at: z.string(),
  sales_channel: z.string(),
  /** `null` on legacy rows: read-only, no decision buttons (§8). */
  approval_id: z.number().int().nullable(),
  approval_version: z.number().int().nullable(),
  items_count: z.number().int(),
  // Optional extensions the fixture sends (proposed; absent fields hide their UI):
  created_by_name: z.string().nullable().optional(),
  escalated_at: z.string().nullable().optional(),
});
export type B2bDraft = z.infer<typeof b2bDraftSchema>;
export const b2bDraftListSchema = z.array(b2bDraftSchema);

export const b2bCreatedSchema = z.object({ detail: z.string(), order_id: z.number().int(), approval_id: z.number().int().nullable() });
export type B2bCreated = z.infer<typeof b2bCreatedSchema>;

export const b2bResolvedSchema = z.object({ detail: z.string(), decision: z.enum(B2B_DECISIONS) });

export const b2bOptionsSchema = z.object({
  roles: z.array(z.object({ id: z.number().int(), name: z.string() })),
  locations: z.array(z.object({ id: z.number().int(), name: z.string() })),
  /** Multi-branch store: `location_id` is required (US-36.1.2). */
  multi_location: z.boolean(),
  default_currency: currencySchema,
});
export type B2bOptions = z.infer<typeof b2bOptionsSchema>;

/** Client checks only; the server re-validates and its `detail` is shown verbatim (FR-36.02). */
export const b2bCustomerSchema = z.object({
  customer_name: z.string().trim().min(2, "أدخل اسم العميل."),
  customer_phone: z
    .string()
    .trim()
    .regex(/^(967|966)\d{9}$/, "رقم هاتف بصيغة دولية (967… أو 966…)."),
  address: z.string().trim().min(3, "أدخل عنوان العميل."),
});

export interface B2bLine {
  product_id: number;
  name: string;
  sku: string;
  /** Preview only («السعر النهائي من الخادم»). */
  display_price: string | null;
  quantity: number;
}
