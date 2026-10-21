import { liveOrMock } from "@/lib/bff/live-route";
import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createCategory, listCategories } from "@/mocks/catalog/organization";

/**
 * `GET/POST /api/v1/categories/` (M05 §7). Integrated module `catalog`: Django answers when
 * live (`SHARWA_MOCKS=off` or `SHARWA_LIVE_MODULES=catalog`), the fixture otherwise.
 */
export async function GET(request: Request) {
  return liveOrMock(request, "catalog", "/api/v1/categories/", () =>
    mockRoute(request, ({ store }) => mockJson(listCategories(store), { delay: 150 })),
  );
}

export async function POST(request: Request) {
  return liveOrMock(request, "catalog", "/api/v1/categories/", () =>
    mockRoute(request, async ({ store, session }) => {
      if (!canManageCatalog(session)) return forbidden();
      return respond(createCategory(store, await readBody(request)));
    }),
  );
}
