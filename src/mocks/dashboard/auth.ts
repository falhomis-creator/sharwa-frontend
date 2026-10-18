import { maskPhone } from "@/lib/format";

/**
 * Dashboard auth fixtures (M03 §7 — all seven auth rows are `[NEEDS BACKEND]`).
 *
 * A dev-only session marker stands in for Django's `sessionid` while the real
 * `/api/v1/auth/*` endpoints do not exist: the login adapters set it, `getSession()`
 * reads it, logout clears it. It only ever exists while `SHARWA_MOCKS=on`; with mocks
 * off the real Django session cookie is the only thing consulted.
 *
 * The fixture credentials below are the project's own local test values — the ONLY
 * password that opens the mocked dashboard on localhost. They are recorded here (and in
 * `docs/` via quickstart) rather than being invented per session.
 */
export const MOCK_SESSION_COOKIE = "sharwa_mock_session";
export const MOCK_CSRF_TOKEN = "mock-csrf-token-for-local-dev";

export const MOCK_MERCHANT_PASSWORD = "sharwa-local-demo";
export const MOCK_STAFF_PHONE = "967770000001";
/** «مدير المتجر» fixture (decision 2026-10-19): منى القحطاني (staff #4 in the M18/M22 seeds). */
export const MOCK_MANAGER_PHONE = "967770000004";
export const MOCK_STAFF_INACTIVE_PHONE = "967770000009";
export const MOCK_OTP_CODE = "123456";
export const MOCK_OTP_TOKEN = "otp-local-demo";

/** `manager` is a staff session too (`kind: "staff"`); only the fixture behind it differs. */
export type MockSessionKind = "merchant" | "staff" | "manager";

export function mockSessionCookie(kind: MockSessionKind): string {
  return `${MOCK_SESSION_COOKIE}=${kind}; Path=/; HttpOnly; SameSite=Lax`;
}

export function clearedMockSessionCookie(): string {
  return `${MOCK_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export function parseMockSessionKind(value: string | undefined | null): MockSessionKind | null {
  return value === "merchant" || value === "staff" || value === "manager" ? value : null;
}

export type MockAuthResult =
  | { ok: true; kind: MockSessionKind }
  | { ok: false; status: number; body: Record<string, unknown> };

export function merchantLoginMock(password: unknown): MockAuthResult {
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, status: 400, body: { password: ["أدخل كلمة المرور."] } };
  }
  if (password !== MOCK_MERCHANT_PASSWORD) {
    return { ok: false, status: 400, body: { detail: "كلمة المرور غير صحيحة." } };
  }
  return { ok: true, kind: "merchant" };
}

export function staffLoginMock(phone: unknown, password: unknown): MockAuthResult {
  const normalized = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
  if (!normalized) return { ok: false, status: 400, body: { phone: ["أدخل رقم الهاتف."] } };
  if (normalized === MOCK_STAFF_INACTIVE_PHONE) {
    return { ok: false, status: 403, body: { detail: "هذا الحساب غير مفعّل، تواصل مع مدير المتجر." } };
  }
  const known = normalized === MOCK_STAFF_PHONE || normalized === MOCK_MANAGER_PHONE;
  if (!known || password !== MOCK_MERCHANT_PASSWORD) {
    return { ok: false, status: 400, body: { detail: "رقم الهاتف أو كلمة المرور غير صحيحة." } };
  }
  return { ok: true, kind: normalized === MOCK_MANAGER_PHONE ? "manager" : "staff" };
}

export function forgotPasswordMock(storePhone = "967770000011") {
  return { otp_token: MOCK_OTP_TOKEN, ttl_seconds: 300, masked_phone: maskPhone(storePhone) };
}

export function resetPasswordMock(otpToken: unknown, code: unknown, password: unknown): MockAuthResult {
  if (otpToken !== MOCK_OTP_TOKEN) {
    return { ok: false, status: 400, body: { detail: "انتهت صلاحية الرمز، اطلب رمزاً جديداً." } };
  }
  if (code !== MOCK_OTP_CODE) {
    return { ok: false, status: 400, body: { code: ["الرمز غير صحيح."] } };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, status: 400, body: { password: ["كلمة المرور 8 أحرف على الأقل."] } };
  }
  return { ok: true, kind: "merchant" };
}
