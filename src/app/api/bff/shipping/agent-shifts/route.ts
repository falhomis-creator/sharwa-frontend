import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { sharwaShipMock } from "@/mocks/shipping/sharwa-ship-router";

/**
 * `/api/bff/shipping/agent-shifts/` → `/api/v1/shipping/agent-shifts/` (M39 — INT-047). live (`sharwa_ship` in SHARWA_LIVE_MODULES) →
 * `api/views_sharwa_ship.py` (feature `sharwa_ship` — or local delivery for the courier-supervision rows —, `orders.view`
 * to read, the owner to write); mock → `src/mocks/shipping/sharwa-ship-router.ts` behind the same gates.
 */
async function handle(request: Request) {
  return liveOrMock(request, "sharwa_ship", "/api/v1/shipping/agent-shifts/", () => mockRoute(request, (ctx) => sharwaShipMock(request, ["agent-shifts"], ctx)));
}

export { handle as GET, handle as POST };
