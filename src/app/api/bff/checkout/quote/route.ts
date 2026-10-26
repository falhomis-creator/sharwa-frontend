import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { quote } from "@/mocks/storefront/checkout";

/** `POST /api/v1/checkout/quote/` → `OrderInvoice` (`display_*` only, M12 §7) — Django `build_order_invoice` since INT-014. */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/checkout/quote/", async ({ store, cartId, body }) => {
    const { fields } = await body();
    return respondMock(quote(store, cartId, fields), 180);
  });
}
