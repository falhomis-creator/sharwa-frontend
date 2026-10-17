import { contextFromRequest, readJson, tryTargetAuth } from "@/lib/bff/auth-adapter";
import { clearedMockSessionCookie } from "@/mocks/dashboard/auth";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/** `POST /api/v1/auth/logout/` → 204. Clears the local session marker either way. */
export async function POST(request: Request) {
  const ctx = contextFromRequest(request);
  const passed = await tryTargetAuth(request, "logout", ctx, await readJson(request));
  if (passed) {
    const headers = new Headers(passed.headers);
    headers.append("set-cookie", clearedMockSessionCookie());
    return new Response(null, { status: passed.status === 200 ? 204 : passed.status, headers });
  }
  if (!isMocksOn()) return notAvailable();
  return mockJson(null, { status: 204, headers: { "set-cookie": clearedMockSessionCookie() } });
}
