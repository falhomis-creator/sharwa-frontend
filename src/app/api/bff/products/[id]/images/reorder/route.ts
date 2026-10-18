import { canManageCatalog, forbidden, mockRoute, readBody } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { reorderImages } from "@/mocks/catalog/products";

/** `POST /api/v1/products/<id>/images/reorder/` `{ordered_ids}` — saved immediately (US-04.4.1). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/products/[id]/images/reorder">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    const body = await readBody(request);
    const ordered = Array.isArray(body.ordered_ids) ? body.ordered_ids.map(Number) : [];
    const images = reorderImages(store, id, ordered);
    if (!images) return mockJson({ detail: "المنتج غير موجود." }, { status: 404 });
    return mockJson(images, { delay: 120 });
  });
}
