"use client";

import { useSyncExternalStore } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatNumber } from "@/lib/format";
import { useCart } from "@/features/cart/api";
import { CartPanel } from "@/features/cart/components/cart-panel";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { useCartUi } from "@/stores/cart-ui";

/**
 * The slide-over cart (M11 US-11.1.3): on ≥ 768px a 420px Sheet from the inline END (the
 * left in RTL, so the header's bag icon stays visible — M11 §10), on phones a bottom drawer
 * up to 92% of the height with a drag handle. Both trap focus, make the page behind inert,
 * close on `Esc`/backdrop and hand focus back to the opener (FR-11.07, US-11.1.4).
 */
const MD = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(MD);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(MD).matches, () => true);
}

export function CartSheet() {
  const { store } = useStorefront();
  const open = useCartUi((s) => s.open);
  const close = useCartUi((s) => s.closeCart);
  const { data } = useCart(store);
  const desktop = useIsDesktop();
  const title = (
    <>
      سلتك
      {data && data.count > 0 ? (
        <span className="ms-2 font-mono text-sm font-normal text-muted-foreground tabular-nums">({formatNumber(data.count)})</span>
      ) : null}
    </>
  );
  const onOpenChange = (next: boolean) => {
    if (!next) close();
  };

  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" data-testid="cart-sheet" className="w-full gap-0 p-0 sm:max-w-[420px]">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="store-heading text-lg">{title}</SheetTitle>
          </SheetHeader>
          <CartPanel variant="sheet" onNavigate={close} />
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent data-testid="cart-sheet" className="[--drawer-height:92dvh] [--drawer-content-max-height:92dvh]">
        <DrawerHeader className="border-b border-border px-5 py-3 text-start">
          <DrawerTitle className="store-heading text-lg">{title}</DrawerTitle>
        </DrawerHeader>
        <CartPanel variant="sheet" onNavigate={close} />
      </DrawerContent>
    </Drawer>
  );
}
