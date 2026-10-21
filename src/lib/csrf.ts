import "server-only";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";

/**
 * Server-side CSRF acquisition (M47 FR-47.06, M03 §7, contracts/bff-cross-cutting §3).
 *
 * `CSRF_COOKIE_HTTPONLY=True` in Django, so the browser cannot read `csrftoken` — and
 * `document.cookie` is forbidden by the contract. The token is read HERE and handed to the
 * browser as a prop (never as readable JS state), then echoed back as `X-CSRFToken`.
 *
 * Source order:
 *   1. `GET /api/v1/auth/csrf/` → `{csrfToken}` (Django `get_token`): a token derived from
 *      the `csrftoken` cookie the BROWSER already holds (forward its `cookie` header), or a
 *      fresh pair whose `Set-Cookie` must reach the browser — so the two always match;
 *   2. legacy: the `Set-Cookie: csrftoken` of `GET /dashboard/login/` (an older backend).
 *      That page sends no `Set-Cookie` when the browser already has the cookie, which is
 *      why it is only the fallback.
 */
const CSRF_ENDPOINT = "/api/v1/auth/csrf/";
const CSRF_LEGACY_PATH = "/dashboard/login/";

export interface CsrfHandshake {
  token: string | null;
  /** The upstream `Set-Cookie` lines, to be forwarded verbatim so the pair matches. */
  setCookies: string[];
  /** Django answered at all — callers fall back to a mock token only when it did not. */
  reachable: boolean;
}

/** Pull `csrftoken=<value>` out of a `Set-Cookie` line. */
function csrfFrom(setCookies: string[]): string | null {
  for (const line of setCookies) {
    const match = /(?:^|;\s*)csrftoken=([^;]+)/i.exec(line);
    if (match?.[1]) return match[1];
  }
  return null;
}

function upstreamHeaders(storeHost: string | null, cookie: string | null | undefined, accept: string) {
  const headers: Record<string, string> = { accept };
  if (storeHost) {
    headers["x-forwarded-host"] = storeHost;
    headers["x-store-domain"] = storeHost;
    headers.host = storeHost;
  }
  if (cookie) headers.cookie = cookie;
  return headers;
}

async function fromEndpoint(storeHost: string | null, cookie?: string | null): Promise<CsrfHandshake | null> {
  const res = await fetch(`${UPSTREAM_ORIGIN}${CSRF_ENDPOINT}`, {
    headers: upstreamHeaders(storeHost, cookie, "application/json"),
    cache: "no-store",
    redirect: "manual",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { csrfToken?: unknown } | null;
  const token = typeof data?.csrfToken === "string" && data.csrfToken ? data.csrfToken : null;
  return token ? { token, setCookies: res.headers.getSetCookie(), reachable: true } : null;
}

async function fromLegacyPage(storeHost: string | null, cookie?: string | null): Promise<CsrfHandshake> {
  const res = await fetch(`${UPSTREAM_ORIGIN}${CSRF_LEGACY_PATH}`, {
    headers: upstreamHeaders(storeHost, cookie, "text/html"),
    cache: "no-store",
    redirect: "manual",
  });
  const setCookies = res.headers.getSetCookie();
  return { token: csrfFrom(setCookies), setCookies, reachable: true };
}

export async function fetchCsrf(storeHost: string | null, cookie?: string | null): Promise<CsrfHandshake> {
  try {
    return (await fromEndpoint(storeHost, cookie)) ?? (await fromLegacyPage(storeHost, cookie));
  } catch {
    return { token: null, setCookies: [], reachable: false };
  }
}

/**
 * A token for the browser's CURRENT cookie: always pass the request's `cookie` header.
 * Without it Django mints a new pair whose cookie never reaches the browser, and every
 * unsafe request fails with «CSRF token incorrect».
 */
export async function getCsrfToken(storeHost: string | null, cookie?: string | null): Promise<string | null> {
  return (await fetchCsrf(storeHost, cookie)).token;
}
