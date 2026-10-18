"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

/**
 * Previous/next for a horizontal rail, desktop only (phones swipe). Arrows follow the reading
 * direction: «التالي» points to the inline END (left in RTL) — `rtl:rotate-180` (M09 §11 II).
 */
export function RailControls({ target }: { target: string }) {
  const scroll = (dir: 1 | -1) => {
    const el = document.getElementById(target);
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return (
    <div className="pointer-events-none absolute -top-14 end-0 hidden gap-1 md:flex">
      <button type="button" aria-label="السابق" onClick={() => scroll(-1)} className="store-frame pointer-events-auto flex size-10 items-center justify-center rounded-full border-border bg-background hover:bg-muted">
        <ChevronRightIcon aria-hidden className="size-4 rtl:rotate-0 ltr:rotate-180" />
      </button>
      <button type="button" aria-label="التالي" onClick={() => scroll(1)} className="store-frame pointer-events-auto flex size-10 items-center justify-center rounded-full border-border bg-background hover:bg-muted">
        <ChevronLeftIcon aria-hidden className="size-4 rtl:rotate-0 ltr:rotate-180" />
      </button>
    </div>
  );
}
