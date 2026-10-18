"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { NativeSelect } from "@/components/ui/native-select";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";

/**
 * Table toolbar parts (T069): a debounced search box and labelled filter selects.
 * ≥ md the filters sit inline; below md they move into a bottom drawer behind a
 * «الفلاتر (n)» button (M06 §6 «الفلاتر في drawer سفلي»). Values live in the URL —
 * these components only report changes.
 */
export function SearchBox({
  value,
  onChange,
  placeholder,
  label = "بحث",
  delay = 300,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  label?: string;
  delay?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const last = useRef(value);
  const latestOnChange = useRef(onChange);
  useEffect(() => {
    latestOnChange.current = onChange;
  });

  // External changes (clear filters, back/forward) win over the draft.
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    if (draft === last.current) return;
    const t = window.setTimeout(() => {
      last.current = draft;
      latestOnChange.current(draft);
    }, delay);
    return () => window.clearTimeout(t);
  }, [draft, delay]);

  return (
    <label className={cn("relative flex min-w-0 items-center", className)}>
      <span className="sr-only">{label}</span>
      <Search
        className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full min-w-0 rounded-lg border border-input bg-background ps-8 pe-8 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:text-sm dark:bg-input/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => setDraft("")}
          aria-label="مسح البحث"
          className="absolute end-0 flex size-11 items-center justify-center text-muted-foreground hover:text-foreground md:size-8"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </label>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "الكل",
  testId,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: FilterOption[];
  allLabel?: string;
  testId?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
      <span className="text-xs text-muted-foreground md:whitespace-nowrap">{label}</span>
      <NativeSelect
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("h-11 md:h-8 md:w-auto md:min-w-28", value && "border-foreground/40")}
        data-testid={testId}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}

/**
 * Inline filters on md+, a bottom drawer below md. `activeCount` labels the mobile button,
 * `onClear` renders «مسح الفلاتر» when anything is active.
 */
export function FilterBar({
  search,
  children,
  activeCount,
  onClear,
}: {
  search?: ReactNode;
  children: ReactNode;
  activeCount: number;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {search ? <div className="min-w-0 flex-1 md:max-w-sm">{search}</div> : null}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm md:hidden"
        >
          <SlidersHorizontal className="size-4" strokeWidth={1.75} aria-hidden />
          الفلاتر
          {activeCount > 0 ? <Mono className="text-xs">({activeCount})</Mono> : null}
        </button>
      </div>
      <div className="hidden flex-wrap items-center gap-x-4 gap-y-2 md:flex">
        {children}
        {activeCount > 0 && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="h-8 rounded-md px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            مسح الفلاتر
          </button>
        ) : null}
      </div>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>الفلاتر</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-3 overflow-y-auto p-4">{children}</div>
          <DrawerFooter className="flex-row">
            {activeCount > 0 && onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="h-11 flex-1 rounded-lg border border-border text-sm"
              >
                مسح الفلاتر
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 flex-1 rounded-lg bg-primary text-sm text-primary-foreground"
            >
              عرض النتائج
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/**
 * Text-first number strip above a list (constitution I: no equal KPI cards). Each entry
 * is a filter toggle: «منشور 41 · مسودة 6 · منخفض المخزون 7 · نفد 3».
 */
export function StatStrip({
  items,
  label,
}: {
  label: string;
  items: Array<{ key: string; label: string; count: number | undefined; active: boolean; onSelect: () => void; tone?: "warning" | "destructive" }>;
}) {
  return (
    <nav aria-label={label} className="-mx-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
      {items.map((item, i) => (
        <span key={item.key} className="flex items-center">
          {i > 0 ? <span aria-hidden className="px-1 text-border">·</span> : null}
          <button
            type="button"
            onClick={item.onSelect}
            aria-pressed={item.active}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-md px-1.5 transition-colors hover:text-foreground lg:min-h-8",
              item.active ? "text-foreground underline underline-offset-[6px]" : "text-muted-foreground",
            )}
          >
            {item.label}
            <Mono
              className={cn(
                "text-foreground",
                item.tone === "warning" && (item.count ?? 0) > 0 && "text-warning",
                item.tone === "destructive" && (item.count ?? 0) > 0 && "text-destructive",
              )}
            >
              {item.count ?? "–"}
            </Mono>
          </button>
        </span>
      ))}
    </nav>
  );
}
