import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { actorName } from "@/mocks/catalog/products";
import { listWriteoffs, requestWriteoff } from "@/mocks/inventory/state";

/**
 * `GET` — my write-off requests (M21 US-21.7); `POST` → `POST /api/v1/approvals/`
 * `{request_type: stock_writeoff, …}` (shared with M18). Nothing is deducted until approved.
 */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(listWriteoffs(store), { delay: 150 }), { permission: "inventory.view" });
}

export async function POST(request: Request) {
  return mockRoute(
    request,
    async ({ store, session }) =>
      respond(requestWriteoff(store, await readBody(request), { id: session.kind === "staff" ? 2 : null, name: actorName(session) }), { delay: 260 }),
    { permission: "inventory.writeoff" },
  );
}
