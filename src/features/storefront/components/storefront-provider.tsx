"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Currency } from "@/lib/schemas/money";

/**
 * What every storefront client component may need without prop drilling: the tenant slug
 * (query keys — constitution VIII), the display currency the server rendered with, and a
 * few identity fields from `/config/`. Nothing here is secret or per-visitor.
 */
export interface StorefrontValue {
  store: string;
  storeName: string;
  currency: Currency;
  whatsapp: string | null;
  freeShippingConfigured: boolean;
  giftingEnabled: boolean;
  loyaltyEnabled: boolean;
  timezone: string;
}

const Ctx = createContext<StorefrontValue | null>(null);

export function StorefrontProvider({ value, children }: { value: StorefrontValue; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStorefront(): StorefrontValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStorefront must be used inside the storefront layout");
  return v;
}

/** Strip the internal rewrite prefix if the router ever reports it (`/_s/<store>/p/1` → `/p/1`). */
export function visiblePath(pathname: string | null): string {
  if (!pathname) return "/";
  const m = /^\/_s\/[^/]+(\/.*)?$/.exec(pathname);
  return m ? m[1] || "/" : pathname;
}
