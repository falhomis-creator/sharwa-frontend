"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { CategoryNode } from "@/features/storefront/schemas/catalog";

/**
 * The phone's categories sheet (M09 FR-09.13): Base UI Drawer — the project's drawer
 * primitive, used where the spec says Vaul — opened from the tab bar, showing roots and
 * expanding `subcategories` in place. Loaded on first tap, not with the page (T095).
 */
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
                        <ChevronRightIcon aria-hidden className={expanded === c.id ? "size-4 rotate-90 transition-transform" : "size-4 transition-transform rtl:rotate-180"} />
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
