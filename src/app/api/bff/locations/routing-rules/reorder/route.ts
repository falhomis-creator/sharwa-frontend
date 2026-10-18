import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { reorderRules } from "@/mocks/locations/state";
import { ownerOnly } from "@/app/api/bff/locations/_guard";

/** `POST /api/v1/locations/routing-rules/reorder/` `{ordered_ids:[int]}` → `{ok, reordered}` — the server renumbers `priority`. */
export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(reorderRules(store, (await readBody(request)).ordered_ids), { delay: 180 }));
}
