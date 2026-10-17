import { UpstreamUnavailableError, contextFromRequest, jsonResponse, upstreamFetch } from "@/lib/bff/upstream";
import { plansMock } from "@/mocks/public/plans";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/**
 * `GET /api/v1/public/plans/` — [NEEDS BACKEND]. Public URLConf, so no
 * `X-Store-Domain`. Falls back to the mock while the endpoint does not exist.
 */
export async function GET(request: Request) {
  const ctx = contextFromRequest(request);
  try {
    const res = await upstreamFetch(request, "/api/v1/public/plans/", ctx, {
      method: "GET",
      omitStoreHeader: true,
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      return jsonResponse(await res.json(), { status: res.status });
    }
    return isMocksOn() ? mockJson(plansMock()) : notAvailable();
  } catch (err) {
    if (err instanceof UpstreamUnavailableError && isMocksOn()) return mockJson(plansMock());
    return isMocksOn() ? mockJson(plansMock()) : notAvailable();
  }
}
