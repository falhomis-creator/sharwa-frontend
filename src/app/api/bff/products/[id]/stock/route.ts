import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { actorName, setStock } from "@/mocks/catalog/products";

/** `POST /api/v1/products/<id>/stock/` `{stock, reason:'manual_adjust'}` — needs `inventory.adjust` (FR-04.16). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/products/[id]/stock">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    async ({ store, session }) => {
      const body = await readBody(request);
      return respond(setStock(store, id, body.stock, actorName(session)));
    },
    { permission: "inventory.adjust" },
  );
}
