import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { sendOtp } from "@/mocks/storefront/otp";

/** `POST /api/v1/checkout/cod-otp/send/` `{phone}` (HTML-only today as `/checkout/cod-otp/send/`, M12 §7). */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/checkout/cod-otp/send/", async ({ store, body }) => {
    const { fields } = await body();
    const res = sendOtp(store, fields.phone, "cod");
    return res.ok ? mockJson({ ok: true }, { delay: 220 }) : respondMock(res);
  });
}
