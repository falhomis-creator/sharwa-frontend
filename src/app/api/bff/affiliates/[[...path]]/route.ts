import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { partnersMock } from "@/mocks/affiliates/router";

/**
 * `/api/bff/affiliates/*` → `/api/v1/affiliates/*` (M17 §7). One catch-all: the path after the resource is the
 * upstream path verbatim (plus Django's trailing slash).
 *
 *   mock mode → `src/mocks/affiliates` behind the merchant/staff session (`mockRoute`);
 *   live mode → `affiliates` in `SHARWA_LIVE_MODULES` (INT-034, one toggle for both tabs):
 *               `api/views_partners.py` answers 401, the plan feature 403, owner-only writes 403.
 */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  return liveOrMock(request, "affiliates", `/api/v1/affiliates/${joined ? `${joined}/` : ""}`, () =>
    mockRoute(request, (ctx) => partnersMock("affiliates", request, path, ctx)),
  );
}

export { handle as GET, handle as POST, handle as PATCH };
