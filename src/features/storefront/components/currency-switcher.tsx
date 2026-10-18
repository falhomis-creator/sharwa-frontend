"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCart, fetchCart } from "@/features/cart/api";
import { CURRENCIES, CURRENCY_LABELS, CURRENCY_SHORT, type Currency } from "@/features/storefront/currency";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { useSwitchCurrency } from "@/features/storefront/hooks/use-currency";

/**
 * Currency switcher (M09 US-09.3.1): `SAR` · `USD` · `YER_OLD` · `YER_NEW`. The label shows
 * the currency the page was rendered in; the session cart is re-pinned to it once if it
 * differs (first visit: the session default vs. the visitor's preference — FR-11.08).
 */
export function CurrencySwitcher({ className }: { className?: string }) {
  const { store, currency } = useStorefront();
  const { switchTo, pending } = useSwitchCurrency();
  const cart = useCart(store);
  const client = useQueryClient();
  const cartCurrency = cart.data?.currency;

  // Not while a switch is in flight: the cart is already in the NEW currency while the page
  // (and `currency`) still reflects the old one until the refresh lands.
  useEffect(() => {
    if (pending) return;
    if (cartCurrency && cartCurrency !== currency) void fetchCart(store, client, currency).catch(() => undefined);
  }, [cartCurrency, currency, store, client, pending]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${CURRENCY_SHORT[currency]} — العملة: ${CURRENCY_LABELS[currency]}`}
        data-testid="currency-switcher"
        disabled={pending}
        className={cn(
          "inline-flex h-11 items-center gap-1 rounded-lg px-2.5 text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 md:h-9",
          className,
        )}
      >
        <span className="font-medium">{CURRENCY_SHORT[currency]}</span>
        <ChevronDownIcon aria-hidden className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {CURRENCIES.map((c: Currency) => (
          <DropdownMenuItem key={c} onClick={() => c !== currency && switchTo(c)} data-testid={`currency-${c}`}>
            <span className="flex-1">{CURRENCY_LABELS[c]}</span>
            {c === currency ? <CheckIcon aria-hidden className="!text-foreground" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
