"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { storeKey } from "@/lib/query-keys";
import { ShopperPhoneSchema, StoreReviewsSchema, WishlistToggleSchema, WishlistViewSchema, type ShopperPhone, type WishlistView } from "@/features/engagement/schemas";
import { useShopperUi } from "@/features/engagement/shopper-ui";
import { useWishlist } from "@/stores/wishlist";

/**
 * M42 data hooks. The shopper's phone lives in the session (the cart cookie) and the
 * wishlist on the server keyed by it; the Zustand store is only a MIRROR of the ids so the
 * tab-bar badge and the card buttons render without a request (FR-42.01, FR-42.03).
 */
export const shopperKey = (store: string) => storeKey(store, "shopper");
export const wishlistKey = (store: string) => storeKey(store, "wishlist");

export function useShopperPhone(store: string) {
  return useQuery({
    queryKey: shopperKey(store),
    queryFn: ({ signal }) => apiFetch("/api/bff/shopper/phone", ShopperPhoneSchema, { signal }),
    staleTime: 5 * 60_000,
  });
}

export function useSetShopperPhone(store: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (phone: string) => apiFetch("/api/bff/shopper/phone", ShopperPhoneSchema, { method: "POST", json: { phone } }),
    onSuccess: (data) => {
      client.setQueryData(shopperKey(store), data);
      if (data.phone_normalized) useWishlist.getState().setPhone(data.phone_normalized);
      void client.invalidateQueries({ queryKey: wishlistKey(store) });
    },
  });
}

function mirror(store: string, view: WishlistView) {
  useWishlist.getState().replace(
    store,
    view.items.map((i) => i.product.id),
  );
}

export function useWishlistQuery(store: string, currency: string, enabled = true) {
  return useQuery({
    queryKey: [...wishlistKey(store), currency],
    queryFn: async ({ signal }) => {
      const view = await apiFetch("/api/bff/wishlist", WishlistViewSchema, { query: { currency }, signal });
      mirror(store, view);
      return view;
    },
    enabled,
    staleTime: 30_000,
  });
}

/**
 * Optimistic toggle with rollback (FR-42.03). Without a phone the server answers 409 and the
 * phone panel opens with the product kept as the pending action.
 */
export function useToggleWishlist(store: string) {
  const client = useQueryClient();
  const router = useRouter();
  const askPhone = useShopperUi((s) => s.ask);
  return useMutation({
    mutationFn: (productId: number) => apiFetch("/api/bff/wishlist/toggle", WishlistToggleSchema, { method: "POST", json: { product_id: productId } }),
    onMutate: (productId) => {
      const phone = client.getQueryData<ShopperPhone>(shopperKey(store))?.phone_normalized ?? useWishlist.getState().phone;
      if (!phone) return { skipped: true, wasOn: false };
      const wasOn = useWishlist.getState().toggle(store, productId);
      return { skipped: false, wasOn: !wasOn };
    },
    onSuccess: (data, productId, ctx) => {
      if (ctx?.skipped) return;
      // Reconcile with the server's answer (another tab may have toggled it).
      const ids = useWishlist.getState().byStore[store] ?? [];
      if (data.saved !== ids.includes(productId)) useWishlist.getState().toggle(store, productId);
      toast(data.saved ? "أُضيف إلى قائمتك" : "أُزيل من قائمتك", data.saved ? { action: { label: "عرض القائمة", onClick: () => router.push("/wishlist") } } : undefined);
      void client.invalidateQueries({ queryKey: wishlistKey(store) });
    },
    onError: (err, productId, ctx) => {
      if (ctx && !ctx.skipped) {
        const ids = useWishlist.getState().byStore[store] ?? [];
        if (ids.includes(productId) !== ctx.wasOn) useWishlist.getState().toggle(store, productId);
      }
      if (isApiError(err) && err.status === 409) {
        askPhone(productId);
        return;
      }
      toast.error(isApiError(err) ? err.userMessage : "تعذّر حفظ المنتج.");
    },
  });
}

export function useStoreReviews(store: string) {
  return useQuery({
    queryKey: storeKey(store, "store-reviews"),
    queryFn: ({ signal }) => apiFetch("/api/bff/store-reviews", StoreReviewsSchema, { signal }),
    staleTime: 60_000,
  });
}
