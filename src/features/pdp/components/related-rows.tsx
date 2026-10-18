import type { ProductDetail } from "@/features/storefront/schemas/catalog";
import { ProductCard } from "@/features/storefront/components/product-card";

/**
 * «قد يعجبك» / «الأفضل منه» / «يُكمِله» (M10 US-10.7.1) — the SAME card as M09, horizontal
 * rails on phones; an empty row is not rendered.
 */
const ROWS = [
  { key: "related", title: "قد يعجبك" },
  { key: "upsell", title: "الأفضل منه" },
  { key: "cross_sell", title: "يُكمِله" },
] as const;

export function RelatedRows({ related }: { related: ProductDetail["related"] }) {
  if (!related) return null;
  return (
    <>
      {ROWS.map(({ key, title }) => {
        const items = related[key] ?? [];
        if (items.length === 0) return null;
        return (
          <section key={key} aria-label={title} className="space-y-4 border-t border-border pt-8" data-testid={`related-${key}`}>
            <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
            <ul className="store-rail -mx-4 flex gap-[var(--store-grid-gap)] overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
              {items.slice(0, 8).map((p) => (
                <li key={p.id} className="w-[46%] shrink-0 md:w-auto">
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
