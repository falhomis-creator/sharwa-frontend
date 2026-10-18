import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { collectionAdd } from "@/mocks/catalog/organization";

/** `POST /api/v1/collections/<id>/products/` `{product_ids[]}`. */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/collections/[id]/products">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    const body = await readBody(request);
    return respond(collectionAdd(store, id, Array.isArray(body.product_ids) ? body.product_ids.map(Number) : []));
  });
}
