import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { getRma, rmaView } from "@/mocks/returns/state";

/** `GET /api/v1/returns/rma/<id>/` — M24 §7 live: INT-026. */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/returns/rma/[id]">) {
  const { id } = await params;
  return mockRoute(
    request,
    ({ store, session }) => {
      if (!session.features.includes("refunds")) return mockJson({ detail: "ميزة المرتجعات غير مفعّلة في خطتك." }, { status: 403 });
      const rma = getRma(store, Number(id));
      return rma ? mockJson(rmaView(store, rma), { delay: 140 }) : mockJson({ detail: "RMA غير موجود." }, { status: 404 });
    },
    { permission: "orders.process_returns" },
  );
}

// INT-026: `liveOrMock` module `returns` → Django `api/views_returns.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/returns/rma/[id]">;

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return liveOrMock(request, "returns", `/api/v1/returns/rma/${encodeURIComponent(id)}/`, () => mockGET(request, ctx));
}
