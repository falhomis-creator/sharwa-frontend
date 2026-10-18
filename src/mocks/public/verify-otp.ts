import { messages } from "@/features/onboarding/onboarding.content";
import {
  MOCK_LOCKOUT_SECONDS,
  MOCK_MAX_ATTEMPTS,
  MOCK_OTP_CODE,
  otpSession,
  uniquenessErrors,
  wizardState,
  type MockResult,
} from "@/mocks/public/register";

/**
 * `POST /api/v1/public/register/verify-otp/` fixture (M02 §7 — `[NEEDS BACKEND]`):
 * `{otp_token, code}` → `{status_token, status_url}` · 400 wrong code · 410 expired ·
 * 429 + `Retry-After` after five wrong codes. Uniqueness is checked again here, as the
 * server does (US-02.3.4).
 */
export function verifyOtpMock(body: Record<string, unknown>): MockResult<{ status_token: string; status_url: string }> {
  const session = otpSession(body.otp_token);
  const now = Date.now();
  if (!session || now >= session.expiresAt) {
    return { ok: false, status: 410, body: { detail: "انتهت صلاحية الرمز" } };
  }
  if (now < session.lockedUntil) {
    const retryAfter = Math.ceil((session.lockedUntil - now) / 1000);
    return { ok: false, status: 429, body: { detail: messages.tooMany(retryAfter) }, retryAfter };
  }
  if (body.code !== MOCK_OTP_CODE) {
    session.attempts += 1;
    if (session.attempts >= MOCK_MAX_ATTEMPTS) {
      session.attempts = 0;
      session.lockedUntil = now + MOCK_LOCKOUT_SECONDS * 1000;
      return {
        ok: false,
        status: 429,
        body: { detail: messages.tooMany(MOCK_LOCKOUT_SECONDS) },
        retryAfter: MOCK_LOCKOUT_SECONDS,
      };
    }
    return { ok: false, status: 400, body: { code: [messages.codeInvalid] } };
  }

  const taken = uniquenessErrors(session.draft);
  if (taken) return { ok: false, status: 400, body: taken };

  const state = wizardState();
  state.otp.delete(body.otp_token as string);
  const statusToken = `st-${crypto.randomUUID()}`;
  state.stores.set(session.draft.subdomain, {
    subdomain: session.draft.subdomain,
    store_name: session.draft.store_name,
    merchant_phone: session.draft.merchant_phone,
    status_token: statusToken,
    polls: 0,
  });
  return { ok: true, data: { status_token: statusToken, status_url: `/register/status/${statusToken}/` } };
}
