import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { ApiClientProvider } from "@/components/providers/api-client-provider";
import { MockIndicator } from "@/components/shared/mock-indicator";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCsrfToken } from "@/lib/csrf";

/**
 * `(admin)` group root (M20, T137) — served on `console.<base>` only: the proxy rewrites
 * that host to `/_a/*`, and every other host 404s on `/_a`. On disk the segment is `%5Fa`
 * for the same reason as `%5Fd` (a literal `_folder` is private to Next).
 *
 * Its own QueryClient: a console cache entry can never be read by a store screen, and
 * every key is `["store", "platform", "admin", …]` (constitution VIII).
 */
export const metadata: Metadata = {
  title: { default: "لوحة المنصة — شروة", template: "%s — لوحة المنصة" },
  robots: { index: false, follow: false },
};

export default function AdminGroupLayout({ children }: { children: ReactNode }) {
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
 * The console's CSRF token (INT-030): Django enforces CSRF on the console login and on every
 * write, and `csrftoken` is HttpOnly — so, exactly like the dashboard, the token is read
 * server-side (platform host: no `X-Store-Domain`, the public schema) and handed to the
 * browser client as a prop. The login answer carries the rotated token as well.
 */
async function CsrfBootstrap() {
  await connection();
  const cookieStore = await cookies();
  const token = await getCsrfToken(null, cookieStore.toString() || null);
  return <ApiClientProvider csrfToken={token}>{null}</ApiClientProvider>;
}
