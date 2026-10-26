import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { bookingsMock } from "@/mocks/bookings/router";

/**
 * `/api/bff/bookings/*` → `/api/v1/bookings/*` (M26 §7 — services, availability, calendar, cancel). One
 * catch-all: the path after `bookings/` is the upstream path verbatim (plus Django's trailing slash).
 *
 *   mock mode → `src/mocks/bookings` behind the merchant/staff session (`mockRoute`; the `bookings`
 *               feature gate 403 comes from the router);
 *   live mode → `bookings` in `SHARWA_LIVE_MODULES` (INT-036): `api/views_bookings.py` answers 401, the plan
 *               feature `bookings` 403, the service 404 and the double cancel 409 itself.
 *
 * No permission key exists for bookings among the 35, so any member who sees the module may use it (§2).
 * The buyer's rows (`/api/bff/catalog/products/<id>/slots`) are Django-first through `storefrontAdapter`.
 */
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  return liveOrMock(request, "bookings", `/api/v1/bookings/${joined ? `${joined}/` : ""}`, () =>
    mockRoute(request, (ctx) => bookingsMock(request, path, ctx)),
  );
}

export { handle as GET, handle as POST, handle as PUT };
