import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { findVisible } from "@/mocks/storefront/catalog";
import { normalizeBuyerPhone } from "@/mocks/storefront/otp";
import { storeState } from "@/mocks/store-state";

/**
 * `[NEEDS BACKEND]` (E-42) `POST /api/v1/wishlist/toggle/` `{product_id, phone}` → `{in_wishlist}`.
 * The storefront keeps the list locally first (M09/M10 assumption) and syncs a toggle here
 * once the buyer has given a phone.
 */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/wishlist/toggle/", async ({ store, body }) => {
    const { fields } = await body();
    const phone = normalizeBuyerPhone(fields.phone);
    const productId = Number(fields.product_id);
    if (!phone) return mockJson({ phone: ["رقم واتساب غير صحيح."] }, { status: 400 });
    if (!findVisible(store, productId)) return mockJson({ detail: "المنتج غير موجود." }, { status: 404 });
    const lists = storeState(store, "storefront:wishlists", () => new Map<string, Set<number>>());
    const set = lists.get(phone) ?? new Set<number>();
    const inWishlist = !set.has(productId);
    if (inWishlist) set.add(productId);
    else set.delete(productId);
    lists.set(phone, set);
    return mockJson({ in_wishlist: inWishlist });
  });
}
