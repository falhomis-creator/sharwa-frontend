import { create } from "zustand";

/**
 * Cart UI state (M11 FR-11.03): open/closed, who opened it (focus returns there — US-11.1.4),
 * the line just added (shown first), the price each line had at the last sync (FR-11.10
 * «تغيّر السعر») and lines the server capped at its stock (US-11.2.3). No money and no cart
 * CONTENT lives here — the cart is server state in TanStack Query (FR-11.01/02).
 */
interface CartUiState {
  open: boolean;
  returnFocus: HTMLElement | null;
  lastAddedKey: string | null;
  seenPrices: Record<string, string>;
  changedKeys: string[];
  cappedKeys: Record<string, number>;
  openCart: (opener?: HTMLElement | null, addedKey?: string | null) => void;
  closeCart: () => void;
  notePrices: (prices: Record<string, string>) => void;
  markCapped: (key: string, qty: number) => void;
  clearCapped: (key: string) => void;
}

export const useCartUi = create<CartUiState>((set, get) => ({
  open: false,
  returnFocus: null,
  lastAddedKey: null,
  seenPrices: {},
  changedKeys: [],
  cappedKeys: {},
  openCart: (opener, addedKey) =>
    set({
      open: true,
      returnFocus: opener ?? (typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null),
      lastAddedKey: addedKey ?? get().lastAddedKey,
    }),
  closeCart: () => {
    const target = get().returnFocus;
    set({ open: false, changedKeys: [], lastAddedKey: null });
    // Return focus to the control that opened the panel (US-11.1.4).
    if (target && typeof window !== "undefined") window.setTimeout(() => target.focus?.(), 0);
  },
  notePrices: (prices) => {
    const seen = get().seenPrices;
    const changed = new Set(get().changedKeys);
    for (const [key, price] of Object.entries(prices)) {
      if (seen[key] && seen[key] !== price) changed.add(key);
    }
    set({ seenPrices: { ...seen, ...prices }, changedKeys: [...changed] });
  },
  markCapped: (key, qty) => set({ cappedKeys: { ...get().cappedKeys, [key]: qty } }),
  clearCapped: (key) => {
    const next = { ...get().cappedKeys };
    delete next[key];
    set({ cappedKeys: next });
  },
}));
