import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { readSettings, patchAnnouncement } from "@/mocks/settings/state";
import type { StoreSettings } from "@/features/settings/schemas";

/**
 * `GET/PATCH /api/v1/store/announcement/` (M08 §7 — Django `api/views_design.py` since
 * INT-018, module `design`). Same row and validation as M34's `settings/announcement`, so the
 * bar edited here and in «الإعدادات» is one value; answers the nine announcement fields.
 */
const KEYS = [
  "enable_announcement_bar",
  "announcement_text",
  "announcement_bg_color",
  "announcement_text_color",
  "announcement_scroll_speed",
  "show_banner_on_home",
  "show_banner_on_products",
  "show_banner_on_product_detail",
  "show_banner_on_checkout",
] as const;

function pick(s: StoreSettings) {
  return Object.fromEntries(KEYS.map((k) => [k, s[k]]));
}

const OWNER_ONLY = "تصميم المتجر مقصور على مالك المتجر.";

export async function GET(request: Request) {
  return liveOrMock(request, "design", "/api/v1/store/announcement/", () =>
    mockRoute(request, ({ store, storeHost, session }) =>
      session.kind !== "merchant" ? mockJson({ detail: OWNER_ONLY }, { status: 403 }) : mockJson(pick(readSettings(store, storeHost)), { delay: 140 }),
    ),
  );
}

export async function PATCH(request: Request) {
  return liveOrMock(request, "design", "/api/v1/store/announcement/", () =>
    mockRoute(request, async ({ store, storeHost, session }) => {
      if (session.kind !== "merchant") return mockJson({ detail: OWNER_ONLY }, { status: 403 });
      const result = patchAnnouncement(store, storeHost, await readBody(request));
      return respond(result.ok ? { ok: true, data: pick(result.data) } : result, { delay: 220 });
    }),
  );
}
