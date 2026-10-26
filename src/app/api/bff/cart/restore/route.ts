import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { restoreCart } from "@/mocks/storefront/cart";

/** `POST /api/v1/cart/restore/` (Django since INT-013) `{token}` → the restored cart (+ its coupon) (M11 US-11.5.2). */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/cart/restore/", async ({ store, cartId, body }) => {
    const { fields } = await body();
    return respondMock(restoreCart(store, cartId, fields.token), 220);
  });
}
