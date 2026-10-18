"use client";

import { ChevronLeftIcon, ChevronRightIcon, PlayIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ProductVariant, VariantAttribute } from "@/features/storefront/schemas/catalog";
import { ProductImage } from "@/features/storefront/components/product-image";
import { resolveVariant } from "@/features/pdp/variants";
import { usePdp } from "@/stores/pdp";

// The zoom dialog (Base UI Dialog) is loaded on the first zoom, not with the page (T095).
const GalleryZoom = dynamic(() => import("@/features/pdp/components/gallery-zoom").then((m) => m.GalleryZoom), { ssr: false });

/**
 * Product gallery (M10 US-10.1): one main picture with thumbnails on desktop, a full-width
 * snap rail with a Mono «2/5» counter on phones. Keyboard ←/→ follow RTL (← = next), a click
 * opens the enlarged view (`Esc` closes). The first image is `priority` (LCP), the rest lazy
 * (SC-10.1). A selected variant's own image is shown first when it has one. A video is a
 * link to the merchant's `video_url` — no third-party embed is loaded.
 */
export interface GalleryImage {
  url: string;
  alt: string;
}

export function Gallery({
  images,
  name,
  videoUrl,
  variants = [],
  attributes = [],
}: {
  images: GalleryImage[];
  name: string;
  videoUrl?: string | null;
  variants?: ProductVariant[];
  attributes?: VariantAttribute[];
}) {
  const selected = usePdp((s) => s.selected);
  const focusUrl = resolveVariant(variants, attributes, selected)?.image ?? null;
  // A variant image that is not in the gallery is shown first (US-10.2.3).
  const base = images.length ? images : [{ url: "", alt: name }];
  const list = focusUrl && !base.some((i) => i.url === focusUrl) ? [{ url: focusUrl, alt: name }, ...base] : base;
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [zoomMounted, setZoomMounted] = useState(false);
  if (zoom && !zoomMounted) setZoomMounted(true);
  const rail = useRef<HTMLUListElement>(null);

  // A variant with its own image jumps the gallery to it (state adjusted during render,
  // the React-documented pattern for "reset when a prop changes").
  const [seenFocus, setSeenFocus] = useState(focusUrl);
  if (focusUrl !== seenFocus) {
    setSeenFocus(focusUrl);
    const i = focusUrl ? list.findIndex((img) => img.url === focusUrl) : -1;
    if (i >= 0) setIndex(i);
  }

  const go = (next: number) => {
    const i = (next + list.length) % list.length;
    setIndex(i);
    const child = rail.current?.children[i] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  return (
    <div
      className="space-y-3"
      data-testid="pdp-gallery"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index + 1);
        if (e.key === "ArrowRight") go(index - 1);
      }}
    >
      <div className="relative">
        {/* Phones: swipeable rail. Desktop: the selected image. */}
        <ul
          ref={rail}
          className="store-rail flex overflow-x-auto md:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth));
            if (i !== index) setIndex(i);
          }}
        >
          {list.map((img, i) => (
            <li key={`${img.url}-${i}`} className="w-full shrink-0">
              <button type="button" className="block w-full" onClick={() => setZoom(true)} aria-label={`تكبير الصورة ${i + 1}`}>
                <ProductImage src={img.url || null} alt={img.alt} priority={i === 0} sizes="100vw" className="rounded-lg" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="store-frame hidden w-full overflow-hidden rounded-xl border-border md:block" onClick={() => setZoom(true)} aria-label="تكبير الصورة">
          <ProductImage src={list[index]!.url || null} alt={list[index]!.alt} priority sizes="(min-width: 1024px) 50vw, 60vw" />
        </button>
        {list.length > 1 ? (
          <>
            <span data-mono className="absolute bottom-3 start-3 rounded-md bg-background/90 px-2 py-0.5 font-mono text-xs tabular-nums" aria-live="polite">
              {index + 1}/{list.length}
            </span>
            <div className="absolute inset-y-0 start-2 hidden items-center md:flex">
              <button type="button" aria-label="الصورة السابقة" onClick={() => go(index - 1)} className="store-frame flex size-10 items-center justify-center rounded-full border-border bg-background/90">
                <ChevronRightIcon aria-hidden className="size-4 ltr:rotate-180" />
              </button>
            </div>
            <div className="absolute inset-y-0 end-2 hidden items-center md:flex">
              <button type="button" aria-label="الصورة التالية" onClick={() => go(index + 1)} className="store-frame flex size-10 items-center justify-center rounded-full border-border bg-background/90">
                <ChevronLeftIcon aria-hidden className="size-4 ltr:rotate-180" />
              </button>
            </div>
          </>
        ) : null}
      </div>
      {list.length > 1 ? (
        <ul className="hidden grid-cols-6 gap-2 md:grid" aria-label="صور المنتج">
          {list.map((img, i) => (
            <li key={`${img.url}-thumb-${i}`}>
              <button
                type="button"
                aria-label={`الصورة ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn("store-frame block w-full overflow-hidden rounded-md border-border", i === index && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
              >
                <ProductImage src={img.url || null} alt="" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {videoUrl ? (
        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm store-link underline-offset-4 hover:underline">
          <PlayIcon aria-hidden className="size-4" />
          شاهد فيديو المنتج
        </a>
      ) : null}
      {zoomMounted ? <GalleryZoom open={zoom} onOpenChange={setZoom} name={name} image={list[index]!} /> : null}
    </div>
  );
}
