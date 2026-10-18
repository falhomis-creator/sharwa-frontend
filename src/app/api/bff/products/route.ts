import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createProduct, listProducts } from "@/mocks/catalog/products";

/**
 * `GET /api/v1/products/` (list, M04 §7) · `POST /api/v1/products/` (full ProductForm).
 * `[NEEDS BACKEND]` → mock. Reading needs `inventory.view` (FR-04.16); creating is
 * reserved to the owner and the store/branch manager roles (M04 §2).
 */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listProducts(store, url.searchParams), { delay: 220 }), {
    permission: "inventory.view",
  });
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(createProduct(store, await readBody(request)));
  });
}
