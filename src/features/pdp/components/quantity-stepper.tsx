"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { UNIT_LABELS } from "@/features/products/schemas/enums";
import { formatNumber } from "@/lib/format";
import type { ProductDetail } from "@/features/storefront/schemas/catalog";
import { usePdp } from "@/stores/pdp";

/**
 * Quantity within `min_quantity`/`max_quantity` and the stock (unless back-orders are
 * allowed), with the unit when it is not «قطعة» (US-10.1.4). Hidden for auctions (stock is 1).
 */
export function QuantityStepper({ product, stock }: { product: ProductDetail; stock: number }) {
  const quantity = usePdp((s) => s.quantity);
  const set = usePdp((s) => s.set);
  const min = Math.max(1, product.min_quantity ?? 1);
  const cap = [product.max_quantity ?? Infinity, product.allow_backorder ? Infinity : Math.max(stock, min)].reduce((a, b) => Math.min(a, b), Infinity);
  const unit = product.unit && product.unit !== "piece" ? UNIT_LABELS[product.unit] : null;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium">الكمية</span>
      <div className="store-frame inline-flex items-center rounded-lg border-border" role="group" aria-label={`كمية ${product.name}`}>
        <button
          type="button"
          aria-label="إنقاص الكمية"
          disabled={quantity <= min}
          onClick={() => set({ quantity: Math.max(min, quantity - 1) })}
          className="flex size-11 items-center justify-center disabled:opacity-40"
        >
          <MinusIcon aria-hidden className="size-4" />
        </button>
        <span data-testid="pdp-qty" aria-live="polite" className="min-w-10 text-center font-mono text-sm tabular-nums">
          {formatNumber(quantity)}
        </span>
        <button
          type="button"
          aria-label="زيادة الكمية"
          disabled={quantity >= cap}
          onClick={() => set({ quantity: Math.min(cap, quantity + 1) })}
          className="flex size-11 items-center justify-center disabled:opacity-40"
        >
          <PlusIcon aria-hidden className="size-4" />
        </button>
      </div>
      {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
      {product.max_quantity ? (
        <span className="text-xs text-muted-foreground">
          الحد الأقصى <span className="font-mono tabular-nums">{formatNumber(product.max_quantity)}</span>
        </span>
      ) : null}
    </div>
  );
}
