import { mockRoute } from "@/lib/bff/mock-route";
import { loyaltyProgram } from "@/mocks/loyalty/program";
import { mockJson } from "@/mocks/runtime";

/** `GET /api/v1/loyalty/program/` — read-only here (M35 US-35.4); edited in M13 (`/api/bff/marketing/loyalty`). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(loyaltyProgram(store), { delay: 80 }), { permission: "customers.view" });
}
