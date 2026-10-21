import { liveOrMock } from "@/lib/bff/live-route";
import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listCollections, saveCollection } from "@/mocks/catalog/organization";

/** `GET/POST /api/v1/collections/` — manual collections only (FR-05.07). Integrated module `catalog`. */
export async function GET(request: Request) {
  return liveOrMock(request, "catalog", "/api/v1/collections/", () =>
    mockRoute(request, ({ store }) => mockJson(listCollections(store), { delay: 150 })),
  );
}

export async function POST(request: Request) {
  return liveOrMock(request, "catalog", "/api/v1/collections/", () =>
    mockRoute(request, async ({ store, session }) => {
      if (!canManageCatalog(session)) return forbidden();
      return respond(saveCollection(store, null, await readBody(request)));
    }),
  );
}
