import { mockRoute } from "@/lib/bff/mock-route";
import { posMock } from "@/mocks/pos/router";

/**
 * `/api/bff/pos/*` → `/api/v1/pos/*` (M16 §7 — every row `[NEEDS BACKEND]`; Django has
 * `shift_hub`/`open_shift`/`close_shift`/`cash_drawer`/`add_cash_movement`/
 * `resolve_shift_variance`/`create_order` as HTML only). ONE catch-all: the path after
 * `pos/` is the upstream path verbatim, so the day the rows ship this becomes a passthrough.
 *
 * Gate: the merchant/staff session (401) via `mockRoute`; the location assignment (M22)
 * and the role's discount ceiling are enforced by the server side (`src/mocks/pos`).
 */
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return mockRoute(request, (ctx) => posMock(request, path, ctx));
}

export { handle as GET, handle as POST };
