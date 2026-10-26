import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { appsMock } from "@/mocks/apps/router";

/**
 * `/api/bff/apps/*` → `/api/v1/apps/*`. ONE catch-all: the path after `apps/` is the upstream path verbatim
 * (plus Django's trailing slash). Two live switches share it:
 *
 *   `apps`      (M30 — INT-040): catalogue, install/activate/deactivate, events, charges and the WhatsApp panel
 *               (`whatsapp/usage|summary|templates|connect-url`) — `api/views_apps.py`; plan feature `app_marketplace`,
 *               writes for the store owner only.
 *   `sharwa_ai` (M31 — INT-041): `sharwa-ai/status|reconnect|settings|console-token` — `api/views_sharwa_ai.py`
 *               (WhatsApp pairing via the sharwa_ai gateway, `SupportBotSettings`, RS256 console SSO; same gate,
 *               settings writes / reconnect / console token for the store owner only, the app must be active).
 *
 * mock mode → `src/mocks/apps` behind the merchant/staff session (`mockRoute`; feature + owner rules in the router).
 */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  const liveModule = path[0] === "sharwa-ai" ? "sharwa_ai" : "apps";
  return liveOrMock(request, liveModule, `/api/v1/apps/${joined ? `${joined}/` : ""}`, () => mockRoute(request, (ctx) => appsMock(request, path, ctx)));
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
