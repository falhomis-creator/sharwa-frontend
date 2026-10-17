import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { QueryProvider } from "@/components/providers/query-provider";
import { MockIndicator } from "@/components/shared/mock-indicator";
import { SkipLink } from "@/components/shared/visually-hidden";
import { probeStore } from "@/features/tenant/api/probe";
import { requestIdentity } from "@/features/tenant/request";
import { storeThemeVars } from "@/features/tenant/theme";
import { TENANT_ERROR_PATH } from "@/features/tenant/schemas";

/**
 * Storefront group root — the single place a store-origin page is admitted (M47 T052).
 *
 * The URL segment is `_s/<store>`: an internal prefix the proxy writes and the network
 * cannot reach (SC-47.6). The folder is `%5Fs` because Next treats a literal `_folder`
 * as a PRIVATE folder and excludes it from routing — `%5F` is the documented escape that
 * yields the `_s` URL segment the proxy (and research R-03) specify.
 *
 * The probe is awaited in the layout body with NO `<Suspense>` above it. Any boundary at or
 * above this layout lets Next flush a static shell with a 200 before the probe resolves, so
 * an unknown or suspended store would answer 200 and then redirect from the client — the
 * contract requires a real 404/403/503 (FR-47.07/08). Without a boundary the status is real.
 *
 * The store slug is read from the proxy header rather than from `params`: Next's typegen
 * lists this segment under its DECODED name in `ParamMap` (`/_s/[store]`) but its RAW name
 * in `LayoutRoutes` (`/%5Fs/[store]`), so `LayoutProps` resolves `params` to
 * `Promise<unknown>` here and the build rejects any typed destructuring of it. The header
 * is the same value (`src/proxy.ts`), already normalized, and needs no cast.
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

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const [cookieStore, identity] = await Promise.all([cookies(), requestIdentity()]);
  const store = identity.store;
  const cookie = cookieStore.toString();

  const probe = await probeStore({ store, storeHost: identity.storeHost, cookie: cookie || null });

  switch (probe.outcome) {
    case "not_found":
      // `/_tenant/not-found` rather than `notFound()`: the proxy stamps a real 404 on that
      // rewrite, while `notFound()` renders through the (prerenderable) route and answers
      // 200 in production. `not-found.tsx` stays for in-store 404s (a missing product).
      redirect(TENANT_ERROR_PATH.not_found);
    case "inactive":
      redirect(TENANT_ERROR_PATH.inactive);
    case "provisioning":
      redirect(TENANT_ERROR_PATH.provisioning);
    case "session_bound_elsewhere":
      // Clear the foreign session once, then come back (US-47.2.3). The breadcrumb the
      // reset route leaves stops this from becoming a loop.
      if (!cookieStore.has("sharwa_session_reset")) {
        redirect("/api/bff/public/reset-store-session?next=/");
      }
      if (!probe.config) redirect(TENANT_ERROR_PATH.inactive);
      break;
    case "ok":
      break;
  }

  const config = probe.config!;

  return (
    <QueryProvider>
      <div
        data-store-theme
        data-store={store}
        style={storeThemeVars(config)}
        className="flex min-h-dvh flex-1 flex-col bg-background text-foreground"
      >
        <SkipLink />
        {children}
        {process.env.NODE_ENV === "production" ? null : <MockIndicator initial={probe.isMock} />}
      </div>
    </QueryProvider>
  );
}
