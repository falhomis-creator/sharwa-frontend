import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { sendOtp } from "@/mocks/storefront/otp";

/** Live (INT-028, Django `api/views_wallets.py`): `POST /api/v1/loyalty/otp/send/` `{phone}` (M12 §7). */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/loyalty/otp/send/", async ({ store, body }) => {
    const { fields } = await body();
    const res = sendOtp(store, fields.phone, "loyalty");
    return res.ok ? mockJson({ ok: true }, { delay: 220 }) : respondMock(res);
  });
}
