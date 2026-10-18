import { respondMock, storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { shopperPhone, toggleWishlist } from "@/mocks/engagement/state";
import { normalizeBuyerPhone } from "@/mocks/storefront/otp";

/**
 * `[NEEDS BACKEND]` (M42 §7) `POST /api/v1/wishlist/toggle/` `{product_id}` → `{saved}`.
 * The phone is the session's (`POST /shopper/phone/` first); a `phone` in the body is accepted
 * as a fallback for callers that already know it (the Phase 4 contract). 409 when neither.
 */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/wishlist/toggle/", async ({ store, cartId, body }) => {
    const { fields } = await body();
    const phone = shopperPhone(store, cartId) ?? normalizeBuyerPhone(fields.phone);
    if (!phone) return mockJson({ detail: "أدخل رقم هاتفك أولاً لحفظ قائمتك." }, { status: 409 });
    return respondMock(toggleWishlist(store, phone, Number(fields.product_id)), 140);
  });
}
