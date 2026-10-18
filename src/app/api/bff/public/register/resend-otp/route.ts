import { contextFromRequest, forwardResponse } from "@/lib/bff/upstream";
import { fixtureResponse, readJsonBody, tryTarget } from "@/lib/bff/target-adapter";
import { resendOtpMock } from "@/mocks/public/resend-otp";
import { isMocksOn, notAvailable } from "@/mocks/runtime";

/**
 * `POST /api/v1/public/register/resend-otp/` `{otp_token}` → `{ttl_seconds}` /
 * 429 + `Retry-After` — [NEEDS BACKEND] (M02 §7).
 */
export async function POST(request: Request) {
  const ctx = contextFromRequest(request);
  const body = await readJsonBody(request);
  const res = await tryTarget(request, "/api/v1/public/register/resend-otp/", ctx, { method: "POST", json: body });
  if (res) return forwardResponse(res);
  return isMocksOn() ? fixtureResponse(resendOtpMock(body)) : notAvailable();
}
