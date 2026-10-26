import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { verifyChain } from "@/mocks/staff/state";

/** `POST /api/v1/audit-log/verify/` → `{ok, broken_at?}` (`verify_chain()`); `?break=1` simulates a break (check script). */
async function mockPOST(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(verifyChain(store, url.searchParams.get("break") === "1"), { delay: 400 }), { permission: "staff.view_sessions" });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
export async function POST(request: Request) {
  return liveOrMock(request, "staff", "/api/v1/audit-log/verify/", () => mockPOST(request));
}
