import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listCarriers } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `GET /api/v1/shipping/carriers/` → `[{carrier_code, name, is_connected, fields, webhook_url, last_event_at}]` — secrets never leave the server. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, storeHost, session }) => ownerOnly(session) ?? mockJson(listCarriers(store, storeHost), { delay: 160 }));
}
