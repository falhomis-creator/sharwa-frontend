import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "@/components/providers/query-provider";
import { MockIndicator } from "@/components/shared/mock-indicator";
import { Toaster } from "@/components/ui/sonner";
import { TOKENS } from "@/lib/tokens";
import { PayShell } from "@/features/sharwa-pay/components/pay-shell";

/**
 * `(pay)` group (M40, T182): «محفظة شروة» on the PLATFORM origin, `/sharwa-pay/*` — no
 * tenant id anywhere (FR-40.01). Its own QueryClient (financial reads at `gcTime: 0`), its
 * own manifest and no-cache service worker scoped to `/sharwa-pay/`, `noindex` everywhere
 * (FR-40.09). Theme colours are the zinc tokens, never a store's (FR-40.07).
 */
export const metadata: Metadata = {
  title: { default: "محفظة شروة", template: "%s — محفظة شروة" },
  description: "محفظة مسبقة الدفع واحدة لكل متاجر شروة.",
  robots: { index: false, follow: false, nocache: true },
  manifest: "/sharwa-pay/manifest.webmanifest",
  appleWebApp: { capable: true, title: "محفظتي", statusBarStyle: "default" },
  icons: { apple: "/sharwa-pay/icon?size=192" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: TOKENS.background.light },
    { media: "(prefers-color-scheme: dark)", color: TOKENS.background.dark },
  ],
};

export default function PayLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <PayShell>{children}</PayShell>
      <Toaster position="top-center" />
      {process.env.NODE_ENV === "production" ? null : <MockIndicator />}
    </QueryProvider>
  );
}
