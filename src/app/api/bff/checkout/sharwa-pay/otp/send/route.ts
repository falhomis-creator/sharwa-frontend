import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { sharwaPayBalance } from "@/mocks/storefront/checkout";
import { sendOtp } from "@/mocks/storefront/otp";

/** `POST /api/v1/checkout/sharwa-pay/otp/send/` (Django, INT-014) `{phone}` → `{display_balance?}` (M12 §7, E-40). */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/checkout/sharwa-pay/otp/send/", async ({ store, body }) => {
    const { fields } = await body();
    const res = sendOtp(store, fields.phone, "sharwa_pay");
    return res.ok ? mockJson({ ok: true, ...sharwaPayBalance() }, { delay: 220 }) : respondMock(res);
  });
}
