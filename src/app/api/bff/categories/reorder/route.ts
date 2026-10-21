import { liveOrMock } from "@/lib/bff/live-route";
import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { reorderCategories } from "@/mocks/catalog/organization";

/** `POST /api/v1/categories/reorder/` `{moves:[{id, parent_id, sort_order}]}` → tree / 400 on a cycle (FR-05.02). */
export async function POST(request: Request) {
  return liveOrMock(request, "catalog", "/api/v1/categories/reorder/", () =>
    mockRoute(request, async ({ store, session }) => {
      if (!canManageCatalog(session)) return forbidden();
      return respond(reorderCategories(store, await readBody(request)));
    }),
  );
}
