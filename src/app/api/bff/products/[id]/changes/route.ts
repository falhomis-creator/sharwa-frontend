import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { productChanges } from "@/mocks/catalog/products";

/** `GET /api/v1/products/<id>/changes/?page` → ProductChangeLog rows (US-04.8). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/products/[id]/changes">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    ({ store, url }) => mockJson(productChanges(store, id, Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1))),
    { permission: "inventory.view" },
  );
}
