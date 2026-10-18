import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { bulkProducts } from "@/mocks/catalog/products";
import { orderedProductIds } from "@/mocks/orders/state";

/**
 * `POST /api/v1/products/bulk/` `{ids[], action, payload?}` → `{succeeded[], failed[{id, reason}]}`
 * (FR-04.12). Rejections carry the reason the report shows («مزاد نشط»).
 */
export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    const body = await readBody(request);
    const ordered = orderedProductIds(store);
    const payload = body.payload && typeof body.payload === "object" ? (body.payload as Record<string, unknown>) : {};
    return respond(bulkProducts(store, body.ids, String(body.action ?? ""), payload, (id) => ordered.has(id)));
  });
}
