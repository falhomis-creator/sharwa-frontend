"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * POS request context (M16): the store slug for tenant-scoped query keys and the session
 * facts the till needs to hide what the role cannot do (FR-16.12). The `(pos)` group has
 * its own provider on purpose — it imports nothing from the dashboard shell's components
 * (constitution VIII: no cross-group feature imports).
 */
export interface PosSessionFacts {
  kind: "merchant" | "staff";
  fullName: string;
  storeName: string;
  permissions: string[];
}

const PosCtx = createContext<{ store: string; storeOrigin: string; session: PosSessionFacts } | null>(null);

export function PosProvider({ store, storeOrigin, session, children }: { store: string; storeOrigin: string; session: PosSessionFacts; children: ReactNode }) {
  return <PosCtx.Provider value={{ store, storeOrigin, session }}>{children}</PosCtx.Provider>;
}

function usePosCtx() {
  const ctx = useContext(PosCtx);
  if (!ctx) throw new Error("POS hooks must be used inside <PosProvider>");
  return ctx;
}

export function usePosStore(): string {
  return usePosCtx().store;
}

export function usePosOrigin(): string {
  return usePosCtx().storeOrigin;
}

export function usePosSession(): PosSessionFacts {
  return usePosCtx().session;
}

export function usePosCan(permission: string): boolean {
  const s = usePosCtx().session;
  return s.kind === "merchant" || s.permissions.includes(permission);
}
