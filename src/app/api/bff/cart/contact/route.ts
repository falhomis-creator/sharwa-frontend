import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { saveContact } from "@/mocks/storefront/cart";

/** `POST /api/v1/cart/contact/` (Django since INT-013) `{phone, name?}` → 204: the abandoned-cart reminder target (M11 US-11.5). */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/cart/contact/", async ({ store, cartId, body }) => {
    const { fields } = await body();
    return respondMock(saveContact(store, cartId, fields), 120);
  });
}
