import type { ProductDetail, ProductVariant, VariantAttribute } from "@/features/storefront/schemas/catalog";

/**
 * Three-tier variant resolution (M10 US-10.2, FR-10.03) — pure, so the price/stock/image
 * update is instant (< 100 ms, no request — SC-10.2). An option is DISABLED (not hidden) when
 * no in-stock variant combines it with the other choices already made.
 */
export function resolveVariant(variants: ProductVariant[], attributes: VariantAttribute[], selected: Record<number, number>): ProductVariant | null {
  if (attributes.length === 0 || attributes.some((a) => selected[a.id] === undefined)) return null;
  const chosen = attributes.map((a) => selected[a.id]!);
  return variants.find((v) => chosen.every((o) => v.option_ids.includes(o)) && v.option_ids.length === chosen.length) ?? null;
}

export interface OptionState {
  available: boolean;
  /** Why it is disabled, in the buyer's words («غير متوفر بهذا اللون»). */
  reason: string | null;
}

export function optionState(
  product: Pick<ProductDetail, "allow_backorder">,
  variants: ProductVariant[],
  attributes: VariantAttribute[],
  selected: Record<number, number>,
  attribute: VariantAttribute,
  optionId: number,
): OptionState {
  const others = attributes.filter((a) => a.id !== attribute.id && selected[a.id] !== undefined);
  const matches = variants.filter((v) => v.option_ids.includes(optionId) && others.every((a) => v.option_ids.includes(selected[a.id]!)));
  const sellable = matches.some((v) => v.stock > 0 || product.allow_backorder);
  if (sellable) return { available: true, reason: null };
  if (matches.length === 0 && others.length === 0) return { available: false, reason: "غير متوفر" };
  const other = others[0];
  const otherValue = other?.options.find((o) => o.id === selected[other.id])?.value;
  return { available: false, reason: other ? `غير متوفر مع ${other.name} «${otherValue ?? ""}»` : "نفدت الكمية" };
}

export function variantLabel(attributes: VariantAttribute[], variant: ProductVariant | null): string | null {
  if (!variant) return null;
  return attributes
    .map((a) => a.options.find((o) => variant.option_ids.includes(o.id))?.value)
    .filter(Boolean)
    .join(" / ");
}

/** The variant the URL's `?v=` names, turned back into choices. */
export function selectionFromVariant(attributes: VariantAttribute[], variant: ProductVariant | undefined): Record<number, number> {
  if (!variant) return {};
  const out: Record<number, number> = {};
  for (const a of attributes) {
    const o = a.options.find((x) => variant.option_ids.includes(x.id));
    if (o) out[a.id] = o.id;
  }
  return out;
}

/** The tier that applies to `quantity` (largest `min_quantity` ≤ quantity). */
export function activeTier<T extends { min_quantity: number }>(tiers: T[], quantity: number): T | null {
  return [...tiers].sort((a, b) => b.min_quantity - a.min_quantity).find((t) => quantity >= t.min_quantity) ?? null;
}
