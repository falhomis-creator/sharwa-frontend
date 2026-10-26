import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { dropshippingMock } from "@/mocks/dropshipping/router";

/**
 * `/api/bff/dropshipping/*` → `/api/v1/dropshipping/*` (M29 §7). One optional catch-all: the path after
 * `dropshipping/` is the upstream path verbatim (plus Django's trailing slash); multipart feed uploads pass through.
 *
 *   mock mode → `src/mocks/dropshipping` behind the merchant/staff session (`mockRoute`; feature + permission in the router);
 *   live mode → `dropshipping` in `SHARWA_LIVE_MODULES` (INT-039): `api/views_dropshipping.py` answers 401, the M18 key
 *               `channels.dropshipping.manage` / the plan feature `dropshipping` 403; `feeds/<id>/errors.csv` and
 *               `jobs/<id>/errors.csv` are streamed CSVs forwarded as is.
 */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  return liveOrMock(request, "dropshipping", `/api/v1/dropshipping/${joined ? `${joined}/` : ""}`, () =>
    mockRoute(request, (ctx) => dropshippingMock(request, path, ctx)),
  );
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
