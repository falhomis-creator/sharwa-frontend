"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Money } from "@/components/shared/money";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ProductPageSchema, type ProductCard } from "@/features/storefront/schemas/catalog";
import { useStorefront } from "@/features/storefront/components/storefront-provider";

/**
 * Header search (M09 US-09.3.2): Enter goes to `/search?q=`; while typing, after 2
 * characters and 200 ms, up to five suggestions from the SAME endpoint (`?search=&page_size=5`).
 * Each keystroke aborts the previous request (FR-09.12). A query with no result is recorded
 * locally only — Django logs `ZeroResultSearchLog` itself. `/` focuses the field.
 */
const ZERO_KEY = "sharwa:zero-results";

function recordZero(q: string) {
  try {
    const list = JSON.parse(localStorage.getItem(ZERO_KEY) ?? "[]") as string[];
    localStorage.setItem(ZERO_KEY, JSON.stringify([q, ...list.filter((x) => x !== q)].slice(0, 20)));
  } catch {
    // storage unavailable: nothing to record
  }
}

export function HeaderSearch({ className, autoFocus = false, initial = "" }: { className?: string; autoFocus?: boolean; initial?: string }) {
  const { currency } = useStorefront();
  const router = useRouter();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<ProductCard[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // `/` focuses the search anywhere on the store (M09 §6 shortcuts).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey) return;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const page = await apiFetch("/api/v1/catalog/products/", ProductPageSchema, {
          query: { search: term, page_size: 5, currency },
          signal: controller.signal,
        });
        setResults(page.results);
        setActive(-1);
        if (page.count === 0) recordZero(term);
      } catch {
        // aborted or offline: keep the previous list
      }
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [q, currency]);

  const showList = open && q.trim().length >= 2 && results !== null;

  function submit(term: string) {
    const value = term.trim();
    setOpen(false);
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  }

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const picked = active >= 0 ? results?.[active] : undefined;
        if (picked) {
          setOpen(false);
          router.push(`/p/${picked.id}`);
        } else submit(q);
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">
        ابحث في المتجر
      </label>
      <SearchIcon aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={input}
        id={`${listId}-input`}
        data-testid="store-search"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={q}
        placeholder="ابحث عن منتج"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          if (e.target.value.trim().length < 2) setResults(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!results?.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
          } else if (e.key === "Escape") setOpen(false);
        }}
        className="store-frame h-11 w-full rounded-full border-input bg-muted/60 ps-9 pe-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 md:h-10 md:text-sm"
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="اقتراحات البحث"
          className="store-frame absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border-border bg-popover text-sm shadow-card"
        >
          {results.length === 0 ? (
            <li className="px-3 py-3 text-muted-foreground">لا منتجات تطابق «{q.trim()}»</li>
          ) : (
            results.map((p, i) => (
              <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <Link
                  href={`/p/${p.id}`}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  className={cn("flex min-h-11 items-center justify-between gap-3 px-3 py-2 hover:bg-muted", i === active && "bg-muted")}
                >
                  <span className="truncate">{p.name}</span>
                  <Money value={p.display_price} className="shrink-0 text-xs text-muted-foreground" />
                </Link>
              </li>
            ))
          )}
          <li className="border-t border-border">
            <button type="submit" className="flex min-h-11 w-full items-center px-3 text-start store-link hover:bg-muted">
              كل النتائج لـ «{q.trim()}»
            </button>
          </li>
        </ul>
      ) : null}
    </form>
  );
}
