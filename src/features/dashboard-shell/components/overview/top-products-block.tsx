import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import type { Overview } from "@/features/dashboard-shell/schemas";

/** «الأكثر مبيعاً» — 4 columns (M03 US-03.5), from `top_products_snapshot`. */
export function TopProductsBlock({ products }: { products: Overview["top_products"] }) {
  return (
    <section
      aria-labelledby="top-products-heading"
      className="flex flex-col rounded-lg border border-border lg:col-span-4"
    >
      <header className="border-b border-border px-4 py-3">
        <h2 id="top-products-heading" className="text-sm font-medium">
          الأكثر مبيعاً اليوم
        </h2>
      </header>

      {products.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">لا مبيعات اليوم بعد.</p>
      ) : (
        <ol className="flex flex-col">
          {products.map((product, index) => (
            <li
              key={product.id}
              className="flex min-h-11 items-center gap-3 border-b border-border px-4 py-2.5 text-sm last:border-0"
            >
              <Mono className="w-4 shrink-0 text-xs text-muted-foreground">{index + 1}</Mono>
              <span className="min-w-0 flex-1 truncate">{product.name}</span>
              <Mono className="shrink-0 text-xs text-muted-foreground">×{product.qty}</Mono>
              <Money value={product.display_revenue} className="shrink-0 text-sm" />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
