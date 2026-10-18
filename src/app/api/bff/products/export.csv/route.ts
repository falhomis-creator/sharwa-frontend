import { mockRoute } from "@/lib/bff/mock-route";
import { MOCK_HEADER } from "@/mocks/runtime";
import { exportCsv } from "@/mocks/catalog/products";

/** `GET /api/v1/products/export.csv?<list filters>` — same filters, same columns (US-04.7.2). */
export async function GET(request: Request) {
  return mockRoute(
    request,
    ({ store, url }) =>
      new Response(exportCsv(store, url.searchParams), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="products-${store ?? "store"}.csv"`,
          "cache-control": "no-store",
          [MOCK_HEADER]: "1",
        },
      }),
    { permission: "inventory.view" },
  );
}
