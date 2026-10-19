import { mockRoute } from "@/lib/bff/mock-route";
import { sharwaShipMock } from "@/mocks/shipping/sharwa-ship-router";

/** `/api/v1/shipping/agents/*` — M39 §7 `[NEEDS BACKEND]` (router: `src/mocks/shipping/sharwa-ship-router.ts`). */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return mockRoute(request, (ctx) => sharwaShipMock(request, ["agents", ...path], ctx));
}
export { handle as GET, handle as POST };
