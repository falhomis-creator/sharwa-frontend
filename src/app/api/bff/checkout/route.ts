import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { placeOrder } from "@/mocks/storefront/checkout";

/**
 * `[NEEDS BACKEND]` `POST /api/v1/checkout/` (multipart, every FR-12.02 field) →
 * `{order_id, public_uuid, status, payment_status, display_total, next_action}`
 * / 400 `{field:[msg]}` / 409 when the cart changed. Idempotent on `client_uuid`
 * (FR-12.04): a retry answers the order the first attempt created.
 */
export function POST(request: Request) {
  return storefrontAdapter(
    request,
    "/api/v1/checkout/",
    async ({ store, cartId, body }) => {
      const { fields, files } = await body();
      const receipt = files.receipt_image;
      if (receipt) {
        const ok = /\.(jpe?g|png|webp|pdf)$/i.test(receipt.name) && receipt.size <= 5 * 1024 * 1024;
        if (!ok) return mockJson({ receipt_image: ["الإيصال: صورة أو PDF حتى 5MB."] }, { status: 400 });
      }
      return respondMock(placeOrder(store, cartId, fields, Boolean(receipt)), 420);
    },
    { invalidatesStore: true },
  );
}
