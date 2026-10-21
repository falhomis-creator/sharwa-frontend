import { contextFromRequest, readJson, tryTargetAuth } from "@/lib/bff/auth-adapter";
import { mockSessionCookie } from "@/mocks/dashboard/auth";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/**
 * `POST /api/v1/auth/merchant/setup-password/` `{password, password_confirm, setup_token}`
 * → 204 + session / 400 fields / 403 `setup_token_invalid` / 409 `already_set`.
 * The first entry after provisioning (discovery 01 §6 step 11 → M03 FR-03.07). Shipped in
 * Django (`api/views_auth.py`); `setup_token` is the signed proof from the `ready` status
 * (decision 2026-10-21), so a new store never opens for whoever reaches it first.
 */
export async function POST(request: Request) {
  const ctx = contextFromRequest(request);
  const body = await readJson(request);

  const passed = await tryTargetAuth(request, "merchant/setup-password", ctx, body);
  if (passed) return passed;
  if (!isMocksOn()) return notAvailable();

  if (typeof body.setup_token !== "string" || body.setup_token.length === 0) {
    return mockJson(
      {
        detail: "رابط تفعيل المتجر غير صالح أو منتهٍ. افتح الرابط من صفحة تجهيز المتجر، أو فعّل المتجر برمز واتساب من لوحة التحكم.",
        code: "setup_token_invalid",
      },
      { status: 403 },
    );
  }
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
