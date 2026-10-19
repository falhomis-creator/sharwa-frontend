"use client";

import { createContext, useContext, type ReactNode } from "react";
import { canWrite, type AdminArea, type AdminSession } from "@/features/platform-admin/schemas/auth";

/** The console session, resolved once by the `(console)` layout (RSC) and read everywhere below. */
const AdminSessionContext = createContext<AdminSession | null>(null);

export function AdminSessionProvider({ session, children }: { session: AdminSession; children: ReactNode }) {
  return <AdminSessionContext.Provider value={session}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSession {
  const s = useContext(AdminSessionContext);
  if (!s) throw new Error("useAdminSession must be used inside the console shell");
  return s;
}

/** FR-20.09 — the UI half of the role gate (the BFF answers 403 regardless). */
export function useCanWrite(area: AdminArea): boolean {
  return canWrite(useAdminSession().role, area);
}
