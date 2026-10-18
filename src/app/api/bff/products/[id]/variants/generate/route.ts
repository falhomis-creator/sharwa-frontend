import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { generateVariants } from "@/mocks/catalog/products";

/** `POST /api/v1/products/<id>/variants/generate/` `{attribute_ids[], exclude[[option_ids]], option_ids?}`. */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/products/[id]/variants/generate">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    const body = await readBody(request);
    const attributeIds = Array.isArray(body.attribute_ids) ? body.attribute_ids.map(Number) : [];
    const optionIds = Array.isArray(body.option_ids) ? body.option_ids.map(Number) : undefined;
    const exclude = Array.isArray(body.exclude) ? body.exclude.filter(Array.isArray).map((c: unknown[]) => c.map(Number)) : [];
    return respond(generateVariants(store, id, attributeIds, optionIds, exclude));
  });
}
