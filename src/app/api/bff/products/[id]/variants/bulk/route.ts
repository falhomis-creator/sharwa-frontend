import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { bulkPatchVariants } from "@/mocks/catalog/products";

/** `POST /api/v1/products/<id>/variants/bulk/` `{variants:[{id, sku?, extra_price?, stock?}]}`. */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/products/[id]/variants/bulk">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    const body = await readBody(request);
    const rows = Array.isArray(body.variants)
      ? (body.variants as Array<Record<string, unknown>>).map((r) => ({
          id: Number(r.id),
          sku: typeof r.sku === "string" ? r.sku : undefined,
          extra_price: typeof r.extra_price === "string" ? r.extra_price : undefined,
          stock: typeof r.stock === "string" ? r.stock : undefined,
        }))
      : [];
    return respond(bulkPatchVariants(store, id, rows));
  });
}
