import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { PERMISSIONS } from "@/mocks/staff/state";

/** `GET /api/v1/permissions/` → `[{code, name, category}]` — the matrix is built from this (FR-18.03). */
export async function GET(request: Request) {
  return mockRoute(request, () => mockJson(PERMISSIONS, { delay: 60 }), { permission: "staff.view" });
}
