"use client";

import { HeartIcon, HomeIcon, LayoutGridIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CartButton } from "@/features/cart/components/cart-button";
import type { CategoryNode } from "@/features/storefront/schemas/catalog";
import dynamic from "next/dynamic";
import { visiblePath, useStorefront } from "@/features/storefront/components/storefront-provider";
import { useWishlistIds } from "@/stores/wishlist";

// The categories drawer (Base UI dialog + the tree) is loaded on the first tap, not with the
// page (T095): the bar itself is five links.
const CategoriesDrawer = dynamic(() => import("@/features/storefront/components/categories-drawer").then((m) => m.CategoriesDrawer), { ssr: false });

/**
 * The phone's bottom bar (M09 US-09.3.3, FR-09.13): الرئيسية · الأقسام · البحث · السلة ·
 * المفضلة — five fixed items, each ≥ 44px (SC-09.5), shown only under 768px. It steps aside
 * on checkout, where the confirm button owns the bottom edge (M12 §6).
 */
export function MobileTabBar({ categories }: { categories: CategoryNode[] }) {
  const path = visiblePath(usePathname());
  const { store } = useStorefront();
  const wishlist = useWishlistIds(store);
  const [catsOpen, setCatsOpen] = useState(false);
  const [catsMounted, setCatsMounted] = useState(false);
  if (catsOpen && !catsMounted) setCatsMounted(true);
  if (path.startsWith("/checkout")) return null;

  const item = "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const on = (active: boolean) => (active ? "text-foreground font-medium" : "text-muted-foreground");

  return (
    <>
      <nav
        aria-label="التنقل السفلي"
        data-testid="mobile-tab-bar"
        className="store-frame fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-card md:hidden"
      >
        <ul className="grid grid-cols-5">
          <li>
            <Link href="/" className={cn(item, on(path === "/"))} aria-current={path === "/" ? "page" : undefined}>
              <HomeIcon aria-hidden className="size-5" />
              الرئيسية
            </Link>
          </li>
          <li>
            <button type="button" className={cn(item, on(path.startsWith("/c/")))} onClick={() => setCatsOpen(true)} data-testid="tab-categories">
              <LayoutGridIcon aria-hidden className="size-5" />
              الأقسام
            </button>
          </li>
          <li>
            <Link href="/search" className={cn(item, on(path.startsWith("/search")))} aria-current={path.startsWith("/search") ? "page" : undefined}>
              <SearchIcon aria-hidden className="size-5" />
              البحث
            </Link>
          </li>
          <li>
            <CartButton variant="tab" className={on(path.startsWith("/cart"))} />
          </li>
          <li>
            <Link href="/wishlist" className={cn(item, on(path.startsWith("/wishlist")))} aria-current={path.startsWith("/wishlist") ? "page" : undefined}>
              <span className="relative">
                <HeartIcon aria-hidden className="size-5" />
                {wishlist.length > 0 ? (
                  <span className="absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 font-mono text-[10px] leading-none text-cta-foreground tabular-nums">
                    {wishlist.length}
                  </span>
                ) : null}
              </span>
              المفضلة
            </Link>
          </li>
        </ul>
      </nav>
      {catsMounted ? <CategoriesDrawer categories={categories} open={catsOpen} onOpenChange={setCatsOpen} /> : null}
    </>
  );
}

export function WishlistLink() {
  const { store } = useStorefront();
  const ids = useWishlistIds(store);
  return (
    <Link
      href="/wishlist"
      aria-label={ids.length ? `المفضلة، ${ids.length}` : "المفضلة"}
      className="relative hidden size-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted md:inline-flex"
    >
      <HeartIcon aria-hidden className="size-5" />
      {ids.length > 0 ? (
        <span className="absolute top-1 end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 font-mono text-[10px] leading-none text-cta-foreground tabular-nums">
          {ids.length}
        </span>
      ) : null}
    </Link>
  );
}
