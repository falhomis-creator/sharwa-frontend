import { normalizePhone } from "@/lib/format";
import { MOCK_OTP_CODE } from "@/mocks/dashboard/auth";
import { storeState } from "@/mocks/store-state";

/**
 * WhatsApp OTP for buyers (no accounts — phone + OTP, M12 FR-12.06; M10 assumptions).
 * One state per store × phone × purpose. The fixture code is the single documented
 * `MOCK_OTP_CODE`. Resend is allowed after 60 s (429 with `Retry-After` before), five wrong
 * codes lock the purpose for the session.
 */
export const OTP_PURPOSES = ["cod", "wallet", "sharwa_pay", "loyalty", "review", "auction", "wishlist", "back_in_stock"] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

interface OtpEntry {
  sentAt: number;
  verified: boolean;
  wrong: number;
}

const RESEND_SECONDS = 60;
export const PHONE_RE = /^(967|966)\d{9}$/;

function entries(store: string | null): Map<string, OtpEntry> {
  return storeState(store, "storefront:otp", () => new Map<string, OtpEntry>());
}

const key = (phone: string, purpose: OtpPurpose) => `${purpose}:${phone}`;

export type OtpResult =
  | { ok: true; phone: string }
  | { ok: false; status: number; body: Record<string, unknown>; retryAfter?: number };

export function normalizeBuyerPhone(raw: unknown): string | null {
  const phone = normalizePhone(String(raw ?? ""));
  return PHONE_RE.test(phone) ? phone : null;
}

export function sendOtp(store: string | null, rawPhone: unknown, purpose: OtpPurpose): OtpResult {
  const phone = normalizeBuyerPhone(rawPhone);
  if (!phone) return { ok: false, status: 400, body: { phone: ["رقم واتساب غير صحيح."] } };
  const map = entries(store);
  const prev = map.get(key(phone, purpose));
  if (prev) {
    const wait = RESEND_SECONDS - Math.floor((Date.now() - prev.sentAt) / 1000);
    if (wait > 0 && !prev.verified) {
      return { ok: false, status: 429, body: { detail: `حاول بعد ${wait} ثانية.` }, retryAfter: wait };
    }
  }
  map.set(key(phone, purpose), { sentAt: Date.now(), verified: false, wrong: 0 });
  return { ok: true, phone };
}

/** Verify a code; a verified purpose stays verified for the rest of the session. */
export function verifyOtp(store: string | null, rawPhone: unknown, code: unknown, purpose: OtpPurpose, field = "otp"): OtpResult {
  const phone = normalizeBuyerPhone(rawPhone);
  if (!phone) return { ok: false, status: 400, body: { phone: ["رقم واتساب غير صحيح."] } };
  const entry = entries(store).get(key(phone, purpose));
  if (entry?.verified) return { ok: true, phone };
  if (!entry) return { ok: false, status: 400, body: { [field]: ["اطلب رمز التأكيد أولاً."] } };
  if (entry.wrong >= 5) return { ok: false, status: 429, body: { detail: "محاولات كثيرة، اطلب رمزاً جديداً بعد قليل." } };
  if (String(code ?? "").trim() !== MOCK_OTP_CODE) {
    entry.wrong += 1;
    return { ok: false, status: 400, body: { [field]: ["الرمز غير صحيح."] } };
  }
  entry.verified = true;
  return { ok: true, phone };
}

export function isVerified(store: string | null, phone: string, purpose: OtpPurpose): boolean {
  return entries(store).get(key(phone, purpose))?.verified === true;
}
