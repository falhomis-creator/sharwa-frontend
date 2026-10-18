import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories } from "@/features/storefront/api/catalog";
import { getStorefront } from "@/features/storefront/api/context";
import { findCategory } from "@/features/storefront/category-tree";
import { Breadcrumb, ProductListing } from "@/features/storefront/components/listing/product-listing";

/**
 * `/c/[categoryId]` (M09 US-09.4): the category by its numeric id (Category has no slug —
 * M09 §10), its subcategories as chips, filters and server pagination in the URL.
 */
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function resolve(id: string) {
  const ctx = await getStorefront();
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return { ctx, hit: null };
  const tree = await getCategories(ctx.store, ctx.storeHost);
  return { ctx, hit: findCategory(tree, n) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { hit, ctx } = await resolve(id);
  if (!hit) return { title: "قسم غير موجود" };
  return { title: hit.node.name, description: `تسوّق ${hit.node.name} من ${ctx.config.store_name}.`, alternates: { canonical: `${ctx.storeOrigin}/c/${id}` } };
}

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { hit } = await resolve(id);
  if (!hit) notFound();
  const ctx = await getStorefront(sp.currency);
  return (
    <main id="main" className="flex-1">
      <ProductListing
        ctx={ctx}
        path={`/c/${id}`}
        sp={sp}
        fixed={{ category: id }}
        title={hit.node.name}
        subcategories={hit.node.subcategories}
        emptyText="لا منتجات في هذا التصنيف بعد"
        breadcrumb={<Breadcrumb items={[{ label: "الرئيسية", href: "/" }, ...hit.ancestors.map((a) => ({ label: a.name, href: `/c/${a.id}` })), { label: hit.node.name }]} />}
      />
    </main>
  );
}
