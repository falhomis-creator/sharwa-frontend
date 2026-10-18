import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteTemplate, updateTemplate } from "@/mocks/catalog/dictionary";

/** `PATCH/DELETE /api/v1/product-templates/<id>/`. */
export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/products/templates/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(updateTemplate(store, id, await readBody(request)));
  });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/products/templates/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(deleteTemplate(store, id));
  });
}
