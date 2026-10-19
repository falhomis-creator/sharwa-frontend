import { mockRoute } from "@/lib/bff/mock-route";
import { sharwaShipMock } from "@/mocks/shipping/sharwa-ship-router";

/** `/api/v1/shipping/rate-cards/*` — M39 §7 `[NEEDS BACKEND]` (router: `src/mocks/shipping/sharwa-ship-router.ts`). */
async function handle(request: Request) {
  return mockRoute(request, (ctx) => sharwaShipMock(request, ["rate-cards"], ctx));
}
export { handle as GET, handle as POST };
