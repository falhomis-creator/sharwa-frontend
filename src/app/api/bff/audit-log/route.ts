import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listAudit } from "@/mocks/staff/state";

/** `GET /api/v1/audit-log/?actor&action&from&to&page` — append-only (FR-18.08). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listAudit(store, url.searchParams), { delay: 160 }), { permission: "staff.view_sessions" });
}
