import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { MOCK_HEADER, mockJson } from "@/mocks/runtime";
import { exportCustomersCsv } from "@/mocks/customers/state";
import { audit, sessionActor } from "@/mocks/staff/state";

/**
 * `GET /api/v1/customers/export.csv?<the list filters>` → CSV / 403 / 429 (FR-07.07).
 * 429 when the member's `BehaviorAlert` for `export_volume` is `critical` — read from the
 * session (`/auth/me/` `behavior.export`). Mock-only knob: `?simulate=critical` forces it so
 * the check script can prove the 429 path (no fixture member is critical). Every export is
 * written to the audit log with the filters and the row count.
 */
export async function GET(request: Request) {
  return liveOrMock(request, "customers", "/api/v1/customers/export.csv", () => exportMock(request));
}

async function exportMock(request: Request) {
  return mockRoute(
    request,
    ({ store, session, url }) => {
      const level = url.searchParams.get("simulate") === "critical" ? "critical" : (session.behavior?.export ?? "none");
      if (level === "critical") return mockJson({ detail: "تجاوزت حدّ التصدير اليومي، راجع مدير المتجر." }, { status: 429 });
      const params = new URLSearchParams(url.searchParams);
      params.delete("simulate");
      const { csv, count } = exportCustomersCsv(store, params);
      const actor = sessionActor(store, session);
      audit(store, {
        action_code: "customers.export",
        actor: actor.name,
        entity: "customers",
        before_snapshot: null,
        after_snapshot: { rows: count, filters: Object.fromEntries(params) },
      });
      return new Response(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
          "cache-control": "no-store",
          "x-export-rows": String(count),
          [MOCK_HEADER]: "1",
        },
      });
    },
    { permission: "customers.export" },
  );
}
