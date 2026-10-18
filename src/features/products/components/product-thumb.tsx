"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Product thumbnail: the first gallery image, or a neutral 1px-bordered tile with the
 * name's first letter — never a stock illustration (constitution I). A broken external
 * `image_url` falls back to the same tile with «تعذّر تحميل الصورة» as its title (M04 §8).
 * Data/blob URLs from the mock are rendered unoptimized.
 */
export function ProductThumb({ src, name, size = 32, className }: { src: string | null; name: string; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (src && !broken) {
    return (
      <span className={cn("relative block shrink-0 overflow-hidden rounded-md border border-border bg-muted", className)} style={style}>
        <Image src={src} alt="" fill sizes={`${size}px`} unoptimized className="object-cover" onError={() => setBroken(true)} />
      </span>
    );
  }
  return (
    <span
      aria-hidden={!broken}
      role={broken ? "img" : undefined}
      aria-label={broken ? "تعذّر تحميل الصورة" : undefined}
      title={broken ? "تعذّر تحميل الصورة" : undefined}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border border-border bg-muted text-xs text-muted-foreground",
        className,
      )}
      style={style}
    >
      {name.trim().slice(0, 1)}
    </span>
  );
}
