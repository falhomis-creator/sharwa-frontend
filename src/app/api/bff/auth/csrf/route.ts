import { contextFromRequest } from "@/lib/bff/upstream";
import { fetchCsrf } from "@/lib/csrf";
import { MOCK_CSRF_TOKEN } from "@/mocks/dashboard/auth";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/**
 * `GET /api/bff/auth/csrf` → `{csrfToken}` (M03 §7, M47 FR-47.06).
 * Legacy mode: the token is lifted from `Set-Cookie: csrftoken` of `GET /dashboard/login/`
 * and that cookie is forwarded verbatim, so the pair the browser holds matches the token.
 */
export async function GET(request: Request) {
  const ctx = contextFromRequest(request);
  const handshake = await fetchCsrf(ctx.storeHost, request.headers.get("cookie"));

  if (handshake.token) {
    const headers = new Headers({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    for (const cookie of handshake.setCookies) headers.append("set-cookie", cookie);
    return new Response(JSON.stringify({ csrfToken: handshake.token }), { status: 200, headers });
  }

  return isMocksOn() ? mockJson({ csrfToken: MOCK_CSRF_TOKEN }) : notAvailable();
}
