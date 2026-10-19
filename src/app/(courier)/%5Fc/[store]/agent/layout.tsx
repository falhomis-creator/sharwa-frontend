import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { ApiClientProvider } from "@/components/providers/api-client-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { MockIndicator } from "@/components/shared/mock-indicator";
import { Toaster } from "@/components/ui/sonner";
import { getCsrfToken } from "@/lib/csrf";
import { requestIdentity } from "@/features/tenant/request";
import { CourierProvider } from "@/features/courier/api";
import { CourierShell } from "@/features/courier/components/shell";

/**
 * `(courier)` group root (M38, T176): served on the STORE origin at `/agent/*` — the proxy
 * rewrites it to `/_c/<store>/agent/*` (on disk `%5Fc`, a literal `_folder` being private
 * to Next). Its own QueryClient and its own chrome: nothing is imported from the merchant
 * dashboard's features (VIII). Identity is the M18 staff session + CSRF, read server-side.
 */
export const metadata: Metadata = {
  title: { default: "تطبيق المندوب", template: "%s — تطبيق المندوب" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

/** Session-scoped and blocking, like the dashboard shell. */
export const instant = false;

export default async function CourierLayout({ children }: { children: ReactNode }) {
  await connection();
  const identity = await requestIdentity();
  return (
    <QueryProvider>
      <Suspense fallback={null}>
        <Csrf storeHost={identity.storeHost} />
      </Suspense>
      <CourierProvider store={identity.store}>
        <CourierShell>{children}</CourierShell>
      </CourierProvider>
      <Toaster position="top-center" />
      {process.env.NODE_ENV === "production" ? null : <MockIndicator />}
    </QueryProvider>
  );
}

async function Csrf({ storeHost }: { storeHost: string }) {
  await connection();
  const token = await getCsrfToken(storeHost);
  return <ApiClientProvider csrfToken={token}>{null}</ApiClientProvider>;
}
