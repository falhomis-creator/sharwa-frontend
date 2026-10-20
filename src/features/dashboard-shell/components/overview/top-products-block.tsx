import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import type { Overview } from "@/features/dashboard-shell/schemas";

/** «الأكثر مبيعاً» — 4 columns (M03 US-03.5), from `top_products_snapshot`. */
export function TopProductsBlock({ products }: { products: Overview["top_products"] }) {
  return (
    <section
      aria-labelledby="top-products-heading"
      className="surface-card flex flex-col overflow-hidden lg:col-span-4"
    >
      <header className="border-b border-border/60 px-6 pt-5 pb-4">
        <h2 id="top-products-heading" className="text-base font-semibold">
          الأكثر مبيعاً اليوم
        </h2>
      </header>

      {products.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">لا مبيعات اليوم بعد.</p>
      ) : (
        <ol className="flex flex-col px-6 py-2">
          {products.map((product, index) => (
            <li
              key={product.id}
              className="flex min-h-12 items-center gap-3 border-b border-border/60 py-3 text-sm last:border-0"
            >
              <Mono className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-ink">{index + 1}</Mono>
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
