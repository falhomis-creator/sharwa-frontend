import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { readSettings } from "@/mocks/settings/state";

/** `GET /api/v1/settings/` — every StoreSetting field of M34 §5, no secrets. Live: INT-010 (`api/views_settings.py`). */
export async function GET(request: Request) {
  return liveOrMock(request, "settings", "/api/v1/settings/", () =>
    mockRoute(request, ({ store, storeHost }) => mockJson(readSettings(store, storeHost), { delay: 160 })),
  );
}
