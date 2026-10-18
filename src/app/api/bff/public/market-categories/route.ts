import { contextFromRequest, jsonResponse } from "@/lib/bff/upstream";
import { tryTarget } from "@/lib/bff/target-adapter";
import { marketCategoriesSchema } from "@/features/onboarding/schemas";
import { marketCategoriesMock } from "@/mocks/public/market-categories";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/**
 * `GET /api/v1/public/market-categories/` → `[{id, name}]` — [NEEDS BACKEND] (M02 §7).
 * A malformed upstream answer is treated as "unavailable": the wizard hides the field
 * silently rather than breaking (US-02.1.4).
 */
export async function GET(request: Request) {
  const ctx = contextFromRequest(request);
  const res = await tryTarget(request, "/api/v1/public/market-categories/", ctx, { method: "GET" });
  if (res) {
    if (!res.ok) return jsonResponse({ detail: "القطاعات غير متاحة حالياً." }, { status: res.status });
    const parsed = marketCategoriesSchema.safeParse(await res.json().catch(() => null));
    return parsed.success
      ? jsonResponse(parsed.data)
      : jsonResponse({ detail: "استجابة غير متوقعة من الخادم." }, { status: 502 });
  }
  return isMocksOn() ? mockJson(marketCategoriesMock(), { delay: 300 }) : notAvailable();
}
