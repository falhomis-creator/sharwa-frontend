"use client";

import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useState, useTransition } from "react";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { apiFetch } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProductPageSchema, type Facets } from "@/features/storefront/schemas/catalog";
import { useStorefront } from "@/features/storefront/components/storefront-provider";

/**
 * Listing filters (M09 US-09.4): brand · tag · collection · «مميز» and the order, ALL in the
 * URL through nuqs (FR-09.05) with `shallow: false`, so the server re-renders the page and a
 * copied link reproduces the same results (SC-09.3). Facet counts come from the server
 * (`[NEEDS BACKEND]` facets endpoint); a facet group is hidden when it has no options.
 *
 * Phones: the same filters in a bottom drawer, applied in ONE step by «عرض N منتجاً», where N
 * is asked from the Ready list endpoint (`page_size=1`, its `count`) — no local counting.
 */
export const FILTER_PARSERS = {
  brand: parseAsString,
  tag: parseAsString,
  collection: parseAsString,
  is_featured: parseAsString,
  ordering: parseAsString,
  page: parseAsInteger,
};

type FilterState = { brand: string | null; tag: string | null; collection: string | null; is_featured: string | null };

const ORDERINGS = [
  { value: "", label: "الأحدث" },
  { value: "price", label: "السعر: من الأقل" },
  { value: "-price", label: "السعر: من الأعلى" },
];

function FacetGroup({
  title,
  name,
  options,
  value,
  onChange,
}: {
  title: string;
  name: string;
  options: Facets["brands"];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <fieldset className="min-w-0 space-y-1">
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      <ul className="space-y-0.5">
        {options.map((o) => {
          const checked = value === String(o.id);
          return (
            <li key={o.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 text-sm hover:bg-muted md:min-h-9">
                <input
                  type="radio"
                  name={name}
                  checked={checked}
                  onChange={() => onChange(checked ? null : String(o.id))}
                  onClick={() => checked && onChange(null)}
                  className="size-4 accent-[var(--foreground)]"
                />
                <span className="flex-1 truncate">{o.name}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{formatNumber(o.count)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function FilterFields({ facets, state, set }: { facets: Facets; state: FilterState; set: (patch: Partial<FilterState>) => void }) {
  return (
    <div className="space-y-6">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={state.is_featured === "true"}
          onChange={(e) => set({ is_featured: e.target.checked ? "true" : null })}
          className="size-4 accent-[var(--foreground)]"
        />
        المنتجات المميزة فقط
      </label>
      <FacetGroup title="الماركة" name="brand" options={facets.brands} value={state.brand} onChange={(v) => set({ brand: v })} />
      <FacetGroup title="المجموعة" name="collection" options={facets.collections} value={state.collection} onChange={(v) => set({ collection: v })} />
      <FacetGroup title="الوسم" name="tag" options={facets.tags} value={state.tag} onChange={(v) => set({ tag: v })} />
    </div>
  );
}

export function useListingParams() {
  const [pending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(FILTER_PARSERS, { shallow: false, startTransition, scroll: false });
  return { params, setParams, pending };
}

/** Desktop side panel. */
export function FiltersPanel({ facets }: { facets: Facets }) {
  const { params, setParams } = useListingParams();
  const active = Boolean(params.brand || params.tag || params.collection || params.is_featured);
  return (
    <div className="space-y-5" data-testid="filters-panel">
      <div className="flex items-center justify-between">
        <p className="store-heading text-base font-semibold">تصفية</p>
        {active ? (
          <button
            type="button"
            className="min-h-9 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setParams({ brand: null, tag: null, collection: null, is_featured: null, page: null })}
          >
            مسح الكل
          </button>
        ) : null}
      </div>
      <FilterFields facets={facets} state={params} set={(patch) => setParams({ ...patch, page: null })} />
    </div>
  );
}

/** Phone drawer: local draft, one «عرض N منتجاً» to apply. */
export function FiltersDrawerButton({ facets, baseQuery }: { facets: Facets; baseQuery: Record<string, string> }) {
  const { currency } = useStorefront();
  const { params, setParams } = useListingParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterState>({ brand: null, tag: null, collection: null, is_featured: null });
  const [count, setCount] = useState<number | null>(null);
  const activeCount = [params.brand, params.tag, params.collection, params.is_featured].filter(Boolean).length;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const query: Record<string, string> = { ...baseQuery, page_size: "1", currency };
    for (const [k, v] of Object.entries(draft)) if (v) query[k] = v;
    apiFetch("/api/v1/catalog/products/", ProductPageSchema, { query, signal: controller.signal })
      .then((p) => setCount(p.count))
      .catch(() => undefined);
    return () => controller.abort();
  }, [open, draft, baseQuery, currency]);

  return (
    <>
      <Button
        variant="outline"
        className="h-11 gap-2 md:hidden"
        data-testid="filters-open"
        onClick={() => {
          setDraft({ brand: params.brand, tag: params.tag, collection: params.collection, is_featured: params.is_featured });
          setCount(null);
          setOpen(true);
        }}
      >
        <SlidersHorizontalIcon aria-hidden />
        فلترة
        {activeCount > 0 ? <span className="font-mono text-xs tabular-nums">({activeCount})</span> : null}
      </Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent data-testid="filters-drawer">
          <DrawerHeader className="flex-row items-center justify-between border-b border-border text-start">
            <DrawerTitle>فلترة المنتجات</DrawerTitle>
            <button type="button" aria-label="إغلاق" onClick={() => setOpen(false)} className="flex size-11 items-center justify-center text-muted-foreground">
              <XIcon aria-hidden className="size-4" />
            </button>
          </DrawerHeader>
          <div className="overflow-y-auto px-5 py-4">
            <FilterFields facets={facets} state={draft} set={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
          </div>
          <DrawerFooter className="flex-row gap-2 border-t border-border pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              className="h-12 flex-1 text-base"
              data-testid="filters-apply"
              onClick={() => {
                setParams({ ...draft, page: null });
                setOpen(false);
              }}
            >
              {count === null ? "عرض النتائج" : count === 0 ? "لا منتجات" : `عرض ${formatNumber(count)} منتجاً`}
            </Button>
            <Button variant="outline" className="h-12" onClick={() => setDraft({ brand: null, tag: null, collection: null, is_featured: null })}>
              مسح
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export function SortSelect() {
  const { params, setParams } = useListingParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted-foreground sm:inline">الترتيب</span>
      <NativeSelect
        aria-label="ترتيب المنتجات"
        value={params.ordering ?? ""}
        onChange={(e) => setParams({ ordering: e.target.value || null, page: null })}
        className="h-11 w-40 md:h-9"
      >
        {ORDERINGS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}

export function ClearFiltersButton({ className }: { className?: string }) {
  const { setParams } = useListingParams();
  return (
    <Button
      variant="outline"
      className={cn("h-11", className)}
      onClick={() => setParams({ brand: null, tag: null, collection: null, is_featured: null, page: null, ordering: null })}
    >
      مسح الفلاتر
    </Button>
  );
}
