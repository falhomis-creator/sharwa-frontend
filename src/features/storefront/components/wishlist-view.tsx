"use client";

import { BellIcon, ShoppingBagIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useCartAction } from "@/features/cart/api";
import { useSetShopperPhone, useShopperPhone, useToggleWishlist, useWishlistQuery } from "@/features/engagement/api";
import { ShopperPhoneForm } from "@/features/engagement/components/shopper-phone-drawer";
import { BackInStockSchema, wishlistItemState, type WishlistProduct } from "@/features/engagement/schemas";
import { ProductCard, ProductGridSkeleton } from "@/features/storefront/components/product-card";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { lineKey } from "@/features/storefront/schemas/cart";
import { useCartUi } from "@/stores/cart-ui";

/**
 * `/wishlist` (M42 US-42.2): the saved products with the store's own cards and the CURRENT
 * server prices (FR-42.04). Three states per item — available (add to cart), sold out
 * («نبّهني عند التوفر»), no longer available (dimmed, remove only). The list is the
 * session's phone; without one, the page asks for it inline.
 */
export function WishlistView() {
  const { store, currency } = useStorefront();
  const shopper = useShopperPhone(store);
  const setPhone = useSetShopperPhone(store);
  const phone = shopper.data?.phone_normalized ?? null;
  const list = useWishlistQuery(store, currency, Boolean(phone));
  const toggle = useToggleWishlist(store);

  if (shopper.isPending) return <ProductGridSkeleton count={4} />;
  if (!phone) {
    return (
      <div className="store-frame max-w-md space-y-3 rounded-xl border-border p-5 shadow-card bg-card" data-testid="wishlist-phone">
        <p className="text-sm text-muted-foreground">قائمتك محفوظة على رقم هاتفك. أدخله مرة واحدة لتجدها هنا وعلى أي جهاز.</p>
        <ShopperPhoneForm busy={setPhone.isPending} submitLabel="عرض قائمتي" onSubmit={async (p) => void (await setPhone.mutateAsync(p))} />
      </div>
    );
  }
  if (list.isPending) return <ProductGridSkeleton count={4} />;
  if (list.isError) {
    return (
      <div className="space-y-3" role="alert">
        <p className="text-sm text-destructive">تعذّر تحميل قائمتك.</p>
        <Button variant="outline" className="h-11" onClick={() => void list.refetch()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }
  const items = list.data.items;
  if (items.length === 0) {
    return (
      <div className="space-y-3" data-testid="wishlist-empty">
        <p className="text-sm text-muted-foreground">لم تحفظ شيئاً بعد. اضغط «احفظ» على أي منتج لتجده هنا.</p>
        <Link href="/products" className="store-link inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline">
          تصفّح المنتجات
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-[var(--store-grid-gap)] sm:grid-cols-3 lg:grid-cols-4" data-testid="wishlist-items">
      {items.map(({ product }) => (
        <li key={product.id} className="flex flex-col gap-2">
          <WishlistItem product={product} phone={phone} onRemove={() => toggle.mutate(product.id)} removing={toggle.isPending} />
        </li>
      ))}
    </ul>
  );
}

function WishlistItem({ product, phone, onRemove, removing }: { product: WishlistProduct; phone: string; onRemove: () => void; removing: boolean }) {
  const { store } = useStorefront();
  const state = wishlistItemState(product);
  const cart = useCartAction(store);
  const openCart = useCartUi((s) => s.openCart);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className={cn("flex h-full flex-col gap-2", state === "unavailable" && "opacity-60")} data-state={state} data-testid="wishlist-item">
      <div className="relative flex-1">
        <ProductCard product={product} saveable={false} />
        <button
          type="button"
          aria-label="إزالة من قائمتك"
          onClick={onRemove}
          disabled={removing}
          className="absolute top-1.5 start-1.5 z-[1] flex size-11 items-center justify-center rounded-lg text-foreground hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="wishlist-remove"
        >
          <XIcon aria-hidden className="size-5" />
        </button>
      </div>
      {state === "unavailable" ? (
        <p className="text-xs text-muted-foreground">لم يعد متاحاً</p>
      ) : state === "sold_out" ? (
        <Button
          variant="outline"
          className="h-11 w-full gap-2"
          disabled={subscribed || busy}
          data-testid="wishlist-notify"
          onClick={async () => {
            setBusy(true);
            try {
              await apiFetch(`/api/bff/catalog/products/${product.id}/back-in-stock`, BackInStockSchema, { method: "POST", json: { phone } });
              setSubscribed(true);
            } catch (err) {
              toast.error(isApiError(err) ? err.userMessage : "تعذّر الاشتراك.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <BellIcon aria-hidden className="size-4" />
          {subscribed ? "سنُنبّهك عبر واتساب" : "نبّهني عند التوفر"}
        </Button>
      ) : (
        <Button
          className="h-11 w-full gap-2"
          disabled={cart.isPending}
          data-testid="wishlist-add"
          onClick={(e) => {
            const opener = e.currentTarget;
            const input = { product_id: product.id, action_type: "add" as const, quantity: 1 };
            cart.mutate(
              { ...input, optimistic: { name: product.name, display_price: product.display_price, image: product.image ?? product.image_url ?? null }, label: product.name },
              { onSuccess: () => openCart(opener, lineKey(input)) },
            );
          }}
        >
          <ShoppingBagIcon aria-hidden className="size-4" />
          أضف إلى السلة
        </Button>
      )}
    </div>
  );
}
