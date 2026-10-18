import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { quote } from "@/mocks/storefront/checkout";

/** `[NEEDS BACKEND]` `POST /api/v1/checkout/quote/` → `OrderInvoice` (`display_*` only, M12 §7). */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/checkout/quote/", async ({ store, cartId, body }) => {
    const { fields } = await body();
    return respondMock(quote(store, cartId, fields), 180);
  });
}
