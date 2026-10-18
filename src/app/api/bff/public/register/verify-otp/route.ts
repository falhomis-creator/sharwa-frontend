import { contextFromRequest, forwardResponse, jsonResponse } from "@/lib/bff/upstream";
import { fixtureResponse, readJsonBody, tryTarget } from "@/lib/bff/target-adapter";
import { provCookie } from "@/features/onboarding/handoff";
import { verifyResponseSchema } from "@/features/onboarding/schemas";
import { verifyOtpMock } from "@/mocks/public/verify-otp";
import { isMocksOn, notAvailable } from "@/mocks/runtime";

/**
 * `POST /api/v1/public/register/verify-otp/` `{otp_token, code}` →
 * `{status_token, status_url}` / 400 wrong code / 410 expired / 429 — [NEEDS BACKEND].
 *
 * On success this adapter also sets `sharwa_prov` (M47 US-47.3.2): our own short-lived
 * cookie on the platform host, whichever side answered.
 */
export async function POST(request: Request) {
  const ctx = contextFromRequest(request);
  const secure = ctx.protocol === "https";
  const body = await readJsonBody(request);

  const res = await tryTarget(request, "/api/v1/public/register/verify-otp/", ctx, { method: "POST", json: body });
  if (res) {
    if (!res.ok) return forwardResponse(res);
    const parsed = verifyResponseSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) return jsonResponse({ detail: "استجابة غير متوقعة من الخادم." }, { status: 502 });
    const out = jsonResponse(parsed.data);
    for (const cookie of res.headers.getSetCookie()) out.headers.append("set-cookie", cookie);
    out.headers.append("set-cookie", provCookie(parsed.data.status_token, secure));
    return out;
  }

  if (!isMocksOn()) return notAvailable();
  const result = verifyOtpMock(body);
  return fixtureResponse(result, result.ok ? { "set-cookie": provCookie(result.data.status_token, secure) } : {});
}
