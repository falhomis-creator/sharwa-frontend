import Link from "next/link";
import { Money } from "@/components/shared/money";
import { cn } from "@/lib/utils";
import { PAYMENT_POLICY_LABELS } from "@/features/products/schemas/enums";
import { cardImage, categoryLabel, type ProductCard as Card } from "@/features/storefront/schemas/catalog";
import { ProductImage } from "@/features/storefront/components/product-image";

/**
 * THE product card (FR-09.08): one component for every section, listing, search result and
 * the related rows of M10. Separation is a 1px border in the merchant's `card_border_color`
 * (`border-border`), badges are text, «شحن مجاني» is emerald TEXT (US-09.5.4) — no fill, no
 * shadow. Prices are the server's `display_*` strings, Mono, never re-formatted (FR-09.06).
 *
 * Until Django exports `badges` on list items, «نفدت الكمية» and «تخفيض» are derived here
 * from `stock` and `display_old_price` (M09 §7); merchant badges show when present.
 */
export function ProductCard({ product, priority = false, className }: { product: Card; priority?: boolean; className?: string }) {
  const out = product.stock <= 0;
  const onSale = Boolean(product.display_old_price);
  const category = categoryLabel(product.category);
  const merchantBadges = (product.badges ?? []).filter((b) => b.name !== "نفدت الكمية" && b.name !== "تخفيض");

  return (
    <article
      data-testid="product-card"
      className={cn(
        "store-frame group relative flex h-full flex-col overflow-hidden rounded-lg border-border bg-card transition-colors hover:border-foreground/30",
        className,
      )}
    >
      <Link href={`/p/${product.id}`} className="flex h-full flex-col focus-visible:outline-none" prefetch={false}>
        <ProductImage src={cardImage(product)} alt={product.name} priority={priority} dimmed={out} />
        <div className="flex flex-1 flex-col gap-1.5 p-3 md:p-4">
          {(out || onSale || merchantBadges.length > 0) && (
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
              {out && <li className="text-destructive">نفدت الكمية</li>}
              {onSale && !out && <li className="text-foreground">تخفيض</li>}
              {merchantBadges.slice(0, 2).map((b) => (
                <li key={b.name} className="inline-flex items-center gap-1.5 text-muted-foreground">
                  {/* The merchant's badge colour is DATA: a 6px dot, never a fill. */}
                  {b.color ? <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: b.color }} /> : null}
                  {b.name}
                </li>
              ))}
            </ul>
          )}
          <h3 className="line-clamp-2 text-sm font-medium leading-6 text-foreground md:text-[0.95rem]">{product.name}</h3>
          {category ? <p className="text-xs text-muted-foreground">{category}</p> : null}
          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-1">
            {onSale ? (
              <span className="text-xs text-muted-foreground line-through decoration-1">
                <Money value={product.display_old_price} muted />
              </span>
            ) : null}
            <Money value={product.display_price} className="text-[0.95rem] font-semibold text-foreground" />
          </div>
          <div className="flex flex-col gap-0.5 text-xs">
            {product.is_free_shipping ? <span className="text-success">شحن مجاني</span> : null}
            <span className="text-muted-foreground">{PAYMENT_POLICY_LABELS[product.payment_policy]}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

/** Two columns on phones, three on tablets, four on desktop; the gap follows the preset's density. */
export function ProductGrid({
  products,
  priorityCount = 0,
  className,
}: {
  products: Card[];
  priorityCount?: number;
  className?: string;
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-[var(--store-grid-gap)] sm:grid-cols-3 lg:grid-cols-4", className)}>
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-[var(--store-grid-gap)] sm:grid-cols-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="store-frame overflow-hidden rounded-lg border-border">
          <div className="aspect-square w-full animate-pulse bg-muted" />
          <div className="space-y-2 p-3 md:p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
