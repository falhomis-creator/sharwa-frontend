import { mockJson } from "@/mocks/runtime";
import { mockRoute } from "@/lib/bff/mock-route";
import { productExtrasMock } from "@/mocks/product-extras/router";

/**
 * `/api/bff/products/<id>/extras/<resource>/*` → `/api/v1/products/<id>/<resource>/*`
 * (M37 bundle components, compatibility rules, personalization fields, auction + bids,
 * serials; M36 tier prices — all `[NEEDS BACKEND]`). One catch-all under `extras/` so it
 * never shadows the existing `products/[id]/*` routes (images, variants, stock, changes).
 */
async function handle(request: Request, { params }: { params: Promise<{ id: string; path: string[] }> }) {
  const { id, path } = await params;
  if (!/^\d+$/.test(id)) return mockJson({ detail: "غير موجود." }, { status: 404 });
  return mockRoute(request, (ctx) => productExtrasMock(request, Number(id), path, ctx), { permission: "inventory.view" });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
