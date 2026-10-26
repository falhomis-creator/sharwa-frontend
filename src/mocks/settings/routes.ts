import "server-only";
import { liveOrMock } from "@/lib/bff/live-route";
import { canManageCatalog, mockRoute, readBody, respond, type MockResult } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import type { StoreSettings } from "@/features/settings/schemas";

/**
 * One handler factory for the eight `PATCH /api/v1/settings/<section>/` rows (M34 §7) and
 * `POST settings/multi-location/`. Live (INT-010) when `settings` is in `SHARWA_LIVE_MODULES`:
 * a transparent passthrough to `upstream` on Django (`api/views_settings.py`), which applies
 * the same owner/manager and plan-feature rules itself.
 * Money and structure (shipping, currency, payments, multi-location) are owner-only;
 * the text sections also accept the «مدير المتجر/الفرع» system roles (M34 §2, §10).
 */
export function settingsWrite(
  upstream: string,
  ownerOnly: boolean,
  apply: (store: string | null, host: string, body: Record<string, unknown>) => MockResult<StoreSettings>,
) {
  return (request: Request) =>
    liveOrMock(request, "settings", upstream, () =>
      mockRoute(request, async ({ store, storeHost, session }) => {
        const allowed = ownerOnly ? session.kind === "merchant" : canManageCatalog(session);
        if (!allowed) {
          return mockJson(
            { detail: ownerOnly ? "هذا الإعداد يحتاج صلاحية مالك المتجر." : "تعديل الإعدادات مقصور على المالك ومدير المتجر." },
            { status: 403 },
          );
        }
        return respond(apply(store, storeHost, await readBody(request)), { delay: 260 });
      }),
    );
}
