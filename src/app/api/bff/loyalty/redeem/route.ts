import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { verifyOtp } from "@/mocks/storefront/otp";

/**
 * Live (INT-028, Django `api/views_wallets.py`): `POST /api/v1/loyalty/redeem/` `{phone, otp, points}` (M12 §7). The mock
 * verifies the OTP; the discount itself is applied by the next `checkout/quote` with
 * `redeem_points`, so the invoice stays the single source of every amount.
 */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/loyalty/redeem/", async ({ store, body }) => {
    const { fields } = await body();
    const res = verifyOtp(store, fields.phone, fields.otp, "loyalty");
    if (!res.ok) return respondMock(res);
    return mockJson({ ok: true, points: Number(fields.points) || 0 }, { delay: 200 });
  });
}
