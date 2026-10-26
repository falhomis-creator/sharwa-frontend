import { z } from "zod";

/**
 * M37 (bundles, compatibility, personalization, auction, serials, formula preview) and
 * M36 (quantity prices) — the editor's sub-resources under `/api/v1/products/<id>/…`
 * (Django: `api/views_product_extras.py` INT-045 · `api/views_b2b.py` INT-044). Every derived
 * amount is the server's `display_*` (FR-37.02).
 */
export const tierPriceSchema = z.object({ id: z.number().int(), min_quantity: z.number().int(), price: z.string(), display_price: z.string() });
export type TierPriceRow = z.infer<typeof tierPriceSchema>;
export const tierPricesSchema = z.array(tierPriceSchema);

export const bundleComponentSchema = z.object({
  id: z.number().int(),
  component_id: z.number().int(),
  name: z.string(),
  sku: z.string(),
  quantity: z.string(),
  is_optional: z.boolean(),
  stock: z.string(),
  display_price: z.string(),
});
export type BundleComponentRow = z.infer<typeof bundleComponentSchema>;
export const bundleViewSchema = z.object({ results: z.array(bundleComponentSchema), display_build_fee: z.string().nullable(), display_bundle_total: z.string() });

export const COMPAT_OPERATORS = ["equals", "not_equals", "in"] as const;
export const COMPAT_OPERATOR_LABELS: Record<(typeof COMPAT_OPERATORS)[number], string> = { equals: "يساوي", not_equals: "لا يساوي", in: "ضمن القيم" };
export const compatRuleSchema = z.object({
  id: z.number().int(),
  attribute_a_id: z.number().int(),
  attribute_a_name: z.string().nullable(),
  operator: z.enum(COMPAT_OPERATORS),
  attribute_b_id: z.number().int().nullable(),
  attribute_b_name: z.string().nullable(),
  value: z.string().nullable(),
});
export type CompatRuleRow = z.infer<typeof compatRuleSchema>;
export const compatRulesSchema = z.array(compatRuleSchema);

export const PERSONALIZATION_TYPES = ["text", "textarea", "number", "select", "multi_select", "date", "checkbox", "file", "image"] as const;
export type PersonalizationType = (typeof PERSONALIZATION_TYPES)[number];
export const PERSONALIZATION_TYPE_LABELS: Record<PersonalizationType, string> = {
  text: "نص قصير",
  textarea: "نص طويل",
  number: "رقم",
  select: "قائمة منسدلة",
  multi_select: "اختيار متعدد",
  date: "تاريخ",
  checkbox: "خيار نعم/لا",
  file: "ملف مرفق",
  image: "صورة",
};
export const personalizationFieldSchema = z.object({
  id: z.number().int(),
  label: z.string(),
  field_type: z.enum(PERSONALIZATION_TYPES),
  price_add: z.string().nullable(),
  display_price_add: z.string().nullable(),
  is_required: z.boolean(),
  options_csv: z.string(),
  sort_order: z.number().int(),
});
export type PersonalizationFieldRow = z.infer<typeof personalizationFieldSchema>;
export const personalizationFieldsSchema = z.array(personalizationFieldSchema);

export const AUCTION_STATUSES = ["draft", "active", "ended"] as const;
export const AUCTION_STATUS_LABELS: Record<(typeof AUCTION_STATUSES)[number], string> = { draft: "مسودة", active: "نشط", ended: "منتهٍ" };
export const auctionSettingsSchema = z.object({
  status: z.enum(AUCTION_STATUSES),
  start_bid: z.string(),
  bid_step: z.string(),
  reserve: z.string().nullable(),
  buy_now: z.string().nullable(),
  end_at: z.string().nullable(),
  anti_sniping_seconds: z.number().int(),
  bids_count: z.number().int(),
  display_highest_bid: z.string().nullable(),
  reserve_met: z.boolean().nullable(),
});
export type AuctionSettings = z.infer<typeof auctionSettingsSchema>;
export const auctionBidsSchema = z.array(z.object({ bidder_name: z.string(), bidder_phone: z.string(), display_amount: z.string(), created_at: z.string() }));

export const SERIAL_STATUS_LABELS = { available: "متاح", reserved: "محجوز", sold: "مُباع" } as const;
export const serialsSchema = z.object({
  counts: z.object({ available: z.number().int(), reserved: z.number().int(), sold: z.number().int() }),
  results: z.array(z.object({ code: z.string(), status: z.enum(["available", "reserved", "sold"]) })),
  stock: z.string(),
});
export type Serials = z.infer<typeof serialsSchema>;

export const formulaPreviewSchema = z.object({ price: z.string(), display_price: z.string(), expression: z.string() });

// ── Local checks (before any request) ────────────────────────────────────────────────
/** US-36.3.2 — two rows with the same threshold cannot be saved. */
export function duplicateTier(rows: Array<{ min_quantity: number }>, next: number): boolean {
  return rows.some((r) => r.min_quantity === next);
}

/** US-37.4.3 — duplicates inside the paste AND against existing codes, highlighted locally. */
export function duplicateSerials(pasted: string[], existing: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const c of pasted) {
    if (seen.has(c) || existing.includes(c)) dup.add(c);
    seen.add(c);
  }
  return [...dup];
}

export function splitCodes(raw: string): string[] {
  return raw
    .split(/[\s,،;]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}
