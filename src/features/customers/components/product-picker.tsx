"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { useProductOptions } from "@/features/customers/api";

/**
 * The `bought_product` segment's product field (US-07.5.1): searches the M04 catalogue
 * (`GET /api/bff/products?q=`) and reports the picked id; the chosen name comes from the
 * live segment count, so a shared link shows it without a second lookup.
 */
export function ProductPicker({ productId, productName, onChange }: { productId: string; productName: string | null; onChange: (id: string | null) => void }) {
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setQ(draft.trim()), 250);
    return () => window.clearTimeout(t);
  }, [draft]);
  const options = useProductOptions(q, !productId);

  if (productId) {
    return (
      <span className="flex min-w-0 items-center gap-1 rounded-lg border border-foreground/40 ps-2.5 text-sm" data-testid="product-picked">
        <span className="truncate">{productName ?? <Mono>#{productId}</Mono>}</span>
        <button type="button" onClick={() => onChange(null)} aria-label="إزالة المنتج" className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground md:size-8">
          <X className="size-3.5" aria-hidden />
        </button>
      </span>
    );
  }

  const results = options.data?.results ?? [];
  return (
    <div className="relative flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
      <label htmlFor="segment-product" className="text-xs text-muted-foreground md:whitespace-nowrap">
        المنتج
      </label>
      <input
        id="segment-product"
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="ابحث باسم المنتج أو SKU"
        autoComplete="off"
        className="h-11 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:w-56 md:text-sm dark:bg-input/30"
        data-testid="product-search"
      />
      {q.length >= 2 ? (
        <ul role="listbox" aria-label="نتائج المنتجات" className="z-30 flex max-h-64 flex-col overflow-y-auto rounded-lg border border-border bg-popover md:absolute md:top-full md:end-0 md:mt-1 md:w-72">
          {options.isLoading ? <li className="px-3 py-2 text-sm text-muted-foreground">جارٍ البحث…</li> : null}
          {!options.isLoading && results.length === 0 ? <li className="px-3 py-2 text-sm text-muted-foreground">لا منتجات بهذا الاسم.</li> : null}
          {results.map((p) => (
            <li key={p.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  setQ("");
                  onChange(String(p.id));
                }}
                className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-start text-sm hover:bg-muted md:min-h-9"
                data-testid="product-option"
              >
                <span className="truncate">{p.name}</span>
                <Mono className="text-[11px] text-muted-foreground">{p.sku}</Mono>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
