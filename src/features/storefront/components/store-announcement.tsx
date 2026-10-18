"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnnouncementBar } from "@/components/ui/announcement-bar";
import { SCROLL_SPEED_SECONDS } from "@/features/settings/schemas";
import { visiblePath } from "@/features/storefront/components/storefront-provider";

/**
 * The announcement line above the header (M09 US-09.6). Shown only on the page kinds the
 * merchant enabled (`show_banner_on_home/_products/_product_detail/_checkout`); until Django
 * exports those flags, on the home page only. It moves only when the text overflows, pauses
 * on hover and stops under reduced motion (the bar component handles both).
 */
export interface AnnouncementConfig {
  text: string;
  background: string;
  color: string;
  speed: "slow" | "medium" | "fast";
  onHome: boolean;
  onProducts: boolean;
  onProductDetail: boolean;
  onCheckout: boolean;
}

function pageKind(path: string): "home" | "products" | "detail" | "checkout" | "other" {
  if (path === "/") return "home";
  if (path.startsWith("/p/")) return "detail";
  if (path.startsWith("/checkout")) return "checkout";
  if (path.startsWith("/c/") || path.startsWith("/products") || path.startsWith("/search")) return "products";
  return "other";
}

export function StoreAnnouncement({ config }: { config: AnnouncementConfig }) {
  const path = visiblePath(usePathname());
  const kind = pageKind(path);
  const measure = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = measure.current;
    if (!el) return;
    // The observer fires once on `observe()`, so no synchronous setState in the effect body.
    const ro = new ResizeObserver(() => setOverflows(el.scrollWidth > el.clientWidth + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [config.text]);

  const visible =
    (kind === "home" && config.onHome) ||
    (kind === "products" && config.onProducts) ||
    (kind === "detail" && config.onProductDetail) ||
    (kind === "checkout" && config.onCheckout);
  if (!visible) return null;

  return (
    <div className="relative" data-testid="store-announcement">
      {/* Off-screen twin used only to measure whether the line fits. */}
      <p ref={measure} aria-hidden className="pointer-events-none invisible absolute inset-x-0 h-0 overflow-hidden whitespace-nowrap px-4 text-[13px] font-medium">
        {config.text}
      </p>
      <AnnouncementBar
        text={config.text}
        background={config.background}
        color={config.color}
        seconds={SCROLL_SPEED_SECONDS[config.speed]}
        animate={overflows}
      />
    </div>
  );
}
