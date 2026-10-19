import { mockRoute } from "@/lib/bff/mock-route";
import { partnersMock } from "@/mocks/affiliates/router";

/** `/api/bff/affiliates/*` → proposed `/api/v1/affiliates/*` (M17 §7, `[NEEDS BACKEND]`). One catch-all; see the router. */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return mockRoute(request, (ctx) => partnersMock("affiliates", request, path, ctx));
}

export { handle as GET, handle as POST, handle as PATCH };
