import { env } from "@/env";
import { UpstreamUnavailableError, contextFromRequest, jsonResponse, upstreamFetch } from "@/lib/bff/upstream";
import { provisioningStatusSchema } from "@/lib/schemas/provisioning";
import { provisioningMock } from "@/mocks/public/provisioning";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/**
 * Legacy adapter for `GET /register/status/<token>/` → `{status, store_url?, dashboard_url?}`
 * (M47 §7 "حالة التجهيز" — Ready on the PUBLIC URLConf, so no `X-Store-Domain`).
 * Falls back to the fixture when Django cannot answer for this token.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/public/provisioning/[token]">) {
  const { token } = await params;
  const ctx = contextFromRequest(request);
  const requestUrl = new URL(request.url);
  const fallback = () =>
    isMocksOn()
      ? mockJson(
          provisioningMock(token, {
            store: ctx.store,
            baseDomain: env.TENANT_BASE_DOMAIN,
            port: requestUrl.port || null,
            protocol: ctx.protocol,
          }),
        )
      : notAvailable();

  try {
    const res = await upstreamFetch(request, `/register/status/${encodeURIComponent(token)}/`, ctx, {
      method: "GET",
      omitStoreHeader: true,
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      const parsed = provisioningStatusSchema.safeParse(await res.json());
      if (parsed.success) return jsonResponse(parsed.data);
    }
    // Expired / forged token (400/404) or an HTML response: fall back to the visitor
    // path rather than inventing a state (M47 §8).
    return fallback();
  } catch (err) {
    if (err instanceof UpstreamUnavailableError) return fallback();
    return jsonResponse({ detail: "الخادم غير متاح حالياً." }, { status: 502 });
  }
}
