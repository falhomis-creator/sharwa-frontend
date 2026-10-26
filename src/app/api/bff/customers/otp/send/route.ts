import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { OTP_PURPOSES, sendOtp, type OtpPurpose } from "@/mocks/storefront/otp";

/**
 * Live (INT-029, Django `api/views_engagement.py`): WhatsApp OTP for the buyer actions that are not part of checkout —
 * review, bid, wishlist sync (M10 §10: «بنفس نمط الـ checkout»). Proposed
 * `POST /api/v1/customers/otp/send/` `{phone, purpose}` → `{ok}` / 429 + `Retry-After`.
 */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/customers/otp/send/", async ({ store, body }) => {
    const { fields } = await body();
    const purpose = String(fields.purpose ?? "");
    if (!(OTP_PURPOSES as readonly string[]).includes(purpose)) return mockJson({ purpose: ["غرض غير معروف."] }, { status: 400 });
    const res = sendOtp(store, fields.phone, purpose as OtpPurpose);
    return res.ok ? mockJson({ ok: true }, { delay: 220 }) : respondMock(res);
  });
}
