import { canManageCatalog, forbidden, mockRoute, readBody, respond, type MockResult } from "@/lib/bff/mock-route";
import { actorName, deleteProduct, findProduct, toDetail, updateProduct } from "@/mocks/catalog/products";
import { orderedProductIds } from "@/mocks/orders/state";
import type { ProductDetail } from "@/features/products/schemas";

/** `GET/PATCH/DELETE /api/v1/products/<id>/` (M04 §7). DELETE archives a product that has orders (M04 §8). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/products/[id]">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    ({ store }) => {
      const { state, p } = findProduct(store, id);
      const result: MockResult<ProductDetail> = p
        ? { ok: true, data: toDetail(state, p, orderedProductIds(store).has(id)) }
        : { ok: false, status: 404, body: { detail: "المنتج غير موجود." } };
      return respond(result);
    },
    { permission: "inventory.view" },
  );
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/products/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    const body = await readBody(request);
    // In-place price edits from the list need `discounts.manage` only for the sale fields;
    // the full editor is reserved to the owner/manager roles (M04 §2).
    if (!canManageCatalog(session)) return forbidden();
    return respond(updateProduct(store, id, body, actorName(session), orderedProductIds(store).has(id)));
  });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/products/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    return respond(deleteProduct(store, id, orderedProductIds(store).has(id)));
  });
}
