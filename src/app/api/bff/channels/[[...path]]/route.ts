import { mockRoute } from "@/lib/bff/mock-route";
import { channelsMock } from "@/mocks/inbox/router";

/**
 * `/api/bff/channels/*` → `/api/v1/channels/*` (M27 §7 — every row `[NEEDS BACKEND]`). ONE catch-all
 * adapter: the path after `channels/` is the upstream path verbatim, so the day Django ships
 * the rows this handler becomes a passthrough and no screen changes. Session gate (401)
 * and the 501-when-mocks-off rule come from `mockRoute`; the module's own gates live in
 * the mock router.
 */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  return mockRoute(request, (ctx) => channelsMock(request, path ?? [], ctx));
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
