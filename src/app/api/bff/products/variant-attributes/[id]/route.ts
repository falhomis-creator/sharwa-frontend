import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteAttribute, updateAttribute } from "@/mocks/catalog/dictionary";

/** `PATCH/DELETE /api/v1/variant-attributes/<id>/` — DELETE is refused while variants use it (M04 §8). */
export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/products/variant-attributes/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(updateAttribute(store, id, await readBody(request)));
  });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/products/variant-attributes/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(deleteAttribute(store, id));
  });
}
