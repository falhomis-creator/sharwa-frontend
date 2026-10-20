"use client";

import { ShoppingBagIcon } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCart } from "@/features/cart/api";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { useCartUi } from "@/stores/cart-ui";

/**
 * The header's mini-cart (M11 §6): the bag icon with a Mono count badge read from
 * `count` of `GET /api/v1/cart/` (the shared cart key — FR-09.11), hidden at 0. Opens the
 * slide-over and remembers itself as the focus-return target (US-11.1.4).
 */
export function CartButton({ className, variant = "header" }: { className?: string; variant?: "header" | "tab" }) {
  const { store } = useStorefront();
  const { data } = useCart(store);
  const openCart = useCartUi((s) => s.openCart);
  const count = data?.count ?? 0;
  const label = count > 0 ? `السلة، ${formatNumber(count)} ${count === 1 ? "منتج" : "منتجات"}` : "السلة";

  return (
    <button
      type="button"
      data-testid={variant === "header" ? "cart-button" : "cart-tab"}
      aria-label={label}
      onClick={(e) => openCart(e.currentTarget)}
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        variant === "header" ? "size-11 md:size-10" : "h-14 w-full flex-col gap-0.5 text-[11px] hover:bg-transparent",
        className,
      )}
    >
      <span className="relative">
        <ShoppingBagIcon aria-hidden className={variant === "header" ? "size-5" : "size-5"} />
        {count > 0 ? (
          <span
            data-testid="cart-count"
            data-mono
            className="absolute -top-2 -end-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 font-mono text-[10px] font-medium leading-none text-cta-foreground tabular-nums"
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </span>
      {variant === "tab" ? <span>السلة</span> : null}
    </button>
  );
}
