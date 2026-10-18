import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { reorderPickups } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `POST /api/v1/shipping/pickup-locations/reorder/` `{ordered_ids}` — the server renumbers `sort_order`. */
export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(reorderPickups(store, (await readBody(request)).ordered_ids), { delay: 180 }));
}
