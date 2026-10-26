import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { supportMock } from "@/mocks/support/router";

/**
 * `/api/bff/support/*` → `/api/v1/support/*` (M31 sessions + M32 tickets — INT-042). ONE catch-all: the path after
 * `support/` is the upstream path verbatim (plus Django's trailing slash).
 *
 * live (`support` in SHARWA_LIVE_MODULES) → `api/views_support.py`: reading and tickets for every signed-in member,
 * takeover / release / close / reply with `support.takeover_session` (the owner implicitly); session writes carry
 * `version` (409 `{detail, session}`), replies carry `client_id` (idempotent), the timeline polls with `?after=<cursor>`.
 * mock → `src/mocks/support` behind the merchant/staff session (`mockRoute`).
 */
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  return liveOrMock(request, "support", `/api/v1/support/${joined}/`, () => mockRoute(request, (ctx) => supportMock(request, path, ctx)));
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
