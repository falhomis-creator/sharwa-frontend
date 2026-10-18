"use client";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { CartSheet } from "@/features/cart/components/cart-sheet";
import type { CategoryNode } from "@/features/storefront/schemas/catalog";
import { MobileTabBar } from "@/features/storefront/components/mobile-tab-bar";
import { WhatsAppButton } from "@/features/storefront/components/store-footer";
import { hydrateWishlist } from "@/stores/wishlist";

/**
 * The client-only furniture every storefront page shares: the cart slide-over, the phone's
 * bottom bar, the WhatsApp button and the toaster (bottom-start, light — the store keeps its
 * own palette, R-09). The local wishlist loads here, after the first paint, so server and
 * client agree on the first render.
 */
export function StorefrontChrome({
  categories,
  whatsapp,
  children,
}: {
  categories: CategoryNode[];
  whatsapp: string | null;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    hydrateWishlist();
  }, []);

  return (
    <>
      <CartSheet />
      <MobileTabBar categories={categories} />
      {whatsapp ? <WhatsAppButton number={whatsapp} /> : null}
      {children}
      {/* bottom-START in RTL is the right edge; on phones it clears the bottom bar. */}
      <Toaster theme="light" position="bottom-right" dir="rtl" mobileOffset={{ bottom: "5rem" }} />
    </>
  );
}
