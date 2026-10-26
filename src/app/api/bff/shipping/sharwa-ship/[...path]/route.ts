import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { sharwaShipMock } from "@/mocks/shipping/sharwa-ship-router";

/**
 * `/api/bff/shipping/sharwa-ship/…` → `/api/v1/shipping/sharwa-ship/…` (M39 — INT-047). live (`sharwa_ship` in SHARWA_LIVE_MODULES) →
 * `api/views_sharwa_ship.py` (feature `sharwa_ship` — or local delivery for the courier-supervision rows —, `orders.view`
 * to read, the owner to write); mock → `src/mocks/shipping/sharwa-ship-router.ts` behind the same gates.
 */
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  const upstream = joined ? `/api/v1/shipping/sharwa-ship/${joined}/` : "/api/v1/shipping/sharwa-ship/";
  return liveOrMock(request, "sharwa_ship", upstream, () => mockRoute(request, (ctx) => sharwaShipMock(request, ["sharwa-ship", ...path], ctx)));
}

export { handle as GET, handle as POST };
