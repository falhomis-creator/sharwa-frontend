import type { Metadata } from "next";
import { connection } from "next/server";
import { QueryProvider } from "@/components/providers/query-provider";
import { MockIndicator } from "@/components/shared/mock-indicator";
import { SkipLink } from "@/components/shared/visually-hidden";

/**
 * Onboarding + tenant-guard group (M02, M47). Its own layout on purpose:
 *
 * - No store header and no merchant theme — these pages must never look like the store
 *   they are standing in front of (M47 US-47.2.4, FR-47.08).
 * - `noindex`: a 404/403/503 interstitial must not enter an index.
 * - The surface stays on the zinc product tokens (constitution I-ب); the system theme
 *   decides light/dark, inherited from the root `ThemeProvider` — nothing is forced here.
 * - `QueryProvider` because the provisioning page polls.
 *
 * The whole group is DYNAMIC (`connection()` + `instant = false`). The tenant-guard pages
 * get their HTTP status from the proxy's `/_tenant/*` rewrite, and that override only
 * survives if nothing in the route chain can be prerendered: a postponed static shell is
 * flushed with its own 200 before the page renders. Measured in a production build — see
 * the deviation note in tasks.md.
 */
export const instant = false;
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "شروة",
};

export default async function OnboardingLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    <QueryProvider>
      <div className="flex min-h-full flex-1 flex-col">
        <SkipLink />
        {children}
        {process.env.NODE_ENV === "production" ? null : <MockIndicator />}
      </div>
    </QueryProvider>
  );
}
