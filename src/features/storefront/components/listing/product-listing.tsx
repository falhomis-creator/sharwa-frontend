import Link from "next/link";
import { redirect } from "next/navigation";
import { Mono } from "@/components/shared/mono";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getFacets, getProducts } from "@/features/storefront/api/catalog";
import type { StorefrontContext } from "@/features/storefront/api/context";
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX, type CategoryNode, type ProductQuery } from "@/features/storefront/schemas/catalog";
import { JsonLd } from "@/features/storefront/components/json-ld";
import { ProductGrid } from "@/features/storefront/components/product-card";
import { ClearFiltersButton, FiltersDrawerButton, FiltersPanel, SortSelect } from "@/features/storefront/components/listing/filters";

/**
 * Category / all-products / search listing (M09 US-09.4): server-paginated `GET
 * /catalog/products/`, `count` as «48 منتجاً» in Mono, subcategories as chips above the
 * filters, filters beside the grid (drawer on phones). A page past the end (404 from the
 * server) redirects to the last page with the URL corrected (M09 §8).
 */
type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function listingQuery(sp: SearchParams, fixed: ProductQuery = {}): ProductQuery {
  const q: ProductQuery = { ...fixed };
  for (const key of ["brand", "tag", "collection", "is_featured", "ordering"] as const) {
    const v = one(sp[key]);
    if (v && /^[-\w]+$/.test(v)) q[key] = v;
  }
  const page = Number(one(sp.page));
  if (Number.isInteger(page) && page > 1) q.page = String(page);
  const size = Number(one(sp.page_size));
  if (Number.isInteger(size) && size > 0) q.page_size = String(Math.min(PAGE_SIZE_MAX, size));
  return q;
}

function pageHref(path: string, sp: SearchParams, page: number): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const value = one(v);
    if (value && k !== "page") next.set(k, value);
  }
  if (page > 1) next.set("page", String(page));
  const qs = next.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function ProductListing({
  ctx,
  path,
  sp,
  fixed,
  title,
  subcategories = [],
  breadcrumb,
  emptyText,
}: {
  ctx: StorefrontContext;
  path: string;
  sp: SearchParams;
  fixed: ProductQuery;
  title: string;
  subcategories?: CategoryNode[];
  breadcrumb?: React.ReactNode;
  emptyText: string;
}) {
  const query = listingQuery(sp, fixed);
  const [result, facets] = await Promise.all([
    getProducts(ctx.store, ctx.storeHost, query, ctx.currency),
    getFacets(ctx.store, ctx.storeHost, query),
  ]);
  if (!result.ok) {
    const first = await getProducts(ctx.store, ctx.storeHost, { ...query, page: undefined }, ctx.currency);
    const size = Number(query.page_size ?? PAGE_SIZE_DEFAULT);
    const last = first.ok ? Math.max(1, Math.ceil(first.page.count / size)) : 1;
    redirect(pageHref(path, sp, last));
  }
  const page = result.page;
  const current = Number(query.page ?? 1);
  const size = Number(query.page_size ?? PAGE_SIZE_DEFAULT);
  const pages = Math.max(1, Math.ceil(page.count / size));
  const filtered = Boolean(query.brand || query.tag || query.collection || query.is_featured);
  const baseQuery: Record<string, string> = {};
  for (const [k, v] of Object.entries(fixed)) if (v) baseQuery[k] = v;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-10 md:px-6 md:pt-10">
      {breadcrumb}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground" data-testid="listing-count" aria-live="polite">
            <Mono>{formatNumber(page.count)}</Mono> {page.count === 1 ? "منتج" : page.count === 2 ? "منتجان" : "منتجاً"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FiltersDrawerButton facets={facets} baseQuery={baseQuery} />
          <SortSelect />
        </div>
      </div>

      {subcategories.length > 0 ? (
        <ul className="store-rail -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" aria-label="الأقسام الفرعية">
          {subcategories.map((s) => (
            <li key={s.id} className="shrink-0">
              <Link href={`/c/${s.id}`} className="store-frame inline-flex min-h-11 items-center rounded-full border-border px-4 text-sm hover:bg-muted md:min-h-9">
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 grid gap-8 md:grid-cols-[14rem_1fr]">
        <aside className="hidden md:block" aria-label="تصفية المنتجات">
          <FiltersPanel facets={facets} />
        </aside>
        <div className="min-w-0">
          {page.results.length === 0 ? (
            <div className="store-frame space-y-3 rounded-lg border-dashed border-border p-8" data-testid="listing-empty">
              <p className="store-heading text-lg font-semibold">{filtered ? "لا منتجات تطابق الفلاتر" : emptyText}</p>
              {filtered ? <ClearFiltersButton /> : null}
            </div>
          ) : (
            <>
              {/* Cards title themselves with h3 (they sit under a section h2 on the home page). */}
              <h2 className="sr-only">المنتجات</h2>
              <ProductGrid products={page.results} priorityCount={4} className="sm:grid-cols-2 lg:grid-cols-3" />
            </>
          )}
          {pages > 1 ? <Pagination path={path} sp={sp} current={current} pages={pages} /> : null}
        </div>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: title,
          numberOfItems: page.count,
          itemListElement: page.results.map((p, i) => ({
            "@type": "ListItem",
            position: (current - 1) * size + i + 1,
            url: `${ctx.storeOrigin}/p/${p.id}`,
            name: p.name,
          })),
        }}
      />
    </div>
  );
}

function Pagination({ path, sp, current, pages }: { path: string; sp: SearchParams; current: number; pages: number }) {
  const nums = [...new Set([1, current - 1, current, current + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  return (
    <nav aria-label="الصفحات" className="mt-8 flex flex-wrap items-center justify-center gap-1" data-testid="pagination">
      <Link
        href={pageHref(path, sp, current - 1)}
        aria-disabled={current <= 1}
        className={cn("store-frame inline-flex h-11 items-center rounded-lg border-border px-4 text-sm", current <= 1 && "pointer-events-none opacity-40")}
      >
        السابق
      </Link>
      {nums.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && nums[i - 1]! < p - 1 ? <span className="px-1 text-muted-foreground">…</span> : null}
          <Link
            href={pageHref(path, sp, p)}
            aria-current={p === current ? "page" : undefined}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-lg font-mono text-sm tabular-nums",
              p === current ? "bg-foreground text-background" : "hover:bg-muted",
            )}
          >
            {p}
          </Link>
        </span>
      ))}
      <Link
        href={pageHref(path, sp, current + 1)}
        aria-disabled={current >= pages}
        className={cn("store-frame inline-flex h-11 items-center rounded-lg border-border px-4 text-sm", current >= pages && "pointer-events-none opacity-40")}
      >
        التالي
      </Link>
    </nav>
  );
}

