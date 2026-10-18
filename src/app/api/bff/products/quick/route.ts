import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { quickAdd } from "@/mocks/catalog/products";

/** `POST /api/v1/products/quick/` — ProductQuickAddForm fields only (US-04.2). */
export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(quickAdd(store, await readBody(request)));
  });
}
