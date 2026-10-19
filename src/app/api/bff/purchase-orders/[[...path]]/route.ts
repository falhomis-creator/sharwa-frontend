import { mockRoute } from "@/lib/bff/mock-route";
import { procurementMock } from "@/mocks/procurement/router";

/**
 * `/api/bff/purchase-orders/*` → `/api/v1/purchase-orders/*` (M23 §7, every row `[NEEDS BACKEND]`). One optional
 * catch-all: the path after `/api/bff/` is the upstream path verbatim, so the day Django
 * ships the rows this handler becomes a passthrough and no screen changes.
 */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return mockRoute(request, (ctx) => procurementMock(request, ["purchase-orders", ...path], ctx));
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
