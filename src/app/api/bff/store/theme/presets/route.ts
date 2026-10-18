import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listPresets } from "@/mocks/design/state";

/**
 * `GET /api/v1/store/theme/presets/` (M08 §7 — `[NEEDS BACKEND]`) → the 9 presets with their
 * real tokens, served from the verbatim copy of `products/theme_presets.py` in `presets.ts`.
 */
export async function GET(request: Request) {
  return mockRoute(request, () => mockJson(listPresets(), { delay: 120 }));
}
