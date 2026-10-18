"use client";

import { BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToggleWishlist } from "@/features/engagement/api";
import { ShopperPhoneDrawer } from "@/features/engagement/components/shopper-phone-drawer";
import { useShopperUi } from "@/features/engagement/shopper-ui";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { useWishlistIds } from "@/stores/wishlist";

/**
 * The save button (M42 US-42.1, FR-42.09): Lucide `bookmark` in two states, `aria-pressed`,
 * a 44px target, no colour change (constitution I — the store's own ink). `card` sits over
 * the product image; `pdp` is the labelled button in the buy box. Optimistic through
 * `useToggleWishlist`; the first save asks the phone once (the panel mounts next to the
 * button that asked, so no global chrome is needed).
 */
export function WishlistButton({ productId, variant = "card", className }: { productId: number; variant?: "card" | "pdp"; className?: string }) {
  const { store } = useStorefront();
  const on = useWishlistIds(store).includes(productId);
  const toggle = useToggleWishlist(store);
  const asking = useShopperUi((s) => s.open && s.pending === productId);
  const label = on ? "أُزيل من قائمتك عند الضغط" : "احفظ في قائمتك";
  const icon = <BookmarkIcon aria-hidden className={cn(variant === "card" ? "size-5" : "size-4", on && "fill-current")} />;

  return (
    <>
      {variant === "card" ? (
        <button
          type="button"
          aria-pressed={on}
          aria-label={on ? "إزالة من قائمتك" : "احفظ في قائمتك"}
          title={label}
          data-testid="card-wishlist"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle.mutate(productId);
          }}
          className={cn(
            "absolute top-1.5 start-1.5 z-[1] flex size-11 items-center justify-center rounded-lg text-foreground outline-none transition-colors hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
            className,
          )}
        >
          {icon}
        </button>
      ) : (
        <Button variant="ghost" className={cn("h-11 gap-2", className)} aria-pressed={on} data-testid="wishlist-toggle" onClick={() => toggle.mutate(productId)}>
          {icon}
          {on ? "محفوظ" : "احفظ"}
        </Button>
      )}
      {asking ? <ShopperPhoneDrawer /> : null}
    </>
  );
}
