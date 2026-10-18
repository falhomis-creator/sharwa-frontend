import { SearchIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CartButton } from "@/features/cart/components/cart-button";
import type { StoreConfig } from "@/features/storefront/schemas/config";
import type { CategoryNode } from "@/features/storefront/schemas/catalog";
import { CategoriesMenu } from "@/features/storefront/components/categories-nav";
import { CurrencySwitcher } from "@/features/storefront/components/currency-switcher";
import { HeaderSearch } from "@/features/storefront/components/header-search";
import { WishlistLink } from "@/features/storefront/components/mobile-tab-bar";

/**
 * Sticky store header (M09 US-09.3): logo (or the store name as text) · categories ·
 * search · currency · wishlist · cart. On phones the search is a full screen (`/search`) and
 * categories live in the bottom bar, so the header keeps only identity, currency and cart.
 */
export function StoreHeader({ config, categories }: { config: StoreConfig; categories: CategoryNode[] }) {
  return (
    <header className="store-header sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-4 md:h-16 md:gap-4 md:px-6">
        <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2" aria-label={`${config.store_name} — الرئيسية`}>
          {config.logo ? (
            <>
              <span className="relative block h-8 w-28 shrink-0">
                <Image src={config.logo} alt="" fill sizes="112px" priority unoptimized={!config.logo.startsWith("/")} className="object-contain object-[right_center]" />
              </span>
              <span data-testid="store-name" className="sr-only">
                {config.store_name}
              </span>
            </>
          ) : (
            <span data-testid="store-name" className="store-heading truncate text-lg font-bold leading-none tracking-tight md:text-xl">
              {config.store_name}
            </span>
          )}
        </Link>
        <div className="hidden md:block">
          <CategoriesMenu categories={categories} />
        </div>
        <HeaderSearch className="hidden max-w-md flex-1 md:block" />
        <div className="ms-auto flex items-center gap-0.5 md:gap-1">
          <Link
            href="/search"
            aria-label="البحث"
            className="inline-flex size-11 items-center justify-center rounded-lg text-foreground hover:bg-muted md:hidden"
          >
            <SearchIcon aria-hidden className="size-5" />
          </Link>
          <CurrencySwitcher />
          <WishlistLink />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
