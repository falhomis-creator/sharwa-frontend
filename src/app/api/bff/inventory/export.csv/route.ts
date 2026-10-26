import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { inventoryCsv } from "@/mocks/inventory/state";

/** CSV of the current filter (M21 FR-21.11) — gated by `reports.export`. */
async function mockGET(request: Request) {
  return mockRoute(
    request,
    ({ store, url }) =>
      new Response(inventoryCsv(store, url.searchParams), {
        headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="inventory.csv"', "x-sharwa-mock": "1" },
      }),
    { permission: "reports.export" },
  );
}

// INT-024: `liveOrMock` module `inventory` → Django `api/views_inventory.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "inventory", "/api/v1/inventory/export.csv", () => mockGET(request));
}
