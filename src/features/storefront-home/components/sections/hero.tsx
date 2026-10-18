import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SectionView } from "@/features/storefront/schemas/config";

/**
 * `hero` — البانر الرئيسي (US-09.1.1): start-aligned copy beside the merchant's image, 1px
 * frame, no gradient. Without an image it is a typographic block in the merchant's heading
 * font — the store's name and promise, not a placeholder picture. The image (if any) is the
 * LCP element and loads with `priority`.
 */
export function HeroSection({ view, storeName }: { view: SectionView; storeName: string }) {
  const title = view.title ?? storeName;
  return (
    <section
      data-testid="section-hero"
      data-section-id={view.id}
      className={cn("pt-4 pb-[calc(var(--store-section-y)/2)] md:pt-8", !view.showOnMobile && "hidden md:block")}
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div
          className={cn(
            "store-frame grid overflow-hidden rounded-xl border-border",
            view.image ? "md:grid-cols-[5fr_7fr]" : "",
          )}
        >
          <div className="flex flex-col justify-center gap-4 p-6 md:p-12">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-balance md:text-5xl">{title}</h1>
            {view.subtitle ? <p className="max-w-xl text-base leading-8 text-muted-foreground md:text-lg">{view.subtitle}</p> : null}
            {view.link ? (
              <Link href={view.link} className={cn(buttonVariants(), "mt-2 h-12 w-fit px-6 text-base")}>
                {view.ctaText ?? "تسوّق الآن"}
              </Link>
            ) : null}
          </div>
          {view.image ? (
            <div className="relative min-h-64 md:min-h-[26rem]">
              <Image
                src={view.image}
                alt={view.title ?? ""}
                fill
                priority
                sizes="(min-width: 768px) 58vw, 100vw"
                unoptimized={!view.image.startsWith("/")}
                className="object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
