import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteTag, saveTag } from "@/mocks/catalog/organization";

/** `PATCH/DELETE /api/v1/tags/<id>/` — DELETE removes it from its products and reports how many (FR-05.09). */
export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/tags/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(saveTag(store, id, await readBody(request)));
  });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/tags/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(deleteTag(store, id));
  });
}
