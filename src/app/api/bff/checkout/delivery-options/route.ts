import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { deliveryOptions } from "@/mocks/storefront/checkout";

/** `[NEEDS BACKEND]` `GET /api/v1/checkout/delivery-options/` (M12 §7). */
export function GET(request: Request) {
  return storefrontAdapter(request, "/api/v1/checkout/delivery-options/", ({ store, cartId }) =>
    mockJson(deliveryOptions(store, cartId), { delay: 140 }),
  );
}
