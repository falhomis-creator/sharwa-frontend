import { respond, type MockRouteContext } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { cancelSlot, getAvailability, listServices, listSlots, putAvailability } from "@/mocks/bookings/state";

/**
 * The mock server behind `/api/bff/bookings/*` → `/api/v1/bookings/*` (M26 §7, every row
 * `[NEEDS BACKEND]`). The path after `bookings/` is the upstream path verbatim, so the day
 * Django ships the rows the catch-all route becomes a passthrough.
 *
 * Contract note: `slots/` and `services/<id>/availability/` answer an envelope
 * `{timezone, week_start_day, results}` — the store's zone and week start travel with the
 * data until `GET /api/v1/config/` (M34) exposes them to staff (§7 last row).
 */
export async function bookingsMock(request: Request, path: string[], ctx: MockRouteContext): Promise<Response> {
  const segs = path.filter(Boolean);
  const method = request.method;
  const { store } = ctx;
  if (!ctx.session.features.includes("bookings")) return mockJson({ detail: "ميزة الحجوزات غير مفعّلة في خطتك." }, { status: 403 });

  // services/
  if (segs.length === 1 && segs[0] === "services" && method === "GET") return mockJson(listServices(store), { delay: 140 });

  // services/<id>/availability/
  if (segs.length === 3 && segs[0] === "services" && /^\d+$/.test(segs[1]!) && segs[2] === "availability") {
    const id = Number(segs[1]);
    if (method === "GET") {
      const a = getAvailability(store, id);
      return a ? mockJson(a, { delay: 140 }) : mockJson({ detail: "الخدمة غير موجودة أو غير قابلة للحجز." }, { status: 404 });
    }
    if (method === "PUT") {
      let body: unknown = null;
      try {
        body = await request.json();
      } catch {
        body = null;
      }
      return respond(putAvailability(store, id, body));
    }
  }

  // slots/
  if (segs.length === 1 && segs[0] === "slots" && method === "GET") return mockJson(listSlots(store, ctx.url.searchParams), { delay: 160 });

  // slots/<id>/cancel/
  if (segs.length === 3 && segs[0] === "slots" && /^\d+$/.test(segs[1]!) && segs[2] === "cancel" && method === "POST") return respond(cancelSlot(store, Number(segs[1])));

  return mockJson({ detail: "غير موجود." }, { status: 404 });
}
