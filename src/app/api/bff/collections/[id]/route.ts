import { liveOrMock } from "@/lib/bff/live-route";
import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { collectionDetail, deleteCollection, saveCollection } from "@/mocks/catalog/organization";

/** `GET/PATCH/DELETE /api/v1/collections/<id>/` — GET carries the ordered products. */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/collections/[id]">) {
  const id = Number((await params).id);
  return liveOrMock(request, "catalog", `/api/v1/collections/${id}/`, () =>
    mockRoute(request, ({ store }) => {
      const detail = collectionDetail(store, id);
      return detail ? mockJson(detail, { delay: 150 }) : mockJson({ detail: "المجموعة غير موجودة." }, { status: 404 });
    }),
  );
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/collections/[id]">) {
  const id = Number((await params).id);
  return liveOrMock(request, "catalog", `/api/v1/collections/${id}/`, () =>
    mockRoute(request, async ({ store, session }) => {
      if (!canManageCatalog(session)) return forbidden();
      return respond(saveCollection(store, id, await readBody(request)));
    }),
  );
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/collections/[id]">) {
  const id = Number((await params).id);
  return liveOrMock(request, "catalog", `/api/v1/collections/${id}/`, () =>
    mockRoute(request, ({ store, session }) => {
      if (!canManageCatalog(session)) return forbidden();
      return respond(deleteCollection(store, id));
    }),
  );
}
