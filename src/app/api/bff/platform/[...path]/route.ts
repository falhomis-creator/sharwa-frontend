import { env } from "@/env";
import { contextFromRequest, jsonResponse } from "@/lib/bff/upstream";
import { resolveTenant } from "@/lib/tenant";
import { MOCK_ADMIN_COOKIE, cookieValue, parseAdminRole } from "@/mocks/platform/auth";
import { platformMock } from "@/mocks/platform/router";
import { isMocksOn, notAvailable } from "@/mocks/runtime";

/**
 * `/api/bff/platform/*` → `/api/v1/platform/*` (M20 §7, M45 §7, M46 §7 — every row
 * `[NEEDS BACKEND]`). ONE catch-all adapter for the whole console: the path after
 * `platform/` is the upstream path verbatim, so the day Django ships the rows this
 * handler becomes a passthrough and no screen changes.
 *
 * FR-20.01 / FR-45.01: answers on the console host (`console.<base>`) only — a store
 * origin, a custom domain or the marketing origin gets 404, never the platform's data.
 */
async function handle(request: Request, { params }: RouteContext<"/api/bff/platform/[...path]">) {
  const ctx = contextFromRequest(request);
  const tenant = resolveTenant(ctx.host, env.TENANT_BASE_DOMAIN);
  if (tenant.kind !== "reserved" || tenant.reservedGroup !== "admin") {
    return jsonResponse({ detail: "غير موجود." }, { status: 404 });
  }
  if (!isMocksOn()) return notAvailable();
  const { path } = await params;
  const role = parseAdminRole(cookieValue(request.headers.get("cookie"), MOCK_ADMIN_COOKIE));
  return platformMock(request, path, role);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
