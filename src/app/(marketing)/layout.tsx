import type { Metadata } from "next";
import { MockIndicator } from "@/components/shared/mock-indicator";
import { SkipLink } from "@/components/shared/visually-hidden";
import { SiteHeader } from "@/features/landing/components/site-header";
import { SiteFooter } from "@/features/landing/components/site-footer";
import { seo } from "@/features/landing/landing.content";

const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "localhost";
const origin = baseDomain === "localhost" ? "http://localhost:3000" : `https://${baseDomain}`;

export const metadata: Metadata = {
  title: { default: seo.title, template: "%s · شروه" },
  description: seo.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: "شروه",
    url: origin,
    title: seo.title,
    description: seo.description,
  },
};

/**
 * Platform-origin marketing group (T031). Stores never render these routes.
 *
 * T031 also listed `QueryProvider` and the Sonner `Toaster` here, and both have
 * been dropped: nothing in this group runs a client query (the one network call,
 * `check-subdomain`, goes through `apiFetch` directly) and nothing raises a
 * toast. Shipping @tanstack/react-query, nuqs and sonner to every visitor of a
 * static marketing page is pure weight against the T046 performance budget.
 * The merchant dashboard group brings its own provider when it needs one.
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      {process.env.NODE_ENV === "production" ? null : <MockIndicator />}
    </>
  );
}
