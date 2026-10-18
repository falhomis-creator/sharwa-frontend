"use client";

import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { ProductDetailSchema } from "@/features/storefront/schemas/catalog";
import { ProductCard, ProductGridSkeleton } from "@/features/storefront/components/product-card";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { useWishlistHydrated, useWishlistIds } from "@/stores/wishlist";

/**
 * The saved products, read one by one from the Ready detail endpoint (there is no batch
 * endpoint yet). A product that is no longer sold (404) silently drops out of the list.
 */
export function WishlistView() {
  const { store, currency } = useStorefront();
  const ids = useWishlistIds(store);
  const hydrated = useWishlistHydrated();
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: storeKey(store, "product", id, currency),
      queryFn: () => apiFetch(`/api/v1/catalog/products/${id}/`, ProductDetailSchema, { query: { currency } }),
      staleTime: 60_000,
    })),
  });

  if (!hydrated) return <ProductGridSkeleton count={4} />;
  if (ids.length === 0) {
    return (
      <div className="space-y-3" data-testid="wishlist-empty">
        <p className="text-sm text-muted-foreground">لم تحفظ منتجات بعد. اضغط «المفضلة» في صفحة أي منتج لتجده هنا.</p>
        <Link href="/products" className="store-link inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline">
          تصفّح المنتجات
        </Link>
      </div>
    );
  }
  if (queries.some((q) => q.isPending)) return <ProductGridSkeleton count={Math.min(ids.length, 8)} />;
  const products = queries.flatMap((q) => (q.data ? [q.data] : []));
  return (
    <ul className="grid grid-cols-2 gap-[var(--store-grid-gap)] sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
