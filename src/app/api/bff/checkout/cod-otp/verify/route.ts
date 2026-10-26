import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { codCheck } from "@/mocks/storefront/checkout";
import { verifyOtp } from "@/mocks/storefront/otp";

/** `POST /api/v1/checkout/cod-otp/verify/` `{phone, otp}` → `{ok, cod_allowed, reason?}` (M12 §7) — Django since INT-014 (`cod_allowed` is always true there: COD trust is a merchant-side signal). */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/checkout/cod-otp/verify/", async ({ store, body }) => {
    const { fields } = await body();
    const res = verifyOtp(store, fields.phone, fields.otp, "cod");
    return res.ok ? mockJson({ ok: true, ...codCheck(res.phone) }, { delay: 200 }) : respondMock(res);
  });
}
