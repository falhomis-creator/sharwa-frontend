import { contextFromRequest, jsonResponse } from "@/lib/bff/upstream";
import { resolveSessionWithSource, storeHostFor } from "@/features/dashboard-shell/api/session";
import { MOCK_HEADER } from "@/mocks/runtime";

/**
 * `GET /api/v1/auth/me/` → session + features + permissions (M03 §7; Django `MeView`).
 * 401 when there is no session, which is what makes the shell redirect to the login screen.
 * Only a fixture session carries `x-sharwa-mock: 1` (INT-003: a live session no longer lights
 * the dev «بيانات تجريبية» strip).
 */
export async function GET(request: Request) {
  const upstream = contextFromRequest(request);
  const { session, isMock } = await resolveSessionWithSource(
    { store: upstream.store, storeHost: storeHostFor(upstream.store, upstream.storeHost) },
    request.headers.get("cookie"),
  );

  if (!session) {
    return jsonResponse({ detail: "انتهت جلستك، سجّل الدخول مجدداً." }, { status: 401 });
  }
  // The CSRF token is injected server-side into the shell; it never travels to the browser
  // through this endpoint (M47 FR-47.06).
  const safe = { ...session };
  delete safe.csrf_token;
  return jsonResponse(safe, isMock ? { headers: { [MOCK_HEADER]: "1" } } : {});
}
