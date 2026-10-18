"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Every storefront picture goes through `next/image` at a FIXED aspect ratio, so nothing
 * shifts while it loads (FR-09.09, SC-09.1). Above-the-fold images pass `priority`; the rest
 * are lazy. Images that are not served from this origin (data URLs of uploads, an external
 * `image_url`) are rendered `unoptimized` — the documented exception (M09 §8) — and a broken
 * one falls back to the missing-image tile instead of a broken icon.
 *
 * Missing image (M09 §6): a 1px-bordered muted square with the product's name — no generic
 * icon (constitution I). It is set in the BODY font on purpose: the heading face is loaded
 * at weight 700 only (its 400 file would be fetched just for these tiles — T095).
 */
export function ProductImage({
  src,
  alt,
  ratio = "square",
  priority = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  className,
  dimmed = false,
  thumb = false,
}: {
  src: string | null | undefined;
  alt: string;
  ratio?: "square" | "portrait" | "wide" | "banner";
  priority?: boolean;
  sizes?: string;
  className?: string;
  dimmed?: boolean;
  /** Small thumbnails (cart lines, summaries): the fallback shows the name's first letter. */
  thumb?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const aspect = {
    square: "aspect-square",
    portrait: "aspect-[4/5]",
    wide: "aspect-[16/9]",
    banner: "aspect-[21/9]",
  }[ratio];
  const external = Boolean(src && !src.startsWith("/"));

  return (
    <div className={cn("relative w-full overflow-hidden bg-muted", aspect, className)}>
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          unoptimized={external}
          onError={() => setFailed(true)}
          className={cn("object-cover transition-opacity", dimmed && "opacity-60")}
        />
      ) : (
        <div
          aria-hidden
          className={cn(
            // Dimming is NOT applied to the fallback text: at 60% it would fall under AA contrast.
            "absolute inset-0 flex items-center justify-center p-4 text-center text-sm leading-relaxed text-muted-foreground md:text-base",
            thumb && "p-1",
          )}
        >
          {thumb ? <span className="text-lg font-semibold">{[...alt.trim()][0] ?? ""}</span> : <span className="line-clamp-3">{alt}</span>}
        </div>
      )}
    </div>
  );
}
