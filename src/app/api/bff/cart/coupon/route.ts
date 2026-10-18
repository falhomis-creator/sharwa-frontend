import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { applyCoupon, removeCoupon } from "@/mocks/storefront/cart";
import { mockJson } from "@/mocks/runtime";

/**
 * `[NEEDS BACKEND]` `POST /api/v1/cart/coupon/` `{code}` → the cart with `coupon_code` and
 * the discount, or 400 `{detail}` with the server's message verbatim; `DELETE` removes it (M11 §7).
 * The coupon lives in the session, never in the URL (FR-11.11).
 */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/cart/coupon/", async ({ store, cartId, body }) => {
    const { fields } = await body();
    return respondMock(applyCoupon(store, cartId, fields.code), 220);
  });
}

export function DELETE(request: Request) {
  return storefrontAdapter(request, "/api/v1/cart/coupon/", ({ store, cartId }) => mockJson(removeCoupon(store, cartId), { delay: 140 }));
}
