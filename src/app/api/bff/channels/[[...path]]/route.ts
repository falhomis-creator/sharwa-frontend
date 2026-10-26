import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { channelsMock } from "@/mocks/inbox/router";

/**
 * `/api/bff/channels/*` → `/api/v1/channels/*` (M27 §7). ONE optional catch-all: the path after `channels/` is the
 * upstream path verbatim (plus Django's trailing slash).
 *
 *   mock mode → `src/mocks/inbox` behind the merchant/staff session (`mockRoute`; feature + owner gates in the router);
 *   live mode → `channels` in `SHARWA_LIVE_MODULES` (INT-037, one toggle for the inbox and the channel settings):
 *               `api/views_channels.py` answers 401, the plan feature `social_channels` 403, owner-only settings 403.
 *               `<code>/oauth/start` is a 302 to the provider, forwarded as is (the browser follows it).
 */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  return liveOrMock(request, "channels", `/api/v1/channels/${joined ? `${joined}/` : ""}`, () =>
    mockRoute(request, (ctx) => channelsMock(request, path, ctx)),
  );
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
