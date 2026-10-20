"use client";

import Link from "next/link";
import { Mono } from "@/components/shared/mono";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * One sidebar row. Three states, each prescribed by M03:
 * - allowed → a link;
 * - feature off → not rendered at all (FR-03.02, US-03.2.1: no «قريباً» text);
 * - permission missing → rendered disabled with a tooltip (T056);
 * - `comingSoon` → disabled with a «قريباً» tag (FR-03.04, reports only).
 *
 * 44px tall on touch viewports, 36px on the desktop grid (constitution: density).
 *
 * Painted for the navy sidebar: the active row is a full-width translucent light block
 * (`bg-white/10`) with white text, exactly as in the owner mockup; the rest is
 * light-on-navy. The rail flyout uses the same navy surface.
 */
export function NavEntry({
  title,
  href,
  active,
  count = 0,
  disabledReason,
  comingSoon,
  onNavigate,
}: {
  title: string;
  href: string;
  active?: boolean;
  count?: number;
  disabledReason?: string;
  comingSoon?: boolean;
  onNavigate?: () => void;
}) {
  const rowClass = cn(
    "flex h-11 items-center justify-between gap-2 rounded-lg px-3 text-sm transition-colors md:h-9",
    active
      ? "bg-white/10 font-medium text-white"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  );

  if (disabledReason || comingSoon) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              aria-disabled="true"
              className={cn(rowClass, "cursor-not-allowed text-sidebar-foreground/45 hover:bg-transparent hover:text-sidebar-foreground/45")}
            />
          }
        >
          <span className="truncate">{title}</span>
          {comingSoon ? <span className="shrink-0 text-xs text-sidebar-foreground/60">قريباً</span> : null}
        </TooltipTrigger>
        <TooltipContent side="inline-start">{disabledReason ?? "قريباً"}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={rowClass}>
      <span className="truncate">{title}</span>
      {count > 0 ? (
        <Mono className="shrink-0 rounded-full bg-cta px-1.5 text-xs text-cta-foreground">{count}</Mono>
      ) : null}
    </Link>
  );
}
