import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { PERMISSIONS } from "@/mocks/staff/state";

/** `GET /api/v1/permissions/` → `[{code, name, category}]` — the matrix is built from this (FR-18.03). */
async function mockGET(request: Request) {
  return mockRoute(request, () => mockJson(PERMISSIONS, { delay: 60 }), { permission: "staff.view" });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "staff", "/api/v1/permissions/", () => mockGET(request));
}
