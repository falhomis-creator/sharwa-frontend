import { canManageCatalog, forbidden, mockRoute, respond } from "@/lib/bff/mock-route";
import { collectionRemove } from "@/mocks/catalog/organization";

/** `DELETE /api/v1/collections/<id>/products/<pid>/`. */
export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/collections/[id]/products/[pid]">) {
  const { id, pid } = await params;
  return mockRoute(request, ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(collectionRemove(store, Number(id), Number(pid)));
  });
}
