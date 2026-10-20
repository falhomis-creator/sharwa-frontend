"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { SectionView } from "@/features/storefront/schemas/config";

/**
 * `slider` — سلايدر (US-09.1.3): MANUAL — swipe, dots, arrows and the keyboard's ←/→ (which
 * follow RTL). It never auto-advances (so `prefers-reduced-motion` is honoured by
 * construction). Slides start at the inline start; arrows are mirrored (`rtl:rotate-180`).
 */
export function SliderSection({ view }: { view: SectionView }) {
  const items = view.items.filter((i) => i.title || i.image);
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const labelId = useId();
  if (items.length === 0) return null;

  const go = (next: number) => {
    const el = track.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(items.length - 1, next));
    const child = el.children[clamped] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest", inline: "start" });
    setIndex(clamped);
  };

  return (
    <section
      data-testid="section-slider"
      data-section-id={view.id}
      aria-roledescription="سلايدر"
      aria-labelledby={labelId}
      className={cn("py-[calc(var(--store-section-y)/2)]", !view.showOnMobile && "hidden md:block")}
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <h2 id={labelId} className="sr-only">
          {view.title ?? view.label ?? "عروض مختارة"}
        </h2>
        <div
          className="relative"
          onKeyDown={(e) => {
            // Arrow keys follow the reading direction: in RTL «←» moves forward.
            if (e.key === "ArrowLeft") go(index + 1);
            if (e.key === "ArrowRight") go(index - 1);
          }}
        >
          <ul
            ref={track}
            className="store-rail flex snap-x overflow-x-auto"
            onScroll={(e) => {
              const el = e.currentTarget;
              const i = Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth));
              if (i !== index) setIndex(i);
            }}
          >
            {items.map((item, i) => (
              <li key={`${item.title}-${i}`} className="w-full shrink-0" aria-roledescription="شريحة" aria-label={`${i + 1} من ${items.length}`}>
                <div className="store-frame relative flex min-h-44 overflow-hidden rounded-xl border-border md:min-h-72 shadow-card bg-card">
                  {item.image ? (
                    <Image src={item.image} alt={item.title ?? ""} fill sizes="100vw" unoptimized={!item.image.startsWith("/")} className="object-cover" />
                  ) : null}
                  <div className={cn("relative mt-auto flex w-full flex-col gap-3 p-6 md:p-10", item.image && "bg-background/90")}>
                    <p className="store-heading text-2xl font-bold leading-tight md:text-4xl">{item.title}</p>
                    {item.link ? (
                      <Link href={item.link} className="store-link inline-flex min-h-11 w-fit items-center text-sm font-medium underline-offset-4 hover:underline" tabIndex={i === index ? 0 : -1}>
                        تسوّق الآن
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {items.length > 1 ? (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center" role="tablist" aria-label="الشرائح">
                {items.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`الشريحة ${i + 1}`}
                    onClick={() => go(i)}
                    className="flex size-11 items-center justify-center"
                  >
                    <span className={cn("block h-1.5 rounded-full transition-all", i === index ? "w-6 bg-foreground" : "w-1.5 bg-foreground/25")} />
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <button type="button" aria-label="الشريحة السابقة" onClick={() => go(index - 1)} disabled={index === 0} className="store-frame flex size-11 items-center justify-center rounded-full border-border disabled:opacity-40">
                  <ChevronRightIcon aria-hidden className="size-4 ltr:rotate-180" />
                </button>
                <button type="button" aria-label="الشريحة التالية" onClick={() => go(index + 1)} disabled={index === items.length - 1} className="store-frame flex size-11 items-center justify-center rounded-full border-border disabled:opacity-40">
                  <ChevronLeftIcon aria-hidden className="size-4 ltr:rotate-180" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
