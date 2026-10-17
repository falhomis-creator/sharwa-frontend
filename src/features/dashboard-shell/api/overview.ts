import "server-only";
import { cookies } from "next/headers";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";
import { overviewSchema, type Overview } from "@/features/dashboard-shell/schemas";
import { overviewMock } from "@/mocks/dashboard/overview";
import { isMocksOn } from "@/mocks/runtime";

/**
 * `GET /api/v1/dashboard/overview/` for the first paint (M03 §7, `[NEEDS BACKEND]`).
 *
 * Read server-side rather than from the browser so the overview arrives with the HTML —
 * SC-03.2 asks for the shell plus the number bar under 300ms on a warm cache, which a
 * client round-trip after hydration cannot meet. The refresh action and the 60s counters
 * stay on TanStack Query in the browser.
 *
 * Not cacheable: it depends on the session cookie (research R-02).
 */
export interface OverviewResult {
  data: Overview | null;
  isMock: boolean;
}

export async function getOverview(store: string, storeHost: string): Promise<OverviewResult> {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  try {
    const res = await fetch(`${UPSTREAM_ORIGIN}/api/v1/dashboard/overview/`, {
      headers: {
        accept: "application/json",
        "x-store-domain": storeHost,
        "x-forwarded-host": storeHost,
        ...(cookie ? { cookie } : {}),
      },
      cache: "no-store",
      redirect: "manual",
    });
    if (res.ok) {
      const parsed = overviewSchema.safeParse(await res.json());
      if (parsed.success) return { data: parsed.data, isMock: false };
      console.error("[dashboard] overview payload did not match the contract");
    }
  } catch {
    // falls through to the fixture
  }

  if (isMocksOn()) return { data: overviewMock(store), isMock: true };
  return { data: null, isMock: false };
}
