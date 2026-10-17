import { contextFromRequest, readJson, tryTargetAuth } from "@/lib/bff/auth-adapter";
import { merchantLoginMock, mockSessionCookie } from "@/mocks/dashboard/auth";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/** `POST /api/v1/auth/merchant/login/` `{password}` → 204 + session cookie / 400 (US-03.1). */
export async function POST(request: Request) {
  const ctx = contextFromRequest(request);
  const body = await readJson(request);

  const passed = await tryTargetAuth(request, "merchant/login", ctx, body);
  if (passed) return passed;
  if (!isMocksOn()) return notAvailable();

  const result = merchantLoginMock(body.password);
  if (!result.ok) return mockJson(result.body, { status: result.status, delay: 150 });
  return mockJson(null, {
    status: 204,
    delay: 150,
    headers: { "set-cookie": mockSessionCookie(result.kind) },
  });
}
