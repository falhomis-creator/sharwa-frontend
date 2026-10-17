import { UpstreamUnavailableError, contextFromRequest, jsonResponse, upstreamFetch } from "@/lib/bff/upstream";
import { checkSubdomainMock } from "@/mocks/public/check-subdomain";
import { isMocksOn, mockJson } from "@/mocks/runtime";

/**
 * Legacy adapter for `GET /register/check-subdomain/?subdomain=` → `{available, reason}`.
 * Lives on the PUBLIC Django URLConf, so no `X-Store-Domain` is sent.
 */
export async function GET(request: Request) {
  const sub = (new URL(request.url).searchParams.get("subdomain") ?? "").trim().toLowerCase();
  const ctx = contextFromRequest(request);
  try {
    const res = await upstreamFetch(request, `/register/check-subdomain/?subdomain=${encodeURIComponent(sub)}`, ctx, {
      method: "GET",
      omitStoreHeader: true,
    });
    if (res.headers.get("content-type")?.includes("application/json")) {
      const data = (await res.json()) as { available?: boolean; reason?: string };
      return jsonResponse({ available: Boolean(data.available), reason: data.reason ?? "" }, { status: res.status });
    }
    return jsonResponse({ detail: "استجابة غير متوقعة من الخادم." }, { status: 502 });
  } catch (err) {
    if (err instanceof UpstreamUnavailableError && isMocksOn()) {
      return mockJson(checkSubdomainMock(sub), { delay: 150 });
    }
    return jsonResponse({ detail: "الخادم غير متاح حالياً." }, { status: 502 });
  }
}
