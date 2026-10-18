import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { walletPreview } from "@/mocks/storefront/checkout";

/** `[NEEDS BACKEND]` `POST /api/v1/wallet/balance-preview/` `{phone}` → `{display_balance, display_applicable}` (M12 §7). */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/wallet/balance-preview/", async ({ store, cartId, body }) => {
    const { fields } = await body();
    return respondMock(walletPreview(store, cartId, fields.phone), 180);
  });
}
