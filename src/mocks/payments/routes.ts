import "server-only";
import { mockRoute, type MockRouteContext } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";

/**
 * M14 rows are owner-only (§2: no staff permission key covers money). The session gate
 * (401) and the mock switch (501) come from `mockRoute`; a staff session answers 403.
 */
export function ownerRoute(request: Request, handler: (ctx: MockRouteContext) => Promise<Response> | Response): Promise<Response> {
  return mockRoute(request, (ctx) => {
    if (ctx.session.kind !== "merchant") return mockJson({ detail: "المدفوعات والمحفظة مقصورة على مالك المتجر." }, { status: 403 });
    return handler(ctx);
  });
}
