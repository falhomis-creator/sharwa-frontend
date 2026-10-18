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
 * login (US-02.6).
 */
export function firstEntryUrl(dashboardUrl: string, token: string): string {
  const url = new URL("setup-password", dashboardUrl.endsWith("/") ? dashboardUrl : `${dashboardUrl}/`);
  url.searchParams.set("t", token);
  return url.toString();
}
