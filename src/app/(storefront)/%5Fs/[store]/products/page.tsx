import type { Metadata } from "next";
import { getCategories } from "@/features/storefront/api/catalog";
import { getStorefront } from "@/features/storefront/api/context";
import { Breadcrumb, ProductListing } from "@/features/storefront/components/listing/product-listing";

/** `/products` — every product with the same filters and pagination (M09 §6). */
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getStorefront();
  return { title: "كل المنتجات", description: `كل منتجات ${ctx.config.store_name}.`, alternates: { canonical: `${ctx.storeOrigin}/products` } };
}

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const ctx = await getStorefront(sp.currency);
  const roots = await getCategories(ctx.store, ctx.storeHost);
  return (
    <main id="main" className="flex-1">
      <ProductListing
        ctx={ctx}
        path="/products"
        sp={sp}
        fixed={{}}
        title={sp.is_featured === "true" ? "المنتجات المميزة" : "كل المنتجات"}
        subcategories={roots}
        emptyText="لا منتجات في المتجر بعد"
        breadcrumb={<Breadcrumb items={[{ label: "الرئيسية", href: "/" }, { label: "كل المنتجات" }]} />}
      />
    </main>
  );
}
