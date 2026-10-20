import { Suspense, type ReactNode } from "react";
import { ShoppingBag } from "lucide-react";
import { connection } from "next/server";
import { Mono } from "@/components/shared/mono";
import { SkipLink } from "@/components/shared/visually-hidden";
import { probeStore } from "@/features/tenant/api/probe";
import { requestIdentity } from "@/features/tenant/request";

/**
 * Auth screens live OUTSIDE the shell (T057): one 400px column, no sidebar, no topbar,
 * no illustration (M03 FR-03.07). UI/UX Polish Phase: the column is a white card on the cool
 * gray ground, headed by the royal-blue brand tile — clean, no imagery. The store is already resolved from the host, so the
 * merchant only ever types a password — there is no e-mail or store field to fill.
 */
export default function DashboardAuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <div className="flex flex-1 flex-col bg-background">
        <main id="main" className="mx-auto flex w-full max-w-[27rem] flex-1 flex-col justify-center gap-6 px-4 py-12 sm:px-6 sm:py-16">
          <Suspense fallback={<div className="h-12" />}>
            <StoreBadge />
          </Suspense>
          <div className="surface-card p-6 sm:p-8">{children}</div>
        </main>
      </div>
    </>
  );
}

async function StoreBadge() {
  // Request-time only: the mock probe reads the clock, which must not run while prerendering
  // (dev «unstable value `Date.now()`» on /dashboard/login and /dashboard/staff/login).
  await connection();
  const identity = await requestIdentity();
  const probe = await probeStore({ store: identity.store, storeHost: identity.storeHost });
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cta text-cta-foreground shadow-card">
        <ShoppingBag className="size-5" strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">لوحة تحكم</span>
        <span className="truncate text-lg font-semibold tracking-tight text-foreground">
          {probe.config?.store_name ?? identity.store}
        </span>
        <Mono className="truncate text-xs text-muted-foreground">{identity.storeHost}</Mono>
      </div>
    </div>
  );
}
