import { mockRoute } from "@/lib/bff/mock-route";
import { marketplacesMock } from "@/mocks/marketplaces/router";

/**
 * `/api/bff/marketplaces/*` → `/api/v1/marketplaces/*` (M28 §7, `[NEEDS BACKEND]`). One
 * optional catch-all; the path after `marketplaces/` is the upstream path verbatim.
 */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return mockRoute(request, (ctx) => marketplacesMock(request, path, ctx));
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
