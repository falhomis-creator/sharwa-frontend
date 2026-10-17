import { Suspense, type ReactNode } from "react";
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
        <Toaster position="bottom-left" />
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
  const identity = await requestIdentity();
  const token = await getCsrfToken(identity.storeHost);
  return <ApiClientProvider csrfToken={token}>{null}</ApiClientProvider>;
}
