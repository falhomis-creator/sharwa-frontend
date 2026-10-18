import { respondMock, storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { shopperPhone, subscribeBackInStock } from "@/mocks/engagement/state";

/**
 * `[NEEDS BACKEND]` `POST …/back-in-stock/` `{phone?}` — `BackInStockNotification` (M42 US-42.5).
 * 201 the first time, 200 on a repeat (idempotent); the phone defaults to the session's.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/catalog/products/[id]/back-in-stock">) {
  const { id } = await params;
  return storefrontAdapter(request, `/api/v1/catalog/products/${id}/back-in-stock/`, async ({ store, cartId, body }) => {
    const { fields } = await body();
    return respondMock(subscribeBackInStock(store, Number(id), fields.phone ?? shopperPhone(store, cartId)), 180);
  });
}
