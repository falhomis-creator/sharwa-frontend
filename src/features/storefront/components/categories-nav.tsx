"use client";

import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CategoryNode } from "@/features/storefront/schemas/catalog";

/**
 * Category navigation (M09 US-09.3.3, FR-09.13): on desktop a dropdown from the header with
 * roots as columns and their children beneath. The phone drawer lives in its own module
 * (`categories-drawer.tsx`) so the tab bar can load it on first tap (T095).
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
