import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { globalTemplates } from "@/mocks/catalog/seed";

/** `GET /api/v1/global-variant-templates/` — the 35 central sectors, read-only for merchants. */
export async function GET(request: Request) {
  return mockRoute(request, () => mockJson(globalTemplates(), { delay: 120 }));
}
