import type { ReactNode } from "react";
import { connection } from "next/server";
import { SkipLink } from "@/components/shared/visually-hidden";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";
import { requireAdminSession } from "@/features/platform-admin/api/session";
import { AdminSessionProvider } from "@/features/platform-admin/components/admin-session";
import { AdminShell } from "@/features/platform-admin/components/shell/admin-shell";

/**
 * Every console screen renders inside this gate + shell. Like the merchant shell, the gate
 * is awaited in the layout body (no `<Suspense>`), so a request without a session gets a
 * real redirect to `/login` and never a flushed 200.
 */
export const instant = false;

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  await connection();
  const session = await requireAdminSession();
  return (
    <AdminSessionProvider session={session}>
      <SkipLink />
      <AdminShell djangoAdminUrl={`${UPSTREAM_ORIGIN}/sharwa-secure-gate/`}>{children}</AdminShell>
    </AdminSessionProvider>
  );
}
