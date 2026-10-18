import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { reorderSections } from "@/mocks/design/state";

/** `POST /api/v1/admin/sections/reorder/ {ordered_ids}` → `{ok, reordered}` — Ready upstream (auth caveat). */
export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "تصميم المتجر مقصور على مالك المتجر." }, { status: 403 });
    return respond(reorderSections(store, await readBody(request)));
  });
}
