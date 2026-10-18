import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { returnLocations } from "@/mocks/returns/state";

/**
 * `GET /api/bff/returns/options` → `{locations:[{id,name}]}` — the active locations for the
 * restock / RMA destination / scan pickers. Reads the M22 foundation; any signed-in member
 * (the scan screen is also open to `inventory.adjust`). The day M22 ships its list row this
 * becomes a read of `/api/v1/locations/?is_active=true`.
 */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson({ locations: returnLocations(store) }, { delay: 80 }));
}
