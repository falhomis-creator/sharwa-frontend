import type { Currency } from "@/lib/schemas/money";
import { getProducts } from "@/features/storefront/api/catalog";
import type { SectionView } from "@/features/storefront/schemas/config";
import type { ProductQuery } from "@/features/storefront/schemas/catalog";
import { ProductGrid, ProductGridSkeleton } from "@/features/storefront/components/product-card";
import { SectionShell } from "@/features/storefront-home/components/section-shell";

/**
 * The three product sections (US-09.1.1/2), each one `GET /catalog/products/` call:
 *   - `featured_products` → `?is_featured=true&page_size=<limit>`
 *   - `latest_products`   → `?page_size=<limit>` (server's default order = newest first, M09 §10)
 *   - `product_grid`      → `?category=<id>&page_size=<limit>`; zero results (a deleted
 *     category) hides the WHOLE section, never an orphan heading (M09 §8).
 */
interface Ctx {
  store: string;
  storeHost: string;
  currency: Currency;
}

const DEFAULT_TITLES = {
  featured_products: "منتجات مميزة",
  latest_products: "أحدث المنتجات",
  product_grid: "منتجات",
} as const;

export async function ProductsSection({
  view,
  ctx,
  kind,
  priorityCount = 0,
}: {
  view: SectionView;
  ctx: Ctx;
  kind: "featured_products" | "latest_products" | "product_grid";
  priorityCount?: number;
}) {
  if (kind === "product_grid" && !view.categoryId) return null;
  const query: ProductQuery = { page_size: String(view.limit) };
  if (kind === "featured_products") query.is_featured = "true";
  if (kind === "product_grid") query.category = String(view.categoryId);
  const result = await getProducts(ctx.store, ctx.storeHost, query, ctx.currency);
  if (!result.ok || result.page.results.length === 0) return null;
  const href =
    kind === "featured_products" ? "/products?is_featured=true" : kind === "product_grid" ? `/c/${view.categoryId}` : "/products";
  return (
    <SectionShell id={view.id} title={view.title ?? DEFAULT_TITLES[kind]} href={href} showOnMobile={view.showOnMobile} testId={`section-${kind}`}>
      <ProductGrid products={result.page.results} priorityCount={priorityCount} />
    </SectionShell>
  );
}

export function ProductsSectionSkeleton({ view, count }: { view: SectionView; count: number }) {
  return (
    <SectionShell id={view.id} title={view.title ?? " "} showOnMobile={view.showOnMobile}>
      <ProductGridSkeleton count={Math.min(count, 8)} />
    </SectionShell>
  );
}
