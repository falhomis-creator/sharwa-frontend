import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { actorName } from "@/mocks/catalog/products";
import { listWriteoffs, requestWriteoff } from "@/mocks/inventory/state";

/**
 * `GET /api/v1/inventory/writeoffs/` — the write-off requests (M21 US-21.7); `POST` creates an
 * `ApprovalRequest{request_type: stock_writeoff}` (decided in M18 `approvals/<id>/resolve/`).
 * Nothing is deducted until approved — Django deducts inside the approval transaction.
 */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(listWriteoffs(store), { delay: 150 }), { permission: "inventory.view" });
}

async function mockPOST(request: Request) {
  return mockRoute(
    request,
    async ({ store, session }) =>
      respond(requestWriteoff(store, await readBody(request), { id: session.kind === "staff" ? 2 : null, name: actorName(session) }), { delay: 260 }),
    { permission: "inventory.writeoff" },
  );
}

// INT-024: `liveOrMock` module `inventory` → Django `api/views_inventory.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "inventory", "/api/v1/inventory/writeoffs/", () => mockGET(request));
}

export async function POST(request: Request) {
  return liveOrMock(request, "inventory", "/api/v1/inventory/writeoffs/", () => mockPOST(request));
}
