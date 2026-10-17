import { contextFromRequest, readJson, tryTargetAuth } from "@/lib/bff/auth-adapter";
import { forgotPasswordMock } from "@/mocks/dashboard/auth";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/**
 * `POST /api/v1/auth/merchant/forgot-password/` → `{otp_token, ttl_seconds, masked_phone}`.
 * The code itself goes to the merchant WhatsApp number; the frontend never sees or stores it.
 */
export async function POST(request: Request) {
  const ctx = contextFromRequest(request);
  const passed = await tryTargetAuth(request, "merchant/forgot-password", ctx, await readJson(request));
  if (passed) return passed;
  if (!isMocksOn()) return notAvailable();
  return mockJson(forgotPasswordMock(), { delay: 200 });
}
