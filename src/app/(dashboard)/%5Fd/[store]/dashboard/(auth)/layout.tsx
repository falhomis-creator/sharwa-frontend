import { Suspense, type ReactNode } from "react";
import { Mono } from "@/components/shared/mono";
import { SkipLink } from "@/components/shared/visually-hidden";
import { probeStore } from "@/features/tenant/api/probe";
import { requestIdentity } from "@/features/tenant/request";

/**
 * Auth screens live OUTSIDE the shell (T057): one 400px column, no sidebar, no topbar,
 * no illustration (M03 FR-03.07). The store is already resolved from the host, so the
 * merchant only ever types a password — there is no e-mail or store field to fill.
 */
export default function DashboardAuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <main id="main" className="mx-auto flex w-full max-w-[25rem] flex-1 flex-col justify-center gap-8 px-6 py-16">
        <Suspense fallback={<div className="h-12" />}>
          <StoreBadge />
        </Suspense>
        {children}
      </main>
    </>
  );
}

async function StoreBadge() {
  const identity = await requestIdentity();
  const probe = await probeStore({ store: identity.store, storeHost: identity.storeHost });
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">لوحة تحكم</span>
      <span className="text-lg font-medium tracking-tight">
        {probe.config?.store_name ?? identity.store}
      </span>
      <Mono className="text-xs text-muted-foreground">{identity.storeHost}</Mono>
    </div>
  );
}
