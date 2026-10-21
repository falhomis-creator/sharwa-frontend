import { liveOrMock } from "@/lib/bff/live-route";
import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { collectionReorder } from "@/mocks/catalog/organization";

/**
 * `POST /api/v1/collections/<id>/products/reorder/` `{ordered_ids}` → the collection detail
 * (FR-05.07).
 */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/collections/[id]/products/reorder">) {
  const id = Number((await params).id);
  return liveOrMock(request, "catalog", `/api/v1/collections/${id}/products/reorder/`, () =>
    mockRoute(request, async ({ store, session }) => {
      if (!canManageCatalog(session)) return forbidden();
      const body = await readBody(request);
      const ordered = Array.isArray(body.ordered_ids) ? body.ordered_ids.map(Number).filter(Number.isInteger) : [];
      return respond(collectionReorder(store, id, ordered));
    }),
  );
}
