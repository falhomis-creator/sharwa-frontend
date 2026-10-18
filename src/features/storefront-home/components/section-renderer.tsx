import { Suspense } from "react";
import type { Currency } from "@/lib/schemas/money";
import { getCategories } from "@/features/storefront/api/catalog";
import type { SectionView, StoreConfig } from "@/features/storefront/schemas/config";
import { HeroSection } from "@/features/storefront-home/components/sections/hero";
import { CategoryStripSection } from "@/features/storefront-home/components/sections/category-strip";
import { ProductsSection, ProductsSectionSkeleton } from "@/features/storefront-home/components/sections/product-sections";
import { BannerGridSection } from "@/features/storefront-home/components/sections/banner-grid";
import { SliderSection } from "@/features/storefront-home/components/sections/slider";
import { PromotionalOffersSection } from "@/features/storefront-home/components/sections/promotional-offers";

/**
 * One component per `section_type` (FR-09.02), rendered in the merchant's `order`. Data
 * sections stream behind a skeleton with their final footprint (zero CLS — M09 §6). An
 * unknown type never reaches here: the config schema drops it with a console warning.
 */
export interface SectionCtx {
  store: string;
  storeHost: string;
  currency: Currency;
  config: StoreConfig;
}

async function CategoryStrip({ view, ctx }: { view: SectionView; ctx: SectionCtx }) {
  const categories = await getCategories(ctx.store, ctx.storeHost);
  return <CategoryStripSection view={view} categories={categories} />;
}

export function SectionRenderer({ view, ctx, index }: { view: SectionView; ctx: SectionCtx; index: number }) {
  // The first product section above the fold gets eager images (LCP).
  const priorityCount = index <= 2 ? 2 : 0;
  switch (view.type) {
    case "hero":
      return <HeroSection view={view} storeName={ctx.config.store_name} />;
    case "category_strip":
      return (
        <Suspense fallback={null}>
          <CategoryStrip view={view} ctx={ctx} />
        </Suspense>
      );
    case "featured_products":
    case "latest_products":
    case "product_grid":
      return (
        <Suspense fallback={<ProductsSectionSkeleton view={view} count={view.limit} />}>
          <ProductsSection view={view} ctx={ctx} kind={view.type} priorityCount={priorityCount} />
        </Suspense>
      );
    case "slider":
      return <SliderSection view={view} />;
    case "banner_grid":
      return <BannerGridSection view={view} />;
    case "promotional_offers":
      return (
        <Suspense fallback={null}>
          <PromotionalOffersSection view={view} store={ctx.store} storeHost={ctx.storeHost} timezone={ctx.config.timezone ?? "Asia/Aden"} />
        </Suspense>
      );
  }
}
