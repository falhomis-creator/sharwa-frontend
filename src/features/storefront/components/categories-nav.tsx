"use client";

import { ChevronDownIcon, ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CategoryNode } from "@/features/storefront/schemas/catalog";

/**
 * Category navigation (M09 US-09.3.3, FR-09.13): on desktop a dropdown from the header with
 * roots as columns and their children beneath; on phones a bottom sheet (Base UI Drawer — the
 * project's drawer primitive, used where the spec says Vaul) opened from the tab bar, showing
 * roots and expanding `subcategories` in place.
 */
export function CategoriesMenu({ categories }: { categories: CategoryNode[] }) {
  const [open, setOpen] = useState(false);
  if (categories.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-testid="categories-menu"
        className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-expanded:bg-muted"
      >
        الأقسام
        <ChevronDownIcon aria-hidden className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(46rem,calc(100vw-2rem))] p-0">
        <nav aria-label="أقسام المتجر" className="grid max-h-[70vh] grid-cols-3 gap-x-6 gap-y-5 overflow-y-auto p-5">
          {categories.map((c) => (
            <div key={c.id} className="min-w-0">
              <Link
                href={`/c/${c.id}`}
                onClick={() => setOpen(false)}
                className="store-heading block truncate text-sm font-semibold text-foreground hover:underline"
              >
                {c.name}
              </Link>
              {c.subcategories.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {c.subcategories.map((s) => (
                    <li key={s.id}>
                      <Link href={`/c/${s.id}`} onClick={() => setOpen(false)} className="block truncate text-sm text-muted-foreground hover:text-foreground">
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </nav>
      </PopoverContent>
    </Popover>
  );
}

export function CategoriesDrawer({
  categories,
  open,
  onOpenChange,
}: {
  categories: CategoryNode[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent data-testid="categories-drawer">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle>الأقسام</DrawerTitle>
        </DrawerHeader>
        <nav aria-label="أقسام المتجر" className="overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {categories.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">لا أقسام في هذا المتجر بعد.</p>
          ) : (
            <ul className="divide-y divide-border">
              <li>
                <Link href="/products" onClick={() => onOpenChange(false)} className="flex min-h-12 items-center px-5 text-sm font-medium">
                  كل المنتجات
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <div className="flex min-h-12 items-center">
                    <Link href={`/c/${c.id}`} onClick={() => onOpenChange(false)} className="flex min-h-12 flex-1 items-center px-5 text-sm font-medium">
                      {c.name}
                    </Link>
                    {c.subcategories.length > 0 ? (
                      <button
                        type="button"
                        aria-expanded={expanded === c.id}
                        aria-label={`فروع ${c.name}`}
                        onClick={() => setExpanded((v) => (v === c.id ? null : c.id))}
                        className="flex size-12 items-center justify-center text-muted-foreground"
                      >
                        <ChevronLeftIcon aria-hidden className={expanded === c.id ? "size-4 -rotate-90 transition-transform" : "size-4 transition-transform rtl:rotate-0"} />
                      </button>
                    ) : null}
                  </div>
                  {expanded === c.id ? (
                    <ul className="bg-muted/60 pb-1">
                      {c.subcategories.map((s) => (
                        <li key={s.id}>
                          <Link href={`/c/${s.id}`} onClick={() => onOpenChange(false)} className="flex min-h-11 items-center ps-9 pe-5 text-sm text-muted-foreground">
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
