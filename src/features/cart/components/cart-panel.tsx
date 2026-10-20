"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { z } from "zod";
import { Money } from "@/components/shared/money";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { formatNumber, normalizePhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCart, useCartPending, useClearCart, useCoupon } from "@/features/cart/api";
import { CartLineRow } from "@/features/cart/components/cart-lines";
import { lineKey, type Cart } from "@/features/storefront/schemas/cart";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { useCartUi } from "@/stores/cart-ui";
import { useWishlistIds } from "@/stores/wishlist";

/**
 * The cart body shared by the slide-over and `/cart` (M11 §6): lines, the server's summary,
 * the free-shipping note, the coupon, «احفظ سلتي» and ONE dominant «إتمام الطلب» (FR-11.06).
 * Every amount is a server `display_*`; the shipping line says it is computed next, with no
 * number (US-11.3.1).
 */
export function CartPanel({ variant, onNavigate }: { variant: "sheet" | "page"; onNavigate?: () => void }) {
  const { store } = useStorefront();
  const cart = useCart(store);
  const pending = useCartPending(store);
  const notePrices = useCartUi((s) => s.notePrices);
  const [cookiesOff, setCookiesOff] = useState(false);

  useEffect(() => {
    if (!cart.data) return;
    notePrices(Object.fromEntries(cart.data.items.filter((i) => i.display_price).map((i) => [lineKey(i), i.display_price!])));
  }, [cart.data, notePrices]);

  useEffect(() => {
    // M11 §8: a browser that refuses the session cookie must not show a silently empty cart.
    if (typeof navigator !== "undefined" && navigator.cookieEnabled === false) queueMicrotask(() => setCookiesOff(true));
  }, []);

  if (cookiesOff) {
    return <p className="p-5 text-sm text-muted-foreground">فعّل الكوكيز في متصفحك لاستخدام السلة.</p>;
  }
  if (cart.isPending) return <CartSkeleton />;
  if (cart.isError) {
    return (
      <div className="space-y-3 p-5 text-sm">
        <p>لم نستطع تحميل سلتك.</p>
        <Button variant="outline" className="h-11" onClick={() => cart.refetch()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }
  const data = cart.data;
  if (data.items.length === 0) return <EmptyCart onNavigate={onNavigate} />;

  const blocked = pending || data.items.some((i) => i.is_available === false || i.display_price === null);
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", variant === "page" && "gap-6 md:grid md:grid-cols-[1fr_22rem] md:items-start md:gap-10")}>
      <ul data-testid="cart-lines" className={cn("divide-y divide-border", variant === "sheet" && "min-h-0 flex-1 overflow-y-auto px-5")}>
        {data.items.map((item) => (
          <CartLineRow key={`${lineKey(item)}|${item.start_datetime ?? ""}`} item={item} />
        ))}
      </ul>
      <CartSummary cart={data} blocked={blocked} pending={pending} variant={variant} onNavigate={onNavigate} />
    </div>
  );
}

function CartSummary({
  cart,
  blocked,
  pending,
  variant,
  onNavigate,
}: {
  cart: Cart;
  blocked: boolean;
  pending: boolean;
  variant: "sheet" | "page";
  onNavigate?: () => void;
}) {
  const { store } = useStorefront();
  const clear = useClearCart(store);
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <div
      className={cn(
        "space-y-3 bg-background",
        variant === "sheet"
          ? "border-t border-border px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          : "store-frame rounded-xl border-border p-5 md:sticky md:top-24 shadow-card bg-card",
      )}
    >
      <FreeShippingNote cart={cart} />
      <dl className="space-y-1.5 text-sm">
        <Row label={`المجموع الفرعي (${formatNumber(cart.count)})`} value={<Money value={cart.display_subtotal} className={pending ? "opacity-50" : undefined} />} />
        {(cart.applied_offers ?? []).map((o) => (
          <Row key={o.name} label={`عرض: ${o.name}`} value={<span className="text-success">− <Money value={o.display_discount} /></span>} />
        ))}
        {cart.coupon_code && cart.display_discount ? (
          <Row label={`كود الخصم ${cart.coupon_code}`} value={<span className="text-success">− <Money value={cart.display_discount} /></span>} />
        ) : null}
        <Row label="الشحن" value={<span className="text-muted-foreground">يُحسب في الخطوة التالية</span>} />
        {cart.display_total && (cart.coupon_code || (cart.applied_offers ?? []).length > 0) ? (
          <Row strong label="الإجمالي قبل الشحن" value={<Money value={cart.display_total} className={pending ? "opacity-50" : undefined} />} />
        ) : null}
      </dl>
      <div className="flex flex-col items-start gap-1">
        <CouponField cart={cart} />
        <SaveCart />
      </div>
      <Link
        href="/checkout"
        data-testid="checkout-button"
        aria-disabled={blocked}
        onClick={(e) => {
          if (blocked) e.preventDefault();
          else onNavigate?.();
        }}
        className={cn(buttonVariants({ variant: "cta" }), "h-12 w-full text-base", blocked && "pointer-events-none opacity-50")}
      >
        إتمام الطلب
      </Link>
      <div className="flex items-center justify-between text-sm">
        <Link href="/products" onClick={onNavigate} className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground">
          متابعة التسوق
        </Link>
        {confirmClear ? (
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground">إفراغ السلة؟</span>
            <button
              type="button"
              className="min-h-11 rounded-md px-2 font-medium text-destructive hover:bg-muted"
              onClick={() => {
                setConfirmClear(false);
                clear.mutate();
              }}
            >
              نعم
            </button>
            <button type="button" className="min-h-11 rounded-md px-2 text-muted-foreground hover:bg-muted" onClick={() => setConfirmClear(false)}>
              لا
            </button>
          </span>
        ) : (
          <button type="button" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground" onClick={() => setConfirmClear(true)}>
            إفراغ السلة
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", strong && "border-t border-border pt-2 font-semibold")}>
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="text-end">{value}</dd>
    </div>
  );
}

/** US-11.3.3: a 1px track with a zinc fill and a text note — the percentage is the server's. */
function FreeShippingNote({ cart }: { cart: Cart }) {
  if (cart.free_shipping_applies) return <p className="text-sm text-success">حصلت على شحن مجاني</p>;
  if (!cart.display_free_shipping_remaining || cart.free_shipping_progress == null) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-sm">
        أضف <Money value={cart.display_free_shipping_remaining} /> للشحن المجاني
      </p>
      <div
        className="h-1 w-full overflow-hidden rounded-full border border-border"
        role="progressbar"
        aria-label="التقدّم نحو الشحن المجاني"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={cart.free_shipping_progress}
      >
        <div className="h-full bg-foreground/70" style={{ width: `${cart.free_shipping_progress}%` }} />
      </div>
    </div>
  );
}

/** US-11.4.1: collapsed by default; errors are the server's sentences, verbatim. */
export function CouponField({ cart }: { cart: Cart }) {
  const { store } = useStorefront();
  const { apply, remove } = useCoupon(store);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (cart.coupon_code) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span>
          الكود <span className="font-mono tabular-nums" dir="ltr">{cart.coupon_code}</span> مُطبَّق
        </span>
        <button type="button" className="min-h-11 text-muted-foreground hover:text-foreground" onClick={() => remove.mutate()} disabled={remove.isPending}>
          إزالة
        </button>
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" className="inline-flex min-h-11 items-center text-sm store-link" onClick={() => setOpen(true)} data-testid="coupon-toggle">
        لديك كود خصم؟
      </button>
    );
  }
  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        apply.mutate(code, {
          onError: (err) => setError(isApiError(err) ? err.userMessage : "تعذّر تطبيق الكود."),
          onSuccess: () => setCode(""),
        });
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">
        كود الخصم
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          data-testid="coupon-input"
          dir="ltr"
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="store-frame h-11 min-w-0 flex-1 rounded-lg border-input bg-background px-3 font-mono text-sm uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive"
        />
        <Button type="submit" variant="outline" className="h-11 px-4" disabled={!code.trim() || apply.isPending}>
          تطبيق
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} data-testid="coupon-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/** US-11.5.1: the phone for the abandoned-cart reminder, sent once per store and browser. */
function SaveCart() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "saved") return <p className="text-sm text-muted-foreground">حفظنا سلتك، وسنذكّرك بها عبر واتساب.</p>;
  if (!open) {
    return (
      <button type="button" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(true)}>
        احفظ سلتي برقم واتساب
      </button>
    );
  }
  return (
    <form
      className="space-y-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("saving");
        setError(null);
        try {
          await apiFetch("/api/bff/cart/contact", z.unknown(), { method: "POST", json: { phone: normalizePhone(phone) } });
          setState("saved");
        } catch (err) {
          setState("idle");
          setError(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
        }
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">
        رقم واتساب
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="store-frame h-11 min-w-0 flex-1 rounded-lg border-input bg-background px-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <Button type="submit" variant="outline" className="h-11 px-4" disabled={!phone.trim() || state === "saving"}>
          حفظ
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

function EmptyCart({ onNavigate }: { onNavigate?: () => void }) {
  const { store } = useStorefront();
  const wishlist = useWishlistIds(store);
  return (
    <div data-testid="cart-empty" className="space-y-3 p-5">
      <p className="store-heading text-lg font-semibold">سلتك فارغة</p>
      <p className="text-sm text-muted-foreground">أضف منتجاً من المتجر وسيظهر هنا.</p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <Link href="/products" onClick={onNavigate} className="inline-flex min-h-11 items-center store-link underline-offset-4 hover:underline">
          تصفّح الأقسام
        </Link>
        {wishlist.length > 0 ? (
          <Link href="/wishlist" onClick={onNavigate} className="inline-flex min-h-11 items-center store-link underline-offset-4 hover:underline">
            المفضلة
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <ul aria-hidden className="divide-y divide-border px-5">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex gap-3 py-4">
          <div className="size-16 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-9 w-28 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
