"use client";

import { createContext, useContext, type ReactNode } from "react";
import { isStoreOwner, passesFeatureGate, passesGate, type FeatureGate, type PermissionGate } from "@/lib/access";
import type { Session } from "@/features/dashboard-shell/schemas";

/**
 * The session resolved once by the shell layout (RSC) and read by the sidebar, the topbar
 * and every gated control. The frontend never computes gating itself — it reads the
 * effective `features[]`/`permissions[]` the backend sent (M03 FR-03.02/03).
 */
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the dashboard shell");
  return session;
}

export function useAccess() {
  const session = useSession();
  return {
    session,
    /** No key → always allowed. */
    /** No gate → always allowed; a list is any-of. */
    canFeature: (gate?: FeatureGate) => (gate ? passesFeatureGate(session, gate) : true),
    /** No gate → always allowed; a list is any-of (`hasAnyPermission`). */
    canPermission: (gate?: PermissionGate) =>
      gate ? passesGate({ kind: session.kind, features: session.features, permissions: session.staff?.permissions }, gate) : true,
    /** Owner-only destinations (see `isStoreOwner`): `false`/absent → always allowed. */
    canOwnerOnly: (ownerOnly?: boolean) => !ownerOnly || isStoreOwner(session),
  };
}
