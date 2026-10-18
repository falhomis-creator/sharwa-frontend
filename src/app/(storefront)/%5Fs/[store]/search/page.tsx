import type { Metadata } from "next";
import { getStorefront } from "@/features/storefront/api/context";
import { HeaderSearch } from "@/features/storefront/components/header-search";
import { ProductListing } from "@/features/storefront/components/listing/product-listing";

/**
 * `/search?q=` (M09 US-09.3.2) — calls `?search=`. On phones this is the full-screen search
 * the bottom bar opens: the field is focused on arrival.
 */
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = { title: "البحث", robots: { index: false } };

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const ctx = await getStorefront(sp.currency);
  return (
    <main id="main" className="flex-1">
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-6 md:pt-8">
        <HeaderSearch key={q} initial={q} autoFocus={!q} className="md:max-w-xl" />
      </div>
      {q ? (
        <ProductListing ctx={ctx} path="/search" sp={sp} fixed={{ search: q }} title={`نتائج «${q}»`} emptyText={`لا منتجات تطابق «${q}»`} />
      ) : (
        <p className="mx-auto w-full max-w-7xl px-4 py-10 text-sm text-muted-foreground md:px-6">اكتب اسم منتج أو جزءاً منه، ثم اضغط إدخال.</p>
      )}
    </main>
  );
}
