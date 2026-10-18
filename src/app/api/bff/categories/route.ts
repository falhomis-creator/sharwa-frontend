import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createCategory, listCategories } from "@/mocks/catalog/organization";

/**
 * `GET/POST /api/v1/categories/` (M05 §7). The Ready `/api/v1/catalog/categories/` has the
 * tree only (no image/SEO/count), so the dashboard reads the extended `[NEEDS BACKEND]` row.
 */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(listCategories(store), { delay: 150 }));
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(createCategory(store, await readBody(request)));
  });
}
