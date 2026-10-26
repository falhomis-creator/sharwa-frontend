import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { paymentOptions } from "@/mocks/storefront/checkout";

/** `GET /api/v1/checkout/payment-options/` → methods with `enabled`/`reason` (+ gateway `fields`) + payout accounts (M12 §7) — Django since INT-014. */
export function GET(request: Request) {
  return storefrontAdapter(request, "/api/v1/checkout/payment-options/", ({ store, cartId }) =>
    mockJson(paymentOptions(store, cartId), { delay: 140 }),
  );
}
