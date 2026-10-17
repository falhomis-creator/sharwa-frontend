import type { Metadata } from "next";
import { MockIndicator } from "@/components/shared/mock-indicator";
import { SkipLink } from "@/components/shared/visually-hidden";
import { SiteHeader } from "@/features/landing/components/site-header";
import { seo } from "@/features/landing/original.content";

const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "localhost";
const origin = baseDomain === "localhost" ? "http://localhost:3000" : `https://${baseDomain}`;

export const metadata: Metadata = {
  title: { default: seo.title, template: "%s · شروة" },
  description: seo.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: "شروة",
    url: origin,
    title: seo.title,
    description: seo.description,
  },
};

/**
 * Platform-origin marketing group (T031). Stores never render these routes.
 *
 * `.sharwa-canvas` is applied here rather than on `body`: the warm cream is
 * the MARKETING ground only. The merchant dashboard, the storefront and admin
 * stay on the zinc surface tokens (constitution I-ب), and they share `body`.
 *
 * The footer is not mounted (owner direction 2026-10-17 — the page is the
 * hero and nothing else). `<SiteFooter>` is untouched on disk.
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="sharwa-canvas font-display flex min-h-full flex-1 flex-col">
      <SkipLink />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      {process.env.NODE_ENV === "production" ? null : <MockIndicator />}
    </div>
  );
}
