import { contextFromRequest, readJson, tryTargetAuth } from "@/lib/bff/auth-adapter";
import { mockSessionCookie, staffLoginMock } from "@/mocks/dashboard/auth";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/** `POST /api/v1/auth/staff/login/` `{phone, password}` → 204 / 400 / 403 inactive (US-03.1.2). */
export async function POST(request: Request) {
  const ctx = contextFromRequest(request);
  const body = await readJson(request);

  const passed = await tryTargetAuth(request, "staff/login", ctx, body);
  if (passed) return passed;
  if (!isMocksOn()) return notAvailable();

  const result = staffLoginMock(body.phone, body.password);
  if (!result.ok) return mockJson(result.body, { status: result.status, delay: 150 });
  return mockJson(null, {
    status: 204,
    delay: 150,
    headers: { "set-cookie": mockSessionCookie(result.kind) },
  });
}
