"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CURRENCIES, CURRENCY_LABELS, CURRENCY_SHORT, type Currency } from "@/features/storefront/currency";
import { SWITCHER_CLASS } from "@/features/storefront/components/currency-switcher";

/** The real menu behind `CurrencySwitcher`; opens at once when it replaces the placeholder. */
export function CurrencyMenu({
  className,
  currency,
  pending,
  initialOpen,
  onReady,
  onPick,
}: {
  className?: string;
  currency: Currency;
  pending: boolean;
  initialOpen: boolean;
  onReady: () => void;
  onPick: (c: Currency) => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Keep keyboard focus where the placeholder had it.
    trigger.current?.focus({ preventScroll: true });
    onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        ref={trigger}
        aria-label={`${CURRENCY_SHORT[currency]} — العملة: ${CURRENCY_LABELS[currency]}`}
        data-testid="currency-switcher"
        disabled={pending}
        className={cn(SWITCHER_CLASS, className)}
      >
        <span className="font-medium">{CURRENCY_SHORT[currency]}</span>
        <ChevronDownIcon aria-hidden className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {CURRENCIES.map((c: Currency) => (
          <DropdownMenuItem key={c} onClick={() => c !== currency && onPick(c)} data-testid={`currency-${c}`}>
            <span className="flex-1">{CURRENCY_LABELS[c]}</span>
            {c === currency ? <CheckIcon aria-hidden className="!text-foreground" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
