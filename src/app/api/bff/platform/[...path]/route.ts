import { env } from "@/env";
import { forwardLive } from "@/lib/bff/live-route";
import { contextFromRequest, jsonResponse } from "@/lib/bff/upstream";
import { resolveTenant } from "@/lib/tenant";
import { MOCK_ADMIN_COOKIE, cookieValue, parseAdminRole } from "@/mocks/platform/auth";
import { platformMock } from "@/mocks/platform/router";
import { isMocksOn, isModuleLive, notAvailable } from "@/mocks/runtime";

/**
 * `/api/bff/platform/*` → `/api/v1/platform/*` (M20 §7, M45 §7, M46 §7). ONE catch-all
 * adapter for the whole console: the path after `platform/` is the upstream path verbatim
 * (plus Django's trailing slash), so no screen or hook changes when a row goes live.
 *
 * Live toggle PER ROW GROUP (`SHARWA_LIVE_MODULES`), so the console can go live module by
 * module (Phase 002):
 *   `platform`   — M20 (INT-030): auth/*, overview, stores/**, clients, webhook-events/**,
 *                  and the feature-override family (features catalog + kill switch, resolve,
 *                  feature-overrides list/bulk/delete) → `api/views_platform.py` (Django
 *                  admin session on the public schema).
 *   `platform_money` — M45 (INT-031): dues/** (overview, store detail, 8 actions),
 *                  sharwa-pay/** (top-ups, withdrawals, wallets), sharwa-ship/zones/**.
 *   `platform_billing` — M46 (INT-032): plans/**, plan-features, subscriptions/**,
 *                  billing-settings, apps/**, app-billing-overrides/**, market-categories/**.
 * Every console row now has a Django provider; a row outside these groups is unknown to
 * both backends (the fixture router answers 404 «المسار غير موجود»).
 *
 * FR-20.01 / FR-45.01: answers on the console host (`console.<base>`) only — a store
 * origin, a custom domain or the marketing origin gets 404, never the platform's data
 * (Django refuses it again: its platform views are public-schema only).
 */
const M20_ROWS = /^(auth|overview|stores|clients|webhook-events|features|feature-overrides)(\/|$)/;
const M45_ROWS = /^(dues|sharwa-pay|sharwa-ship)(\/|$)/;
const M46_ROWS = /^(plans|plan-features|subscriptions|billing-settings|apps|app-billing-overrides|market-categories)(\/|$)/;

function liveModuleFor(path: string): string | null {
  if (M20_ROWS.test(path)) return "platform";
  if (M45_ROWS.test(path)) return "platform_money";
  if (M46_ROWS.test(path)) return "platform_billing";
  return null;
}

async function handle(request: Request, { params }: RouteContext<"/api/bff/platform/[...path]">) {
  const ctx = contextFromRequest(request);
  const tenant = resolveTenant(ctx.host, env.TENANT_BASE_DOMAIN);
  if (tenant.kind !== "reserved" || tenant.reservedGroup !== "admin") {
    return jsonResponse({ detail: "غير موجود." }, { status: 404 });
  }
  const { path } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  const liveModule = liveModuleFor(joined);
  if (liveModule && isModuleLive(liveModule)) return forwardLive(request, `/api/v1/platform/${joined}/`);
  if (!isMocksOn()) return notAvailable();
  const role = parseAdminRole(cookieValue(request.headers.get("cookie"), MOCK_ADMIN_COOKIE));
  return platformMock(request, path, role);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
