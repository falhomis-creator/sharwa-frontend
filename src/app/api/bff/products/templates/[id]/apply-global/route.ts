import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { applyGlobal } from "@/mocks/catalog/dictionary";

/** `POST /api/v1/product-templates/<id>/apply-global/` `{global_template_id}` (US-04.6.1). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/products/templates/[id]/apply-global">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    const body = await readBody(request);
    return respond(applyGlobal(store, id, Number(body.global_template_id)));
  });
}
