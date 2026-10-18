import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listRmas } from "@/mocks/returns/state";

/** `GET /api/v1/returns/rma/?status&q&page` — M24 §7 `[NEEDS BACKEND]` (today HTML `reverse_logistics`). */
export async function GET(request: Request) {
  return mockRoute(
    request,
    ({ store, url, session }) =>
      session.features.includes("refunds") ? mockJson(listRmas(store, url.searchParams), { delay: 160 }) : mockJson({ detail: "ميزة المرتجعات غير مفعّلة في خطتك." }, { status: 403 }),
    { permission: "orders.process_returns" },
  );
}
