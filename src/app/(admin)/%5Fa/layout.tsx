import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MockIndicator } from "@/components/shared/mock-indicator";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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
        {children}
        <Toaster position="bottom-left" />
        {process.env.NODE_ENV === "production" ? null : <MockIndicator />}
      </TooltipProvider>
    </QueryProvider>
  );
}
