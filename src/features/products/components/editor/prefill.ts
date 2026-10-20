import type { ProductDetail, ProductFormValues, ProductTemplate, ProductVariant, VariantAttribute } from "@/features/products/schemas";
import { EMPTY_PRODUCT_FORM, detailToForm } from "@/features/products/components/editor/form-mapping";

/**
 * Creation presets for M04 — «إنشاء من قالب» and «نسخ» (owner directive 2026-10-20,
 * benchmarked on Shopify / BigCommerce / Salla):
 *
 * - Both open the ordinary «منتج جديد» editor PRE-FILLED. Nothing is created until the
 *   merchant presses «حفظ» — no orphan «نسخة» rows when the merchant changes their mind.
 * - Duplicate copies everything that describes the product and drops what must be unique
 *   or is per-item reality: SKU, barcode, slug (regenerated), stock (starts at 0) and the
 *   publish date. The copy starts hidden from the store (`is_available: false`), like
 *   Shopify's «draft» duplicate, so it can be reviewed before it is live.
 * - A template fills ~90% of the form from its blueprint fields; the merchant adds name,
 *   price and media. The new product stays linked to the template (`blueprint_id`).
 *
 * The state lives in the URL (`?duplicate=<id>` / `?template=<id>`) so the flows deep-link,
 * survive a reload, and work from any screen through a plain `<Link>`.
 */
export const DUPLICATE_SUFFIX = " (نسخة)";
const DUPLICATE_SUFFIX_EN = " (Copy)";
const NAME_MAX = 200;

export const newProductHref = "/dashboard/products/new";
export const duplicateProductHref = (id: number) => `${newProductHref}?duplicate=${id}`;
export const productFromTemplateHref = (id: number) => `${newProductHref}?template=${id}`;

export type EditorSeed =
  | { kind: "duplicate"; source: ProductDetail; form: ProductFormValues }
  | { kind: "template"; template: ProductTemplate; form: ProductFormValues; filled: number };

function withSuffix(name: string, suffix: string): string {
  if (!name.trim()) return "";
  return `${name.slice(0, NAME_MAX - suffix.length)}${suffix}`;
}

/** What a duplicate carries over (shown to the merchant in the editor banner). */
export const DUPLICATE_CARRIED = "الوصف والأسعار والتصنيف والوسوم والمجموعات والشحن وSEO والمتغيرات وأسعارها";
export const DUPLICATE_RESET = "SKU والباركود والرابط والمخزون (يبدأ من 0) وصور المعرض";

export function duplicateForm(source: ProductDetail): ProductFormValues {
  const base = detailToForm(source);
  return {
    ...base,
    name: withSuffix(base.name, DUPLICATE_SUFFIX),
    name_en: withSuffix(base.name_en, DUPLICATE_SUFFIX_EN),
    slug: "",
    sku: "",
    barcode: "",
    stock: "0",
    published_at: "",
    is_available: false,
    // A meta title that only repeated the old name would now be a duplicate title in search.
    meta_title: base.meta_title === source.name ? "" : base.meta_title,
  };
}

/**
 * Template blueprint → form values. Only keys the editor knows are taken; booleans stay
 * booleans, everything else becomes the text the inputs expect.
 */
export function templateForm(template: ProductTemplate): { form: ProductFormValues; filled: number } {
  const form: ProductFormValues = { ...EMPTY_PRODUCT_FORM };
  const target = form as unknown as Record<string, unknown>;
  let filled = 0;
  for (const [key, value] of Object.entries(template.fields)) {
    if (!(key in EMPTY_PRODUCT_FORM) || key === "name" || key === "sku" || key === "slug") continue;
    const current = target[key];
    if (typeof current === "boolean") target[key] = Boolean(value);
    else if (Array.isArray(current)) continue;
    else target[key] = value === null || value === undefined ? "" : String(value);
    filled += 1;
  }
  return { form, filled };
}

/** The template link the new product keeps — the template's own, or the source product's. */
export function seedBlueprintId(seed: EditorSeed | null): number | null {
  if (!seed) return null;
  return seed.kind === "template" ? seed.template.id : seed.source.blueprint_id;
}

/**
 * The generate request that rebuilds the source's variant set on the copy: the same
 * attributes and values, minus every combination the source did not have.
 */
export function variantCopyPlan(source: ProductDetail, attributes: VariantAttribute[]) {
  if (source.variants.length === 0 || source.variant_attribute_ids.length === 0) return null;
  const used = new Set(source.variants.flatMap((v) => v.option_ids));
  const groups = source.variant_attribute_ids
    .map((id) => attributes.find((a) => a.id === id))
    .filter((a): a is VariantAttribute => Boolean(a))
    .map((a) => a.options.filter((o) => used.has(o.id)).map((o) => o.id))
    .filter((g) => g.length > 0);
  if (groups.length === 0) return null;
  const key = (combo: number[]) => [...combo].sort((a, b) => a - b).join(",");
  const present = new Set(source.variants.map((v) => key(v.option_ids)));
  const all = groups.reduce<number[][]>((acc, g) => acc.flatMap((c) => g.map((o) => [...c, o])), [[]]);
  return {
    request: {
      attribute_ids: source.variant_attribute_ids,
      option_ids: [...used],
      exclude: all.filter((c) => !present.has(key(c))),
    },
    /** Extra price per option combination, applied to the generated rows. */
    extraPrice: new Map(source.variants.map((v) => [key(v.option_ids), v.extra_price])),
    key,
  };
}

export function variantPriceRows(
  generated: ProductVariant[],
  plan: NonNullable<ReturnType<typeof variantCopyPlan>>,
): Array<{ id: number; extra_price: string }> {
  return generated
    .map((v) => ({ id: v.id, extra_price: plan.extraPrice.get(plan.key(v.option_ids)) ?? "0.00" }))
    .filter((r) => Number(r.extra_price) !== 0);
}
