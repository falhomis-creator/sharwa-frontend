"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * The running POS cart (FR-16.04): Zustand, persisted locally under a key of
 * (tenant, register, shift) so a reload, a lost connection or a closed tab never loses the
 * sale in progress, and two registers or two shifts never share a cart. Cleared after a
 * completed order and when the shift closes.
 *
 * `pendingKey` is the idempotency key of an «إتمام» that has not been confirmed yet: it
 * survives a reload, so the re-send uses the SAME key and the server answers with the
 * first order instead of creating a second (US-16.5.1).
 *
 * Prices are not stored: the totals are the server's quote (FR-16.07).
 */
export interface CartLine {
  key: string;
  product_id: number;
  variant_id: number | null;
  name: string;
  variant_label: string | null;
  sku: string;
  quantity: number;
  discount_percent: string;
  min_quantity: number | null;
  max_quantity: number | null;
  is_serialized: boolean;
}

export interface Cart {
  lines: CartLine[];
  cartDiscount: string;
  pendingKey: string | null;
  approvalId: number | null;
  /** Line the `+`/`-` keys act on. */
  activeKey: string | null;
}

const EMPTY: Cart = { lines: [], cartDiscount: "", pendingKey: null, approvalId: null, activeKey: null };

interface CartStore {
  carts: Record<string, Cart>;
  add: (id: string, line: Omit<CartLine, "key" | "quantity" | "discount_percent">) => void;
  setQty: (id: string, key: string, quantity: number) => void;
  bump: (id: string, delta: number) => void;
  setLineDiscount: (id: string, key: string, pct: string) => void;
  setCartDiscount: (id: string, pct: string) => void;
  remove: (id: string, key: string) => void;
  setActive: (id: string, key: string) => void;
  setPending: (id: string, key: string | null) => void;
  setApproval: (id: string, approvalId: number | null) => void;
  clear: (id: string) => void;
}

export function cartId(store: string, registerId: number, shiftId: number): string {
  return `${store}:${registerId}:${shiftId}`;
}

function patch(state: CartStore, id: string, fn: (c: Cart) => Cart): Pick<CartStore, "carts"> {
  return { carts: { ...state.carts, [id]: fn(state.carts[id] ?? EMPTY) } };
}

function clamp(line: CartLine, q: number): number {
  let n = Math.max(1, Math.floor(q));
  if (line.is_serialized) n = 1;
  if (line.max_quantity) n = Math.min(n, line.max_quantity);
  return n;
}

export const usePosCart = create<CartStore>()(
  persist(
    (set) => ({
      carts: {},
      add: (id, line) =>
        set((s) =>
          patch(s, id, (c) => {
            const same = c.lines.find((l) => l.product_id === line.product_id && l.variant_id === line.variant_id && !l.is_serialized);
            if (same) {
              return { ...c, activeKey: same.key, lines: c.lines.map((l) => (l === same ? { ...l, quantity: clamp(l, l.quantity + 1) } : l)) };
            }
            const key = `${line.product_id}:${line.variant_id ?? 0}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
            const quantity = Math.max(1, line.min_quantity ?? 1);
            return { ...c, activeKey: key, lines: [...c.lines, { ...line, key, quantity, discount_percent: "" }] };
          }),
        ),
      setQty: (id, key, quantity) => set((s) => patch(s, id, (c) => ({ ...c, lines: c.lines.map((l) => (l.key === key ? { ...l, quantity: clamp(l, quantity) } : l)) }))),
      bump: (id, delta) =>
        set((s) =>
          patch(s, id, (c) => {
            const key = c.activeKey ?? c.lines.at(-1)?.key;
            return { ...c, lines: c.lines.map((l) => (l.key === key ? { ...l, quantity: clamp(l, l.quantity + delta) } : l)) };
          }),
        ),
      setLineDiscount: (id, key, pct) => set((s) => patch(s, id, (c) => ({ ...c, approvalId: null, lines: c.lines.map((l) => (l.key === key ? { ...l, discount_percent: pct } : l)) }))),
      setCartDiscount: (id, pct) => set((s) => patch(s, id, (c) => ({ ...c, approvalId: null, cartDiscount: pct }))),
      remove: (id, key) => set((s) => patch(s, id, (c) => ({ ...c, activeKey: c.activeKey === key ? null : c.activeKey, lines: c.lines.filter((l) => l.key !== key) }))),
      setActive: (id, key) => set((s) => patch(s, id, (c) => ({ ...c, activeKey: key }))),
      setPending: (id, key) => set((s) => patch(s, id, (c) => ({ ...c, pendingKey: key }))),
      setApproval: (id, approvalId) => set((s) => patch(s, id, (c) => ({ ...c, approvalId }))),
      clear: (id) =>
        set((s) => {
          const rest = { ...s.carts };
          delete rest[id];
          return { carts: rest };
        }),
    }),
    {
      name: "sharwa-pos-cart",
      storage: createJSONStorage(() => localStorage),
      // Applied after mount (see <PosCartHydrator>), so SSR and the first client render agree.
      skipHydration: true,
      version: 1,
    },
  ),
);

export function useCart(id: string): Cart {
  return usePosCart((s) => s.carts[id] ?? EMPTY);
}

/** Drop every cart of a store's register once its shift is gone (FR-16.04). */
export function clearCartsOfRegister(store: string, registerId: number) {
  const prefix = `${store}:${registerId}:`;
  usePosCart.setState((s) => ({ carts: Object.fromEntries(Object.entries(s.carts).filter(([k]) => !k.startsWith(prefix))) }));
}
