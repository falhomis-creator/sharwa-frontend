import type { ReactNode } from "react";
import { connection } from "next/server";
import { SkipLink } from "@/components/shared/visually-hidden";
import { requireSession } from "@/features/dashboard-shell/api/session";
import { requestIdentity } from "@/features/tenant/request";
import { SessionProvider } from "@/features/dashboard-shell/components/session-context";
import { StoreProvider } from "@/features/dashboard-shell/components/store-context";
import { ShellHydrator } from "@/features/dashboard-shell/components/shell-hydrator";
import { ShellShortcuts } from "@/features/dashboard-shell/components/shell-shortcuts";
import { ShortcutsDialog } from "@/features/dashboard-shell/components/shortcuts-dialog";
import { Sidebar } from "@/features/dashboard-shell/components/sidebar";
import { Topbar } from "@/features/dashboard-shell/components/topbar";
import { MobileBottomNav, MobileDrawer } from "@/features/dashboard-shell/components/mobile-nav";
import { CommandPalette } from "@/features/command-palette/command-palette";

/**
 * The shell every dashboard module renders inside (M03 FR-03.01, §6):
 * sidebar 256px / 56px rail with a 1px end border · topbar 48px with a 1px bottom border ·
 * content capped at 1440px with 24px gutters · no shadows anywhere.
 *
 * `requireSession()` runs here, so every `/dashboard/*` screen is gated in one place and a
 * missing session lands on the login screen (FR-03.08).
 *
 * The gate is awaited in the layout body and deliberately NOT inside a `<Suspense>`: a
 * `redirect()` thrown under a boundary is streamed as a client instruction after part of
 * the page has already been flushed, so an unauthenticated request would briefly receive
 * overview markup with a 200. Awaiting it here makes `/dashboard/*` fully dynamic — which
 * it is anyway, being session-scoped — and the redirect a real one. The skeletons of §6
 * live in the two `loading.tsx` files instead.
 */
/**
 * This route BLOCKS on its dynamic data instead of being partially prerendered.
 *
 * `instant = false` is Next 16's supported way to say so (the alternative it offers is a
 * `<Suspense>` boundary, which is what must NOT be used here): with a boundary, a static
 * shell is flushed with a 200 before the guard resolves, and the contract requires the
 * real status — 404 for an unknown store, 403 for a suspended one, 503 while provisioning,
 * 307 to the login screen without a session.
 */
export const instant = false;

export default async function DashboardShellLayout({ children }: { children: ReactNode }) {
  // Request-time only (session-scoped anyway): keeps the upstream session/CSRF fetches out of
  // the dev static-shell validation, which otherwise flags `Date.now()` from the fetch
  // instrumentation whenever Django answers quickly.
  await connection();
  const [session, identity] = await Promise.all([requireSession(), requestIdentity()]);

  return (
    <SessionProvider session={session}>
      <StoreProvider store={identity.store} storeOrigin={identity.storeOrigin}>
        <ShellHydrator />
        <ShellShortcuts />
        <SkipLink />
        <div className="flex min-h-dvh flex-1">
          <div className="hidden lg:block">
            <Sidebar store={identity.store} storeName={session.store_name} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              store={identity.store}
              storeUrl={identity.storeOrigin}
              protocol={identity.protocol}
              port={identity.port}
            />
            <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 lg:px-6">
              {children}
            </main>
            <MobileBottomNav />
          </div>
        </div>
        <MobileDrawer store={identity.store} storeName={session.store_name} />
        <ShortcutsDialog />
        <CommandPalette />
      </StoreProvider>
    </SessionProvider>
  );
}
