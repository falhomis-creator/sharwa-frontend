"use client";

import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Money } from "@/components/shared/money";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartAction } from "@/features/cart/api";
import { lineKey, type CartItem } from "@/features/storefront/schemas/cart";
import { ProductImage } from "@/features/storefront/components/product-image";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { useCartUi } from "@/stores/cart-ui";

/**
 * One cart line (M11 FR-11.05): image, name → PDP, variant, unit price, a −/+ stepper
 * (44px each, named after the product for screen readers — SC-11.5), the line subtotal and
 * a remove control. A line still waiting for the server shows its previous subtotal dimmed
 * as «…» — never a locally computed amount (FR-11.04).
 */
function variantText(item: CartItem): string | null {
  if (item.variant_label) return item.variant_label;
  const parts = [item.size, item.color].filter(Boolean);
  return parts.length ? parts.join(" / ") : null;
}

export function CartLineRow({ item, compact = false }: { item: CartItem; compact?: boolean }) {
  const { store, timezone } = useStorefront();
  const action = useCartAction(store);
  const key = lineKey(item);
  const changed = useCartUi((s) => s.changedKeys.includes(key));
  const capped = useCartUi((s) => s.cappedKeys[key]);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const pending = item.display_subtotal === null && item.is_available !== false;
  const unavailable = item.is_available === false || item.display_price === null;
  const variant = variantText(item);
  const base = { product_id: item.product_id, size: item.size, color: item.color, variant_id: item.variant_id };

  return (
    <li data-testid="cart-line" data-pending={pending || undefined} className={cn("flex gap-3 py-4", unavailable && "opacity-70")}>
      <Link href={`/p/${item.product_id}`} className="store-frame w-16 shrink-0 self-start overflow-hidden rounded-md border-border md:w-20" tabIndex={-1} aria-hidden>
        <ProductImage src={item.image} alt={item.name} sizes="80px" thumb />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/p/${item.product_id}`} className="line-clamp-2 text-sm font-medium leading-6 hover:underline">
            {item.name}
          </Link>
          <button
            type="button"
            aria-label={`إزالة ${item.name} من السلة`}
            onClick={() => action.mutate({ ...base, action_type: "remove_line" })}
            className="-me-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Trash2Icon aria-hidden className="size-4" />
          </button>
        </div>
        {variant ? <p className="text-xs text-muted-foreground">{variant}</p> : null}
        {item.start_datetime ? (
          <p className="text-xs text-muted-foreground">
            الموعد: <span className="tabular-nums">{formatDateTime(item.start_datetime, timezone)}</span>{" "}
            <Link href={`/p/${item.product_id}`} className="store-link underline-offset-4 hover:underline">
              تغيير
            </Link>
          </p>
        ) : null}
        {unavailable ? (
          <p className="text-xs text-destructive">غير متاح الآن — أزِله للمتابعة</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            سعر الوحدة <Money value={item.display_price} />
            {changed ? <span className="ms-2 text-warning">تغيّر السعر</span> : null}
          </p>
        )}
        {capped !== undefined ? <p className="text-xs text-warning">الكمية المتاحة {formatNumber(capped)} فقط</p> : null}
        <div className={cn("mt-1 flex items-center justify-between gap-2", compact && "mt-0")}>
          {item.is_auction ? (
            <span className="text-xs text-muted-foreground">منتج مزاد — الكمية ثابتة على 1</span>
          ) : confirmRemove ? (
            <div className="flex items-center gap-1 text-sm" role="group" aria-label="تأكيد الإزالة">
              <span className="text-muted-foreground">إزالة؟</span>
              <button
                type="button"
                className="min-h-11 rounded-md px-3 font-medium hover:bg-muted"
                onClick={() => {
                  setConfirmRemove(false);
                  action.mutate({ ...base, action_type: "remove_line" });
                }}
              >
                نعم
              </button>
              <button type="button" className="min-h-11 rounded-md px-3 text-muted-foreground hover:bg-muted" onClick={() => setConfirmRemove(false)}>
                لا
              </button>
            </div>
          ) : (
            <div className="store-frame inline-flex items-center rounded-lg border-border" role="group" aria-label={`كمية ${item.name}`}>
              <button
                type="button"
                aria-label={`إنقاص كمية ${item.name}`}
                disabled={unavailable}
                onClick={() => (item.quantity <= 1 ? setConfirmRemove(true) : action.mutate({ ...base, action_type: "decrease" }))}
                className="flex size-11 items-center justify-center text-foreground disabled:opacity-40"
              >
                <MinusIcon aria-hidden className="size-4" />
              </button>
              <span data-testid="cart-line-qty" aria-live="polite" className="min-w-8 text-center font-mono text-sm tabular-nums">
                {formatNumber(item.quantity)}
              </span>
              <button
                type="button"
                aria-label={`زيادة كمية ${item.name}`}
                // An appointment line is one booking (quantity 1, M26) — another time is chosen on the product page.
                disabled={unavailable || Boolean(item.start_datetime) || (item.max_quantity != null && item.quantity >= item.max_quantity)}
                onClick={() =>
                  action.mutate({ ...base, action_type: "add", start_datetime: item.start_datetime ?? undefined, quantity: 1 })
                }
                className="flex size-11 items-center justify-center text-foreground disabled:opacity-40"
              >
                <PlusIcon aria-hidden className="size-4" />
              </button>
            </div>
          )}
          <span className={cn("text-sm font-semibold", pending && "opacity-50")}>
            {pending ? <span aria-label="يتحدّث">…</span> : <Money value={item.display_subtotal} />}
          </span>
        </div>
      </div>
    </li>
  );
}
