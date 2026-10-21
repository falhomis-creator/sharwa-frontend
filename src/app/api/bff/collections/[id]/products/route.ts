import { liveOrMock } from "@/lib/bff/live-route";
import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { collectionAdd } from "@/mocks/catalog/organization";

/**
 * `POST /api/v1/collections/<id>/products/` `{product_ids}` → the collection detail, new
 * products appended in order (FR-05.07).
 */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/collections/[id]/products">) {
  const id = Number((await params).id);
  return liveOrMock(request, "catalog", `/api/v1/collections/${id}/products/`, () =>
    mockRoute(request, async ({ store, session }) => {
      if (!canManageCatalog(session)) return forbidden();
      const body = await readBody(request);
      const ids = Array.isArray(body.product_ids) ? body.product_ids.map(Number).filter(Number.isInteger) : [];
      return respond(collectionAdd(store, id, ids));
    }),
  );
}
