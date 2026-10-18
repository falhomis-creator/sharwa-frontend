import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { STAFF_OPTIONS } from "@/mocks/locations/state";

/** The staff picker for assignments (M18's list, read-only here). */
export async function GET(request: Request) {
  return mockRoute(request, () => mockJson(STAFF_OPTIONS, { delay: 100 }));
}
