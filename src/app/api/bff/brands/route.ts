import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listBrands, saveBrand } from "@/mocks/catalog/organization";

/** `GET/POST /api/v1/brands/` (M05 §7 — `[NEEDS BACKEND]`). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(listBrands(store), { delay: 150 }));
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(saveBrand(store, null, await readBody(request)));
  });
}
