import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Local wishlist (M09 §10 / M10 US-10.7.2): kept in the browser, keyed by store (a custom
 * domain and the subdomain of the same store are different origins, so the key is explicit
 * rather than relying on origin isolation alone). Synced to the server only after the buyer
 * gives a phone, once E-42 ships (`POST /api/v1/wishlist/toggle/`).
 *
 * `skipHydration`: the server and the first client render both see an empty list, so the
 * header badge never causes a hydration mismatch; `useWishlistHydration()` loads it after mount.
 */
interface WishlistState {
  byStore: Record<string, number[]>;
  phone: string | null;
  toggle: (store: string, productId: number) => boolean;
  setPhone: (phone: string) => void;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      byStore: {},
      phone: null,
      toggle: (store, productId) => {
        const current = get().byStore[store] ?? [];
        const has = current.includes(productId);
        const next = has ? current.filter((id) => id !== productId) : [productId, ...current];
        set({ byStore: { ...get().byStore, [store]: next } });
        return !has;
      },
      setPhone: (phone) => set({ phone }),
    }),
    {
      name: "sharwa:wishlist",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ byStore: s.byStore, phone: s.phone }),
    },
  ),
);

export function hydrateWishlist() {
  if (!useWishlist.persist.hasHydrated()) void useWishlist.persist.rehydrate();
}

const EMPTY: number[] = [];

export function useWishlistIds(store: string): number[] {
  return useWishlist((s) => s.byStore[store] ?? EMPTY);
}


/** True once the persisted list has loaded (false on the server and the first client render). */
export function useWishlistHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useWishlist.persist.onFinishHydration(cb),
    () => useWishlist.persist.hasHydrated(),
    () => false,
  );
}
