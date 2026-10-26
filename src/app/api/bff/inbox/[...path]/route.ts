import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { inboxMock } from "@/mocks/inbox/router";

/**
 * `/api/bff/inbox/*` → `/api/v1/inbox/*` (M27 §7). ONE catch-all: the path after `inbox/` is the upstream path
 * verbatim (plus Django's trailing slash).
 *
 *   mock mode → `src/mocks/inbox` behind the merchant/staff session (`mockRoute`; module gates in the router);
 *   live mode → `channels` in `SHARWA_LIVE_MODULES` (INT-037): `api/views_channels.py` answers 401, the plan feature
 *               `social_channels` / `channels.inbox.access` 403, and filters by `StaffChannelAccess` itself.
 *   `_mock/*` (simulated inbound webhook, check reset) stays fixture-only.
 */
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const segs = path.filter(Boolean);
  const mock = () => mockRoute(request, (ctx) => inboxMock(request, path, ctx));
  if (segs[0] === "_mock") return mock();
  return liveOrMock(request, "channels", `/api/v1/inbox/${segs.map(encodeURIComponent).join("/")}/`, mock);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
