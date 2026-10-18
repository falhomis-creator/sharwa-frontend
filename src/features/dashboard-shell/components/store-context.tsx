"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The store slug resolved once by the shell layout (from `x-sharwa-store`). Every module's
 * TanStack Query key is prefixed with it (`storeKey(store, …)`, constitution VIII), so two
 * stores can never share a cached row.
 */
const StoreContext = createContext<{ store: string; storeOrigin: string } | null>(null);

export function StoreProvider({ store, storeOrigin, children }: { store: string; storeOrigin: string; children: ReactNode }) {
  return <StoreContext.Provider value={{ store, storeOrigin }}>{children}</StoreContext.Provider>;
}

export function useStore(): string {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside the dashboard shell");
  return ctx.store;
}

export function useStoreOrigin(): string {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStoreOrigin must be used inside the dashboard shell");
  return ctx.storeOrigin;
}
