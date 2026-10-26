import { env } from "@/env";
import { liveOrMock } from "@/lib/bff/live-route";
import { contextFromRequest, jsonResponse } from "@/lib/bff/upstream";
import { resolveTenant } from "@/lib/tenant";
import { isMocksOn, notAvailable } from "@/mocks/runtime";
import { sharwaPayMock } from "@/mocks/sharwa-pay/router";

/**
 * `/api/bff/sharwa-pay/*` → `/api/v1/sharwa-pay/*` (M40 §7, INT-048).
 *
 * live (`sharwa_pay` in SHARWA_LIVE_MODULES) → `api/views_sharwa_pay.py` on the PUBLIC schema:
 * WhatsApp OTP bound to the Django session that asked for it (3 sends / 10 min per number, 5 wrong
 * codes → 5-min lock, `retry_after` + `Retry-After`), the wallet session is Django's `sessionid`
 * on this origin, CSRF on every write (the client refreshes the token once on a CSRF 403),
 * balances / amounts are server strings, a withdrawal debits at request time and the console's
 * rejection reverses it; top-ups are only credited by the console's approval (INT-031).
 * mock → `src/mocks/sharwa-pay/*` (dev-only `sharwa_mock_pay` marker cookie).
 *
 * FR-40.01: the wallet lives on the PLATFORM origin only — a store origin, a custom domain or the
 * console gets 404 here (and Django answers 404 off the public schema as a second line).
 */
async function mock(request: Request, path: string[]): Promise<Response> {
  if (!isMocksOn()) return notAvailable();
  const res = await sharwaPayMock(request, path);
  res.headers.set("cache-control", "no-store");
  return res;
}

async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const ctx = contextFromRequest(request);
  if (resolveTenant(ctx.host, env.TENANT_BASE_DOMAIN).kind !== "platform") return jsonResponse({ detail: "غير موجود." }, { status: 404 });
  const { path } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  return liveOrMock(request, "sharwa_pay", `/api/v1/sharwa-pay/${joined}/`, () => mock(request, path));
}

export { handle as GET, handle as POST };
