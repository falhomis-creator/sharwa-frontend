import { mockRoute } from "@/lib/bff/mock-route";
import { b2bMock } from "@/mocks/b2b/router";

/** `/api/bff/b2b/*` — M36's `[NEEDS BACKEND]` form options (roles, branches). The drafts themselves are Ready (`/api/v1/orders/b2b-*`). */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return mockRoute(request, (ctx) => b2bMock(request, path, ctx));
}

export { handle as GET, handle as POST };
