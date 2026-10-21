import { liveOrMock } from "@/lib/bff/live-route";
import { canManageCatalog, forbidden, mockRoute, respond } from "@/lib/bff/mock-route";
import { collectionRemove } from "@/mocks/catalog/organization";

/** `DELETE /api/v1/collections/<id>/products/<product_id>/` → the collection detail (FR-05.07). */
export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/collections/[id]/products/[pid]">) {
  const { id: rawId, pid: rawPid } = await params;
  const id = Number(rawId);
  const productId = Number(rawPid);
  return liveOrMock(request, "catalog", `/api/v1/collections/${id}/products/${productId}/`, () =>
    mockRoute(request, ({ store, session }) => {
      if (!canManageCatalog(session)) return forbidden();
      return respond(collectionRemove(store, id, productId));
    }),
  );
}
