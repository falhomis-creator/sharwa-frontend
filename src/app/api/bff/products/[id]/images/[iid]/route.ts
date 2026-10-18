import { canManageCatalog, forbidden, mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { deleteImage } from "@/mocks/catalog/products";

/** `DELETE /api/v1/products/<id>/images/<iid>/` — the UI offers a 5s undo before calling it (FR-04.08). */
export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/products/[id]/images/[iid]">) {
  const { id, iid } = await params;
  return mockRoute(request, ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    const images = deleteImage(store, Number(id), Number(iid));
    if (!images) return mockJson({ detail: "المنتج غير موجود." }, { status: 404 });
    return mockJson(images);
  });
}
