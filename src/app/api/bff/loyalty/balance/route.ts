import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { loyaltyBalance } from "@/mocks/storefront/checkout";

/** `[NEEDS BACKEND]` `GET /api/v1/loyalty/balance/?phone=` → `{balance, min_points_to_redeem, display_value}` (M12 §7). */
export function GET(request: Request) {
  return storefrontAdapter(request, "/api/v1/loyalty/balance/", ({ store, url }) =>
    respondMock(loyaltyBalance(store, url.searchParams.get("phone")), 160),
  );
}
