import { maskPhone, normalizePhone } from "@/lib/format";
import { validateSubdomain } from "@/lib/tenant";
import { messages } from "@/features/onboarding/onboarding.content";
import { NORMALIZED_PHONE_RE, STORE_NAME_MAX, STORE_NAME_MIN } from "@/features/onboarding/schemas";
import { MOCK_OTP_CODE } from "@/mocks/dashboard/auth";
import { MOCK_EXISTING_STORES } from "@/mocks/public/check-subdomain";

/**
 * `POST /api/v1/public/register/` fixture (M02 §7 — `[NEEDS BACKEND]`) and the state the
 * whole mocked wizard shares: OTP sessions, and the stores it has "created".
 *
 * The state hangs off `globalThis`, not module scope: the BFF route handlers and the
 * store-origin Server Components (the tenant probe) are compiled into separate bundles
 * that each get their own copy of this module, but they run in one Node process. A store
 * registered here must be visible to `tenantFixture()` or the redirect after `ready`
 * lands on the 404 guard.
 *
 * The OTP code is the project's single documented local code (`MOCK_OTP_CODE`).
 */
export const MOCK_REGISTER_TTL_SECONDS = 300;
export const MOCK_RESEND_COOLDOWN_SECONDS = 30;
export const MOCK_MAX_SENDS = 3;
export const MOCK_MAX_ATTEMPTS = 5;
export const MOCK_LOCKOUT_SECONDS = 60;

/** A number that "already owns a store" — exercises the edge case in M02 §8. */
export const MOCK_TAKEN_PHONE = "967770000011";

export interface MockDraft {
  store_name: string;
  merchant_phone: string;
  subdomain: string;
  interested_categories: number[];
}

interface OtpSession {
  draft: MockDraft;
  expiresAt: number;
  lastSentAt: number;
  sends: number;
  attempts: number;
  lockedUntil: number;
}

export interface RegisteredStore {
  subdomain: string;
  store_name: string;
  merchant_phone: string;
  status_token: string;
  /** Status polls served so far; drives pending → provisioning → ready. */
  polls: number;
}

interface WizardState {
  otp: Map<string, OtpSession>;
  stores: Map<string, RegisteredStore>;
}

const KEY = Symbol.for("sharwa.mock.onboarding");

export function wizardState(): WizardState {
  const g = globalThis as typeof globalThis & { [KEY]?: WizardState };
  g[KEY] ??= { otp: new Map(), stores: new Map() };
  return g[KEY];
}

export function registeredStore(subdomain: string | null): RegisteredStore | undefined {
  return subdomain ? wizardState().stores.get(subdomain) : undefined;
}

export function registeredStoreByToken(token: string): RegisteredStore | undefined {
  for (const store of wizardState().stores.values()) if (store.status_token === token) return store;
  return undefined;
}

/** Statuses after n polls: two per stage (T063). */
export function registeredStatus(polls: number): "pending" | "provisioning" | "ready" {
  if (polls <= 2) return "pending";
  if (polls <= 4) return "provisioning";
  return "ready";
}

function isSubdomainTaken(sub: string): boolean {
  return (MOCK_EXISTING_STORES as readonly string[]).includes(sub) || wizardState().stores.has(sub);
}

function isPhoneTaken(phone: string): boolean {
  if (phone === MOCK_TAKEN_PHONE) return true;
  for (const store of wizardState().stores.values()) if (store.merchant_phone === phone) return true;
  return false;
}

/** Field errors the server would return, or `null`. Used at register AND at verify (US-02.3.4). */
export function uniquenessErrors(draft: Pick<MockDraft, "merchant_phone" | "subdomain">): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};
  if (isPhoneTaken(draft.merchant_phone)) errors.merchant_phone = [messages.phoneTaken];
  if (isSubdomainTaken(draft.subdomain)) errors.subdomain = ["مستخدم بالفعل"];
  return Object.keys(errors).length ? errors : null;
}

export type MockResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; body: Record<string, unknown>; retryAfter?: number };

export function registerMock(body: Record<string, unknown>): MockResult<{
  otp_token: string;
  ttl_seconds: number;
  masked_phone: string;
}> {
  const errors: Record<string, string[]> = {};
  const storeName = typeof body.store_name === "string" ? body.store_name.trim() : "";
  const phone = typeof body.merchant_phone === "string" ? normalizePhone(body.merchant_phone) : "";
  const subdomain = typeof body.subdomain === "string" ? body.subdomain : "";
  const categories = Array.isArray(body.interested_categories)
    ? body.interested_categories.filter((v): v is number => typeof v === "number")
    : [];

  if (storeName.length < STORE_NAME_MIN || storeName.length > STORE_NAME_MAX) {
    errors.store_name = [messages.storeNameLength];
  }
  if (!NORMALIZED_PHONE_RE.test(phone)) errors.merchant_phone = [messages.phoneInvalid];
  const sub = validateSubdomain(subdomain);
  if (!sub.ok) errors.subdomain = [sub.reason];
  if (body.agree_terms !== true) errors.agree_terms = [messages.agreeTerms];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };

  const draft: MockDraft = { store_name: storeName, merchant_phone: phone, subdomain, interested_categories: categories };
  const taken = uniquenessErrors(draft);
  if (taken) return { ok: false, status: 400, body: taken };

  const now = Date.now();
  const otpToken = `otp-${crypto.randomUUID()}`;
  wizardState().otp.set(otpToken, {
    draft,
    expiresAt: now + MOCK_REGISTER_TTL_SECONDS * 1000,
    lastSentAt: now,
    sends: 1,
    attempts: 0,
    lockedUntil: 0,
  });
  return {
    ok: true,
    data: { otp_token: otpToken, ttl_seconds: MOCK_REGISTER_TTL_SECONDS, masked_phone: maskPhone(phone) },
  };
}

export function otpSession(token: unknown): OtpSession | undefined {
  return typeof token === "string" ? wizardState().otp.get(token) : undefined;
}

export { MOCK_OTP_CODE };
