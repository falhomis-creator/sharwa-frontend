import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteOption, updateOption } from "@/mocks/catalog/dictionary";

/** `PATCH/DELETE /api/v1/variant-attributes/options/<oid>/`. */
export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/products/variant-attributes/options/[oid]">) {
  const oid = Number((await params).oid);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(updateOption(store, oid, await readBody(request)));
  });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/products/variant-attributes/options/[oid]">) {
  const oid = Number((await params).oid);
  return mockRoute(request, ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(deleteOption(store, oid));
  });
}
