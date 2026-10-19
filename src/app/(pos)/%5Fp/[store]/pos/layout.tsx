import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ApiClientProvider } from "@/components/providers/api-client-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { MockIndicator } from "@/components/shared/mock-indicator";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCsrfToken } from "@/lib/csrf";
import { requestIdentity } from "@/features/tenant/request";
// The merchant/staff session resolver is the cross-cutting identity of a store origin; the
// POS reads it server-side only (no dashboard UI is imported). See tasks.md Phase 7 notes.
import { getSession } from "@/features/dashboard-shell/api/session";
import { PosProvider } from "@/features/pos/components/pos-provider";
import { PosFrame } from "@/features/pos/components/pos-frame";
import { PosPlanGate } from "@/features/pos/components/pos-feature-off";

export const metadata: Metadata = { title: { default: "نقطة البيع", template: "%s · نقطة البيع" }, robots: { index: false, follow: false } };

/**
 * `(pos)` group root (M16 FR-16.01): its own full-screen layout — no merchant sidebar, no
 * topbar — on the zinc product tokens. On disk `%5Fp` is the `_p` the proxy rewrites
 * store-host `/pos/*` to (a literal `_folder` is private in Next and never routes).
 *
 * Gates: the same merchant/staff session as the dashboard (none → the staff login with
 * `next=/pos`), then the plan feature `pos` (Phase 7 decision 1: subscription-gated) —
 * off → a full-screen «not in your plan» state instead of the till. `instant = false` for the same reason as the dashboard shell: the redirect
 * must be a real 307, not a streamed instruction after a 200 shell.
 */
export const instant = false;

export default async function PosLayout({ children }: { children: ReactNode }) {
  await connection();
  const [session, identity] = await Promise.all([getSession(), requestIdentity()]);
  if (!session) redirect("/dashboard/login?next=%2Fpos");
  return (
    <QueryProvider>
      <TooltipProvider delay={200}>
        <Suspense fallback={null}>
          <CsrfBootstrap storeHost={identity.storeHost} />
        </Suspense>
        {/* The page segment is still rendered (instant-navigation validation must see it); the
            client gate shows the plan state INSTEAD of it, so no till query ever runs. */}
        <PosPlanGate enabled={session.features.includes("pos")} isOwner={session.kind === "merchant"}>
          <PosProvider
            store={identity.store}
            storeOrigin={identity.storeOrigin}
            session={{
              kind: session.kind,
              fullName: session.kind === "merchant" ? "مالك المتجر" : (session.staff?.full_name ?? "موظف"),
              storeName: session.store_name,
              permissions: session.staff?.permissions ?? [],
            }}
          >
            <PosFrame>{children}</PosFrame>
          </PosProvider>
        </PosPlanGate>
        <Toaster position="bottom-left" />
        {process.env.NODE_ENV === "production" ? null : <MockIndicator />}
      </TooltipProvider>
    </QueryProvider>
  );
}

async function CsrfBootstrap({ storeHost }: { storeHost: string }) {
  const token = await getCsrfToken(storeHost);
  return <ApiClientProvider csrfToken={token}>{null}</ApiClientProvider>;
}
