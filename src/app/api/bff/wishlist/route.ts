import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { shopperPhone, wishlistView } from "@/mocks/engagement/state";
import { parseCurrency, storeDefaultCurrency } from "@/mocks/storefront/money";
import { getCart } from "@/mocks/storefront/cart";

/** Live (INT-029, Django `api/views_engagement.py`): `GET /api/v1/wishlist/` → `{phone_normalized?, items:[{product, created_at}]}` (M42 §7). */
export function GET(request: Request) {
  return storefrontAdapter(request, "/api/v1/wishlist/", ({ store, cartId, url }) => {
    const currency = parseCurrency(url.searchParams.get("currency"), getCart(store, cartId).currency ?? storeDefaultCurrency(store));
    return mockJson(wishlistView(store, shopperPhone(store, cartId), currency), { delay: 120 });
  });
}
