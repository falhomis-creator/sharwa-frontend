import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { collectionReorder } from "@/mocks/catalog/organization";

/** `POST /api/v1/collections/<id>/products/reorder/` `{ordered_ids}` (US-05.5.2). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/collections/[id]/products/reorder">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    const body = await readBody(request);
    return respond(collectionReorder(store, id, Array.isArray(body.ordered_ids) ? body.ordered_ids.map(Number) : []));
  });
}
