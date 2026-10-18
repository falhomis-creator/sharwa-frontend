import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { sendOtp } from "@/mocks/storefront/otp";

/** `[NEEDS BACKEND]` `POST /api/v1/wallet/otp/send/` `{phone}` (M12 §7). */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/wallet/otp/send/", async ({ store, body }) => {
    const { fields } = await body();
    const res = sendOtp(store, fields.phone, "wallet");
    return res.ok ? mockJson({ ok: true }, { delay: 220 }) : respondMock(res);
  });
}
