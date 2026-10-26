import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { placeOrder } from "@/mocks/storefront/checkout";

/**
 * `POST /api/v1/checkout/` (multipart, every FR-12.02 field) — Django since INT-014
 * (`api/views_checkout.py` over the legacy `checkout_service`) →
 * `{order_id, public_uuid, status, payment_status, display_total, next_action}`
 * / 400 `{field:[msg]}` / 409 when the cart changed / 429 within a minute of the last order.
 * Idempotent on `client_uuid` (FR-12.04, stored as `Order.idempotency_key`).
 */
export function POST(request: Request) {
  return storefrontAdapter(
    request,
    "/api/v1/checkout/",
    async ({ store, cartId, body }) => {
      const { fields, files } = await body();
      const receipt = files.receipt_image;
      if (receipt) {
        const ok = /\.(jpe?g|png)$/i.test(receipt.name) && receipt.size <= 5 * 1024 * 1024;
        if (!ok) return mockJson({ receipt_image: ["الإيصال: صورة JPEG أو PNG حتى 5MB."] }, { status: 400 });
      }
      return respondMock(placeOrder(store, cartId, fields, Boolean(receipt)), 420);
    },
    { invalidatesStore: true },
  );
}
