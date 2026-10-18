import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { previewRouting } from "@/mocks/locations/state";

/** `GET …/routing-rules/preview/?city&category` → the location the first matching rule picks. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => {
    const category = url.searchParams.get("category");
    return mockJson(previewRouting(store, url.searchParams.get("city") ?? "", category ? Number(category) : null), { delay: 100 });
  });
}
