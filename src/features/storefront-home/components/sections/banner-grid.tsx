import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SectionView } from "@/features/storefront/schemas/config";
import { SectionShell } from "@/features/storefront-home/components/section-shell";

/**
 * `banner_grid` — شبكة بنرات (US-09.1.3): an ASYMMETRIC bento — the first banner takes two
 * rows on desktop, the rest stack beside it. `next/image` with `alt=title`; without an image a
 * banner is its title set large in the heading font inside a 1px frame.
 */
export function BannerGridSection({ view }: { view: SectionView }) {
  const items = view.items.filter((i) => i.title || i.image);
  if (items.length === 0) return null;
  return (
    <SectionShell id={view.id} title={view.title} showOnMobile={view.showOnMobile} testId="section-banner_grid">
      <ul className="grid gap-[var(--store-grid-gap)] md:grid-cols-[3fr_2fr] md:grid-rows-2">
        {items.slice(0, 5).map((item, i) => {
          const body = (
            <div className={cn("store-frame relative flex h-full overflow-hidden rounded-xl border-border", i === 0 ? "min-h-48 md:min-h-[22rem]" : "min-h-32 md:min-h-0")}>
              {item.image ? (
                <Image src={item.image} alt={item.title ?? ""} fill sizes="(min-width: 768px) 50vw, 100vw" unoptimized={!item.image.startsWith("/")} className="object-cover" />
              ) : null}
              <div className={cn("relative mt-auto flex w-full items-end justify-between gap-3 p-5 md:p-7", item.image && "bg-background/90")}>
                <span className={cn("store-heading font-bold leading-tight text-balance", i === 0 ? "text-2xl md:text-4xl" : "text-xl md:text-2xl")}>
                  {item.title}
                </span>
                {item.link ? <span className="store-link shrink-0 text-sm font-medium">تسوّق</span> : null}
              </div>
            </div>
          );
          return (
            <li key={`${item.title}-${i}`} className={cn(i === 0 && "md:row-span-2")}>
              {item.link ? (
                <Link href={item.link} className="block h-full hover:opacity-90">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
