import { contextFromRequest, jsonResponse } from "@/lib/bff/upstream";
import { sessionFromRequest, storeHostFor } from "@/features/dashboard-shell/api/session";
import { MOCK_HEADER } from "@/mocks/runtime";

/**
 * `GET /api/v1/auth/me/` → session + features + permissions (M03 §7, `[NEEDS BACKEND]`).
 * 401 when there is no session, which is what makes the shell redirect to the login screen.
 */
export async function GET(request: Request) {
  const upstream = contextFromRequest(request);
  const session = await sessionFromRequest(request, {
    store: upstream.store,
    storeHost: storeHostFor(upstream.store, upstream.storeHost),
  });

  if (!session) {
    return jsonResponse({ detail: "انتهت جلستك، سجّل الدخول مجدداً." }, { status: 401 });
  }
  // The CSRF token is injected server-side into the shell; it never travels to the browser
  // through this endpoint (M47 FR-47.06).
  const safe = { ...session };
  delete safe.csrf_token;
  return jsonResponse(safe, { headers: { [MOCK_HEADER]: "1" } });
}
