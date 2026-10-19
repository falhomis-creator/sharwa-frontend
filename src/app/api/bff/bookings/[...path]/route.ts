import { mockRoute } from "@/lib/bff/mock-route";
import { bookingsMock } from "@/mocks/bookings/router";

/**
 * `/api/bff/bookings/*` → `/api/v1/bookings/*` (M26 §7 — services, availability, calendar,
 * cancel; all `[NEEDS BACKEND]`). One catch-all: the session gate (401) comes from
 * `mockRoute`, the `bookings` feature gate (403) from the router. No permission key exists
 * for bookings among the 35, so any member who sees the module may use it (§2).
 */
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return mockRoute(request, (ctx) => bookingsMock(request, path, ctx));
}

export { handle as GET, handle as POST, handle as PUT };
