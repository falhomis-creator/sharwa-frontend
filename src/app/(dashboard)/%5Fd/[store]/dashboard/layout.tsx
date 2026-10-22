import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { ApiClientProvider } from "@/components/providers/api-client-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { MockIndicator } from "@/components/shared/mock-indicator";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requestIdentity } from "@/features/tenant/request";
import { getCsrfToken } from "@/lib/csrf";

/**
 * Dashboard group root (M03 FR-03.01). It carries only what BOTH the shell and the login
 * screens need; the shell chrome itself lives in `(shell)/layout.tsx` so the auth screens
 * render outside it (T057).
 *
 * On disk the segment is `%5Fd`, which is the `_d` URL the proxy rewrites to: Next treats a
 * literal `_folder` as private and would not route it at all.
 *
 * The surface stays on the zinc product tokens — the merchant theme is applied to the
 * storefront group ONLY and must never reach the dashboard (constitution I-ب, VII).
 */
export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <TooltipProvider delay={200}>
        <Suspense fallback={null}>
          <CsrfBootstrap />
        </Suspense>
        {children}
        {/* Above the sticky save bars (product editor, settings…) so a toast never covers «حفظ»:
            the bar sits at the bottom on desktop and above the 4rem mobile nav on phones. */}
        <Toaster position="bottom-left" offset={{ bottom: "5rem" }} mobileOffset={{ bottom: "9.5rem" }} />
        {process.env.NODE_ENV === "production" ? null : <MockIndicator />}
      </TooltipProvider>
    </QueryProvider>
  );
}

/**
 * Reads the CSRF token server-side and hands it to the browser client as a prop
 * (M47 FR-47.06 — `csrftoken` is HttpOnly, so `document.cookie` is not an option).
 */
async function CsrfBootstrap() {
  // Request-time only: without this the dev prerender validation runs the upstream fetch
  // below inside the static-shell pass and flags `Date.now()` from the fetch instrumentation
  // whenever Django answers fast (or is down) — a console error on every dashboard page.
  await connection();
  const [identity, cookieStore] = await Promise.all([requestIdentity(), cookies()]);
  // The browser's cookies MUST travel: the token has to match the `csrftoken` it holds.
  const token = await getCsrfToken(identity.storeHost, cookieStore.toString() || null);
  return <ApiClientProvider csrfToken={token}>{null}</ApiClientProvider>;
}
