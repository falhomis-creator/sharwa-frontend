import type { ReactNode } from "react";
import { connection } from "next/server";
import { requireSession } from "@/features/dashboard-shell/api/session";
import { SessionProvider } from "@/features/dashboard-shell/components/session-context";
import { StoreProvider } from "@/features/dashboard-shell/components/store-context";
import { requestIdentity } from "@/features/tenant/request";

/**
 * Print documents (M06 FR-06.10): same session gate as the shell — a missing session lands
 * on the login screen — but none of its chrome, so the page prints as a clean RTL sheet.
 */
export const instant = false;

export default async function PrintLayout({ children }: { children: ReactNode }) {
  await connection();
  const [session, identity] = await Promise.all([requireSession(), requestIdentity()]);
  return (
    <SessionProvider session={session}>
      <StoreProvider store={identity.store} storeOrigin={identity.storeOrigin}>
        <main className="mx-auto w-full max-w-[210mm] bg-background p-6 print:max-w-none print:p-0">{children}</main>
      </StoreProvider>
    </SessionProvider>
  );
}
