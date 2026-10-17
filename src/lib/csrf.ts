import "server-only";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";

/**
 * Server-side CSRF acquisition (M47 FR-47.06, M03 §7, contracts/bff-cross-cutting §3).
 *
 * `CSRF_COOKIE_HTTPONLY=True` in Django, so the browser cannot read `csrftoken` — and
 * `document.cookie` is forbidden by the contract. Until `GET /api/v1/auth/csrf/` ships,
 * the token is read HERE from the `Set-Cookie` of a GET to the login page, handed to the
 * browser as a prop (never as readable JS state) and echoed back as `X-CSRFToken`.
 */
const CSRF_SOURCE_PATH = "/dashboard/login/";

export interface CsrfHandshake {
  token: string | null;
  /** The upstream `Set-Cookie` lines, to be forwarded verbatim so the pair matches. */
  setCookies: string[];
}

/** Pull `csrftoken=<value>` out of a `Set-Cookie` line. */
function csrfFrom(setCookies: string[]): string | null {
  for (const line of setCookies) {
    const match = /(?:^|;\s*)csrftoken=([^;]+)/i.exec(line);
    if (match?.[1]) return match[1];
  }
  return null;
}

export async function fetchCsrf(storeHost: string | null, cookie?: string | null): Promise<CsrfHandshake> {
  const headers: Record<string, string> = { accept: "text/html" };
  if (storeHost) {
    headers["x-forwarded-host"] = storeHost;
    headers.host = storeHost;
  }
  if (cookie) headers.cookie = cookie;

  try {
    const res = await fetch(`${UPSTREAM_ORIGIN}${CSRF_SOURCE_PATH}`, {
      headers,
      cache: "no-store",
      redirect: "manual",
    });
    const setCookies = res.headers.getSetCookie();
    return { token: csrfFrom(setCookies), setCookies };
  } catch {
    return { token: null, setCookies: [] };
  }
}

export async function getCsrfToken(storeHost: string | null, cookie?: string | null): Promise<string | null> {
  return (await fetchCsrf(storeHost, cookie)).token;
}
