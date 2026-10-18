import { mockRoute } from "@/lib/bff/mock-route";
import { inventoryCsv } from "@/mocks/inventory/state";

/** CSV of the current filter (M21 FR-21.11) — gated by `reports.export`. */
export async function GET(request: Request) {
  return mockRoute(
    request,
    ({ store, url }) =>
      new Response(inventoryCsv(store, url.searchParams), {
        headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="inventory.csv"', "x-sharwa-mock": "1" },
      }),
    { permission: "reports.export" },
  );
}
