import { env } from "@/env";
import { UpstreamUnavailableError, contextFromRequest, jsonResponse, upstreamFetch } from "@/lib/bff/upstream";
import { provisioningStatusSchema, type ProvisioningStatus } from "@/lib/schemas/provisioning";
import { PROV_COOKIE, clearedProvCookie } from "@/features/onboarding/handoff";
import { provisioningMock } from "@/mocks/public/provisioning";
import { isMocksOn, mockJson } from "@/mocks/runtime";

/**
 * Legacy adapter for `GET /register/status/<token>/` → `{status, store_url?, dashboard_url?}`
 * (M47 §7 / M02 §7 "حالة التجهيز" — Ready on the PUBLIC URLConf, so no `X-Store-Domain`).
 * Falls back to the fixture when Django cannot answer for this token.
 *
 * An unknown or expired token is a 404 `{detail}` — the onboarding wait page turns that
 * into «لم نجد طلب التأسيس هذا» (M02 §8). On `ready`, the platform's `sharwa_prov` cookie
 * for this token is cleared: its job (resume from `/register`) is done.
 */
const NOT_FOUND = { detail: "لم نجد طلب التأسيس هذا." };

function hasProvCookie(request: Request, token: string): boolean {
  const header = request.headers.get("cookie") ?? "";
  return header.split(";").some((part) => part.trim() === `${PROV_COOKIE}=${encodeURIComponent(token)}`);
}

export async function GET(request: Request, { params }: RouteContext<"/api/bff/public/provisioning/[token]">) {
  const { token } = await params;
  const ctx = contextFromRequest(request);
  const requestUrl = new URL(request.url);

  const finish = (status: ProvisioningStatus, isMock: boolean) => {
    const headers: Record<string, string> =
      status.status === "ready" && hasProvCookie(request, token) ? { "set-cookie": clearedProvCookie() } : {};
    return isMock ? mockJson(status, { headers }) : jsonResponse(status, { headers });
  };

  const fallback = () => {
    if (!isMocksOn()) return jsonResponse(NOT_FOUND, { status: 404 });
    const status = provisioningMock(token, {
      store: ctx.store,
      baseDomain: env.TENANT_BASE_DOMAIN,
      port: requestUrl.port || null,
      protocol: ctx.protocol,
    });
    return status ? finish(status, true) : mockJson(NOT_FOUND, { status: 404 });
  };

  try {
    const res = await upstreamFetch(request, `/register/status/${encodeURIComponent(token)}/`, ctx, {
      method: "GET",
      omitStoreHeader: true,
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      const parsed = provisioningStatusSchema.safeParse(await res.json());
      if (parsed.success) return finish(parsed.data, false);
    }
    // Expired / forged token (400/404) or an HTML response: the fixture answers while
    // mocks are on (Django has no row for fixture tokens); otherwise it is a 404.
    return fallback();
  } catch (err) {
    if (err instanceof UpstreamUnavailableError) {
      return isMocksOn() ? fallback() : jsonResponse({ detail: "الخادم غير متاح حالياً." }, { status: 502 });
    }
    return jsonResponse({ detail: "الخادم غير متاح حالياً." }, { status: 502 });
  }
}
