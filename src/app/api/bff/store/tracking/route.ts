import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { ownerOnly } from "@/mocks/integrations/guard";
import { getTracking, patchTracking } from "@/mocks/integrations/tracking";
import { mockJson } from "@/mocks/runtime";
import type { Session } from "@/features/dashboard-shell/schemas";

/**
 * `GET|PATCH /api/v1/store/tracking/` `[INT-023]` (M19 US-19.2). Feature `tracking_tools`
 * + owner only; the CAPI tokens are write-only — responses carry `has_*` (FR-19.04).
 */
function gate(session: Session) {
  if (!session.features.includes("tracking_tools")) return mockJson({ detail: "أدوات التتبع غير مفعّلة في خطتك." }, { status: 403 });
  return ownerOnly(session, "أدوات التتبع");
}
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, session }) => gate(session) ?? mockJson(getTracking(store), { delay: 150 }));
}
async function mockPATCH(request: Request) {
  return mockRoute(request, async ({ store, session }) => gate(session) ?? respond(patchTracking(store, await readBody(request))));
}

// INT-023: `liveOrMock` module `integrations` → Django `api/views_integrations.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "integrations", "/api/v1/store/tracking/", () => mockGET(request));
}
export async function PATCH(request: Request) {
  return liveOrMock(request, "integrations", "/api/v1/store/tracking/", () => mockPATCH(request));
}
