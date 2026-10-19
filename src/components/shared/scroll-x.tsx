"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontal scroll container for content wider than its column (tables, boards, calendars,
 * tab strips). The page itself never scrolls sideways; this box does, and says so: a small
 * zinc chip appears on whichever inline edge still hides content (end first, start once the
 * user has scrolled). No gradient — a 1px-bordered chip, consistent with the restrained
 * surfaces. Direction-agnostic: `scrollLeft` is negative in RTL, so only its magnitude is used.
 *
 * `className` styles the outer frame (border, radius, responsive visibility); `scrollerClassName`
 * and the remaining props go on the scrolling element itself.
 */
export function ScrollX({
  className,
  scrollerClassName,
  children,
  cue = "chip",
  cueAlign = "top",
  ...props
}: ComponentProps<"div"> & {
  scrollerClassName?: string;
  cue?: "chip" | "none";
  /** `top` sits the chip in a table's header row; `center` suits a one-row strip (tabs, days). */
  cueAlign?: "top" | "center";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const hidden = el.scrollWidth - el.clientWidth;
    const offset = Math.abs(el.scrollLeft);
    const next = { start: hidden > 2 && offset > 2, end: hidden > 2 && offset < hidden - 2 };
    setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const chip = cn(
    "pointer-events-none absolute z-20 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground",
    cueAlign === "center" ? "top-1/2 -translate-y-1/2" : "top-1.5",
  );

  return (
    <div className={cn("relative min-w-0", className)}>
      <div ref={ref} className={cn("overflow-x-auto rounded-[inherit]", scrollerClassName)} {...props}>
        {children}
      </div>
      {cue === "chip" && edges.start ? (
        <span aria-hidden className={cn(chip, "start-1.5")} data-scroll-cue="start">
          <ChevronLeft className="size-3.5 rtl:rotate-180" strokeWidth={1.75} />
        </span>
      ) : null}
      {cue === "chip" && edges.end ? (
        <span aria-hidden className={cn(chip, "end-1.5")} data-scroll-cue="end">
          <ChevronRight className="size-3.5 rtl:rotate-180" strokeWidth={1.75} />
        </span>
      ) : null}
    </div>
  );
}
