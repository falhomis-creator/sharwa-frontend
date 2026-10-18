import { create } from "zustand";

/**
 * The «رقم هاتفك» panel (M42 US-42.1.2): opened by a wishlist toggle that found no phone in
 * the session; `pending` is the product to save once the number is given.
 */
interface ShopperUi {
  open: boolean;
  pending: number | null;
  ask: (productId: number | null) => void;
  close: () => void;
}

export const useShopperUi = create<ShopperUi>((set) => ({
  open: false,
  pending: null,
  ask: (productId) => set({ open: true, pending: productId }),
  close: () => set({ open: false, pending: null }),
}));
