import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { applyTemplate } from "@/mocks/catalog/dictionary";

/** `POST /api/v1/product-templates/<id>/apply/` `{product_ids[]}` → `{applied, skipped}` (US-04.6.2). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/products/templates/[id]/apply">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    const body = await readBody(request);
    const ids = Array.isArray(body.product_ids) ? body.product_ids.map(Number) : [];
    return respond(applyTemplate(store, id, ids));
  });
}
