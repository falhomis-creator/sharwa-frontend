import { mockRoute } from "@/lib/bff/mock-route";
import { dropshippingMock } from "@/mocks/dropshipping/router";

/**
 * `/api/bff/dropshipping/*` → `/api/v1/dropshipping/*` (M29 §7). One optional catch-all;
 * the path after `dropshipping/` is the upstream path verbatim (multipart passes through).
 */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return mockRoute(request, (ctx) => dropshippingMock(request, path, ctx));
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
