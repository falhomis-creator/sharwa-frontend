import Link from "next/link";
import type { SectionView } from "@/features/storefront/schemas/config";
import type { CategoryNode } from "@/features/storefront/schemas/catalog";
import { ProductImage } from "@/features/storefront/components/product-image";
import { SectionShell } from "@/features/storefront-home/components/section-shell";
import { RailControls } from "@/features/storefront-home/components/rail-controls";

/**
 * `category_strip` — شريط تصفّح الأقسام (US-09.1.1): a horizontal, snap-scrolling rail of the
 * root categories that starts at the inline start (the right in RTL). A category image shows
 * when Django exports one (`[NEEDS BACKEND]`); until then each tile is its name.
 */
export function CategoryStripSection({ view, categories }: { view: SectionView; categories: CategoryNode[] }) {
  if (categories.length === 0) return null;
  const railId = `rail-${view.id}`;
  return (
    <SectionShell id={view.id} title={view.title ?? "تسوّق حسب القسم"} showOnMobile={view.showOnMobile} testId="section-category_strip">
      <div className="relative">
        <ul id={railId} className="store-rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {categories.map((c) => (
            <li key={c.id} className="w-36 shrink-0 md:w-44">
              <Link href={`/c/${c.id}`} className="store-frame group block overflow-hidden rounded-lg border-border transition-colors hover:border-foreground/30">
                {c.image ? <ProductImage src={c.image} alt={c.name} sizes="176px" /> : null}
                <span className="flex min-h-14 items-center justify-between gap-2 px-3 py-3 text-sm font-medium">
                  <span className="truncate">{c.name}</span>
                  {c.subcategories.length > 0 ? (
                    <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{c.subcategories.length}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <RailControls target={railId} />
      </div>
    </SectionShell>
  );
}
