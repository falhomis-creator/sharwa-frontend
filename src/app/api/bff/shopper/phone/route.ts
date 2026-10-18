import { respondMock, storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { setShopperPhone, shopperPhone } from "@/mocks/engagement/state";

/**
 * `[NEEDS BACKEND]` (M42 §7) the shopper's phone in the session (the same cookie as the cart):
 * `GET /api/v1/shopper/phone/` → `{phone_normalized|null}`; `POST` `{phone}` → `{phone_normalized}`.
 * No OTP here (FR-42.01): it identifies a wishlist, not a payment.
 */
export function GET(request: Request) {
  return storefrontAdapter(request, "/api/v1/shopper/phone/", ({ store, cartId }) => mockJson({ phone_normalized: shopperPhone(store, cartId) }, { delay: 60 }));
}

export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/shopper/phone/", async ({ store, cartId, body }) => {
    const { fields } = await body();
    return respondMock(setShopperPhone(store, cartId, fields.phone), 120);
  });
}
