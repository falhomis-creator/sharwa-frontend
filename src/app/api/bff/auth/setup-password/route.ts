import { contextFromRequest, readJson, tryTargetAuth } from "@/lib/bff/auth-adapter";
import { mockSessionCookie } from "@/mocks/dashboard/auth";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/**
 * `POST /api/v1/auth/merchant/setup-password/` `{password, password_confirm}` → 204.
 * The first entry after provisioning (discovery 01 §6 step 11 → M03 FR-03.07).
 */
export async function POST(request: Request) {
  const ctx = contextFromRequest(request);
  const body = await readJson(request);

  const passed = await tryTargetAuth(request, "merchant/setup-password", ctx, body);
  if (passed) return passed;
  if (!isMocksOn()) return notAvailable();

  const password = body.password;
  if (typeof password !== "string" || password.length < 8) {
    return mockJson({ password: ["كلمة المرور 8 أحرف على الأقل."] }, { status: 400 });
  }
  if (password !== body.password_confirm) {
    return mockJson({ password_confirm: ["كلمتا المرور غير متطابقتين."] }, { status: 400 });
  }
  return mockJson(null, {
    status: 204,
    delay: 150,
    headers: { "set-cookie": mockSessionCookie("merchant") },
  });
}
