import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { procurementMock } from "@/mocks/procurement/router";

/**
 * `/api/bff/suppliers/*` → `/api/v1/suppliers/*` (M23 §7). One optional catch-all: the path after
 * `/api/bff/` is the upstream path verbatim (plus Django's trailing slash).
 *
 *   mock mode → `src/mocks/procurement` behind the merchant/staff session (`mockRoute`);
 *   live mode → `procurement` in `SHARWA_LIVE_MODULES` (INT-035, one toggle for suppliers and
 *               purchase orders): `api/views_procurement.py` answers 401, the M18 keys
 *               (`suppliers.manage` / `suppliers.approve`) 403, and the stale `version` 409.
 */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  return liveOrMock(request, "procurement", `/api/v1/suppliers/${joined ? `${joined}/` : ""}`, () =>
    mockRoute(request, (ctx) => procurementMock(request, ["suppliers", ...path], ctx)),
  );
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
