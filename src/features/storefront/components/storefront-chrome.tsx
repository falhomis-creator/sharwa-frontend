"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useCartUi } from "@/stores/cart-ui";
import type { CategoryNode } from "@/features/storefront/schemas/catalog";
import { MobileTabBar } from "@/features/storefront/components/mobile-tab-bar";
import { WhatsAppButton } from "@/features/storefront/components/store-footer";
import { hydrateWishlist } from "@/stores/wishlist";

// The slide-over (Sheet + Drawer + the cart panel) is mounted on the FIRST open and stays
// mounted afterwards, so its code never sits in the first paint of a page that may never
// open it (T095). The header badge and the bottom bar need none of it.
const CartSheet = dynamic(() => import("@/features/cart/components/cart-sheet").then((m) => m.CartSheet), { ssr: false });
// Client-only by nature (localStorage, `beforeinstallprompt`): never part of the HTML or the first chunk.
const InstallPrompt = dynamic(() => import("@/features/pwa/components/install-prompt").then((m) => m.InstallPrompt), { ssr: false });
const ServiceWorkerRegister = dynamic(() => import("@/features/pwa/components/sw-register").then((m) => m.ServiceWorkerRegister), { ssr: false });

function LazyCartSheet() {
  const open = useCartUi((s) => s.open);
  const [mounted, setMounted] = useState(open);
  // Latch at render time (the documented "adjust state while rendering" pattern): no effect, no ref.
  if (open && !mounted) setMounted(true);
  return mounted || open ? <CartSheet /> : null;
}

/**
 * The client-only furniture every storefront page shares: the cart slide-over, the phone's
 * bottom bar, the WhatsApp button and the toaster (bottom-start, light — the store keeps its
 * own palette, R-09). The local wishlist loads here, after the first paint, so server and
 * client agree on the first render.
 */
export function StorefrontChrome({
  categories,
  whatsapp,
  storeName,
  children,
}: {
  categories: CategoryNode[];
  whatsapp: string | null;
  storeName: string;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    hydrateWishlist();
  }, []);

  return (
    <>
      <LazyCartSheet />
      <MobileTabBar categories={categories} />
      {whatsapp ? <WhatsAppButton number={whatsapp} /> : null}
      {children}
      <InstallPrompt storeName={storeName} />
      <ServiceWorkerRegister />
      {/* bottom-START in RTL is the right edge; on phones it clears the bottom bar. */}
      <Toaster theme="light" position="bottom-right" dir="rtl" mobileOffset={{ bottom: "5rem" }} />
    </>
  );
}
