"use client";

import { ChevronDownIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useCart, fetchCart } from "@/features/cart/api";
import { CURRENCY_LABELS, CURRENCY_SHORT } from "@/features/storefront/currency";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { useSwitchCurrency } from "@/features/storefront/hooks/use-currency";

/**
 * Currency switcher (M09 US-09.3.1): `SAR` · `USD` · `YER_OLD` · `YER_NEW`. The label shows
 * the currency the page was rendered in; the session cart is re-pinned to it once if it
 * differs (first visit: the session default vs. the visitor's preference — FR-11.08).
 *
 * The menu (Base UI) is in its own chunk, loaded on the FIRST click (T095): until then the
 * header carries a plain button with the same look, so the store's first paint owes it
 * nothing. The real trigger replaces it, already open.
 */
const CurrencyMenu = dynamic(() => import("@/features/storefront/components/currency-menu").then((m) => m.CurrencyMenu), { ssr: false });

export const SWITCHER_CLASS =
  "inline-flex h-11 items-center gap-1 rounded-lg px-2.5 text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 md:h-9";

export function CurrencySwitcher({ className }: { className?: string }) {
  const { store, currency } = useStorefront();
  const { switchTo, pending } = useSwitchCurrency();
  const cart = useCart(store);
  const client = useQueryClient();
  const cartCurrency = cart.data?.currency;
  const [menu, setMenu] = useState<"idle" | "opening" | "ready">("idle");

  // Not while a switch is in flight: the cart is already in the NEW currency while the page
  // (and `currency`) still reflects the old one until the refresh lands.
  useEffect(() => {
    if (pending) return;
    if (cartCurrency && cartCurrency !== currency) void fetchCart(store, client, currency).catch(() => undefined);
  }, [cartCurrency, currency, store, client, pending]);

  if (menu === "idle") {
    return (
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={false}
        aria-label={`${CURRENCY_SHORT[currency]} — العملة: ${CURRENCY_LABELS[currency]}`}
        data-testid="currency-switcher"
        disabled={pending}
        onClick={() => setMenu("opening")}
        className={cn(SWITCHER_CLASS, className)}
      >
        <span className="font-medium">{CURRENCY_SHORT[currency]}</span>
        <ChevronDownIcon aria-hidden className="size-3.5 text-muted-foreground" />
      </button>
    );
  }
  return <CurrencyMenu className={className} currency={currency} pending={pending} initialOpen={menu === "opening"} onReady={() => setMenu("ready")} onPick={switchTo} />;
}
