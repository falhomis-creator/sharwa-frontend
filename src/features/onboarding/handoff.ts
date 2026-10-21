/**
 * How the status token travels after OTP (M02 FR-02.09/10, M47 US-47.3.2). Isomorphic.
 *
 * - `sharwa_prov`: short-lived HttpOnly cookie on the PLATFORM host only (no `Domain`
 *   attribute, so no store subdomain ever sees it). Set by the verify-otp adapter, cleared
 *   by the status adapter on `ready`. `/register` reads it to offer "resume" instead of a
 *   second registration.
 * - `localStorage[STATUS_STORAGE_KEY]`: the one key FR-02.09 allows, so a reopened status
 *   link still knows the store name and the masked number. Removed on `ready`.
 * - The store origin receives the token exactly once, as `?t=` on the redirect, and keeps
 *   it in sessionStorage (M47).
 * - The first-password proof (`setup_token` from the `ready` status) rides the same
 *   redirect as `?setup=`; the setup-password screen posts it back to Django.
 */
export const PROV_COOKIE = "sharwa_prov";
export const PROV_COOKIE_MAX_AGE = 30 * 60;
export const STATUS_STORAGE_KEY = "sharwa.onboarding.status";

export function provCookie(token: string, secure: boolean): string {
  return `${PROV_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${PROV_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearedProvCookie(): string {
  return `${PROV_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

/**
 * A status token as it arrives in a URL or cookie → its real value.
 *
 * Next.js hands dynamic route params over still percent-encoded (the customer routes
 * decode `[phone]` for the same reason). Django's signed tokens carry `:` separators, so
 * an undecoded `%3A` that is encoded again reaches Django as `%253A` and fails the
 * signature check (400 → «لم نجد طلب التأسيس هذا»). Real tokens — Django's signed
 * base64url + `:`, or the fixture's `st-…` — never contain `%`, so decoding until no
 * escape is left is safe and makes every entry point idempotent.
 */
export function decodeStatusToken(raw: string): string {
  let value = raw;
  for (let i = 0; i < 3 && /%[0-9A-Fa-f]{2}/.test(value); i++) {
    try {
      value = decodeURIComponent(value);
    } catch {
      break;
    }
  }
  return value;
}

/** Django's signed status tokens (`signing.dumps`) always contain `:`; fixture tokens never do. */
export function isSignedStatusToken(token: string): boolean {
  return token.includes(":");
}

export interface StoredStatus {
  token: string;
  store_name?: string;
  masked_phone?: string;
}

export function readStoredStatus(): StoredStatus | null {
  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredStatus>;
    return typeof value.token === "string" ? (value as StoredStatus) : null;
  } catch {
    return null; // private mode / storage blocked: the page still polls from the path token
  }
}

export function writeStoredStatus(value: StoredStatus) {
  try {
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // nothing to do: the status URL alone is enough to resume
  }
}

export function clearStoredStatus() {
  try {
    localStorage.removeItem(STATUS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Where `ready` sends a new merchant: the store's first-entry screen with the token once.
 * A brand-new store has no password, so the bare `dashboard_url` would only bounce to
 * login (US-02.6). `setupToken` is the server's proof for that screen (may be absent from
 * an older backend; the screen then explains how to continue).
 */
export function firstEntryUrl(dashboardUrl: string, token: string, setupToken?: string): string {
  const url = new URL("setup-password", dashboardUrl.endsWith("/") ? dashboardUrl : `${dashboardUrl}/`);
  url.searchParams.set("t", token);
  if (setupToken) url.searchParams.set("setup", setupToken);
  return url.toString();
}
