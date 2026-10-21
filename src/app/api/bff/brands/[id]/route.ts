import { liveOrMock } from "@/lib/bff/live-route";
import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteBrand, saveBrand } from "@/mocks/catalog/organization";

/** `PATCH/DELETE /api/v1/brands/<id>/` — DELETE removes it from its products and reports how many (FR-05.09). */
export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/brands/[id]">) {
  const id = Number((await params).id);
  return liveOrMock(request, "catalog", `/api/v1/brands/${id}/`, () =>
    mockRoute(request, async ({ store, session }) => {
      if (!canManageCatalog(session)) return forbidden();
      return respond(saveBrand(store, id, await readBody(request)));
    }),
  );
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/brands/[id]">) {
  const id = Number((await params).id);
  return liveOrMock(request, "catalog", `/api/v1/brands/${id}/`, () =>
    mockRoute(request, ({ store, session }) => {
      if (!canManageCatalog(session)) return forbidden();
      return respond(deleteBrand(store, id));
    }),
  );
}
