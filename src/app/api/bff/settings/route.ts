import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { readSettings } from "@/mocks/settings/state";

/** `GET /api/v1/settings/` — every StoreSetting field of M34 §5, no secrets (`[NEEDS BACKEND]`). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, storeHost }) => mockJson(readSettings(store, storeHost), { delay: 160 }));
}
