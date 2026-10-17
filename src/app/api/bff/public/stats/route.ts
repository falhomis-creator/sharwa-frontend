import { UpstreamUnavailableError, contextFromRequest, jsonResponse, upstreamFetch } from "@/lib/bff/upstream";
import { statsMock } from "@/mocks/public/stats";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/** `GET /api/v1/public/stats/` — [NEEDS BACKEND]; the landing page degrades silently. */
export async function GET(request: Request) {
  const ctx = contextFromRequest(request);
  try {
    const res = await upstreamFetch(request, "/api/v1/public/stats/", ctx, {
      method: "GET",
      omitStoreHeader: true,
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      return jsonResponse(await res.json(), { status: res.status });
    }
    return isMocksOn() ? mockJson(statsMock()) : notAvailable();
  } catch (err) {
    if (err instanceof UpstreamUnavailableError && isMocksOn()) return mockJson(statsMock());
    return isMocksOn() ? mockJson(statsMock()) : notAvailable();
  }
}
