import { liveOrMock } from "@/lib/bff/live-route";
import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteCategory, updateCategory } from "@/mocks/catalog/organization";

/** `PATCH/DELETE /api/v1/categories/<id>/?reassign_to=<id>|none&children=grandparent|root` (FR-05.09). */
export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/categories/[id]">) {
  const id = Number((await params).id);
  return liveOrMock(request, "catalog", `/api/v1/categories/${id}/`, () =>
    mockRoute(request, async ({ store, session }) => {
      if (!canManageCatalog(session)) return forbidden();
      return respond(updateCategory(store, id, await readBody(request)));
    }),
  );
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/categories/[id]">) {
  const id = Number((await params).id);
  return liveOrMock(request, "catalog", `/api/v1/categories/${id}/`, () =>
    mockRoute(request, ({ store, session, url }) => {
      if (!canManageCatalog(session)) return forbidden();
      return respond(deleteCategory(store, id, url.searchParams));
    }),
  );
}
