import { messages } from "@/features/onboarding/onboarding.content";
import {
  MOCK_MAX_SENDS,
  MOCK_REGISTER_TTL_SECONDS,
  MOCK_RESEND_COOLDOWN_SECONDS,
  otpSession,
  type MockResult,
} from "@/mocks/public/register";

/**
 * `POST /api/v1/public/register/resend-otp/` fixture (M02 §7 — `[NEEDS BACKEND]`):
 * `{otp_token}` → `{ttl_seconds}` · 429 + `Retry-After` inside the 30s cooldown or after
 * three sends · 410 for an unknown session.
 */
export function resendOtpMock(body: Record<string, unknown>): MockResult<{ ttl_seconds: number }> {
  const session = otpSession(body.otp_token);
  if (!session) return { ok: false, status: 410, body: { detail: "انتهت صلاحية الطلب، ابدأ من جديد." } };

  const now = Date.now();
  const cooldownLeft = Math.ceil((session.lastSentAt + MOCK_RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000);
  if (session.sends >= MOCK_MAX_SENDS || cooldownLeft > 0) {
    const retryAfter = session.sends >= MOCK_MAX_SENDS ? 600 : cooldownLeft;
    return { ok: false, status: 429, body: { detail: messages.tooMany(retryAfter) }, retryAfter };
  }

  session.sends += 1;
  session.lastSentAt = now;
  session.expiresAt = now + MOCK_REGISTER_TTL_SECONDS * 1000;
  session.attempts = 0;
  return { ok: true, data: { ttl_seconds: MOCK_REGISTER_TTL_SECONDS } };
}
