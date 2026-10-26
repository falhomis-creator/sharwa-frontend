import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { patchLocationRow } from "@/mocks/inventory/state";

/** `PATCH /api/v1/locations/<id>/inventory/<unit>/` `{reorder_point?, quarantine_quantity?}`; `unit` = `p<productId>` or `v<variantId>`. */
async function mockPATCH(request: Request, ctx: RouteContext<"/api/bff/locations/[id]/inventory/[unit]">) {
  const { id, unit } = await ctx.params;
  return mockRoute(
    request,
    async ({ store }) => {
      const m = /^(p|v)(\d+)(?:-(\d+))?$/.exec(unit);
      if (!m) return respond({ ok: false, status: 404, body: { detail: "الوحدة غير معروفة." } });
      const productId = m[1] === "p" ? Number(m[2]) : Number(m[3]);
      const variantId = m[1] === "v" ? Number(m[2]) : null;
      return respond(patchLocationRow(store, Number(id), productId, variantId, await readBody(request)), { delay: 200 });
    },
    { permission: "inventory.adjust" },
  );
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/locations/[id]/inventory/[unit]">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/locations/${encodeURIComponent(p.id)}/inventory/${encodeURIComponent(p.unit)}/`;
}

export async function PATCH(request: Request, ctx: Ctx) {
  return liveOrMock(request, "locations", await upstream(ctx), () => mockPATCH(request, ctx));
}
