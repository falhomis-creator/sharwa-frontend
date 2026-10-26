import { liveOrMock } from "@/lib/bff/live-route";
import { contextFromRequest } from "@/lib/bff/upstream";
import { agentGate } from "@/mocks/courier/gate";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";
import { agentCustody, agentMe, agentShipmentDetail, agentShipments } from "@/mocks/shipping/sharwa-ship";

/**
 * `/api/bff/agent/*` → the four M38 reads (INT-046): `GET /api/v1/agent/{me,shipments,shipments/<id>,custody}/`.
 *
 * live (`courier` in SHARWA_LIVE_MODULES) → `api/views_courier.py`: the staff session of M18 whose
 * `shipping_provider_profile` is the agent (401 / 403 with the server's sentences; the owner is 403 here);
 * «my shipments» = shipments whose fulfillment is assigned to me; amounts and the balance are server strings.
 * mock → `src/mocks/shipping/sharwa-ship.ts` behind the same identity gate (`src/mocks/courier/gate.ts`).
 * The five actions go straight to the `/api/v1/agent/*` passthrough (Django-first).
 */
async function mock(request: Request, path: string[]): Promise<Response> {
  if (!isMocksOn()) return notAvailable();
  if (request.method !== "GET") return mockJson({ detail: `الطريقة «${request.method}» غير مسموحة.` }, { status: 405 });
  const ctx = contextFromRequest(request);
  const g = await agentGate(request, ctx);
  if (g instanceof Response) return g;
  const [head, id] = path;
  const url = new URL(request.url);
  if (head === "me" && !id) return mockJson(agentMe(g.store, g.agentId), { delay: 120 });
  if (head === "custody" && !id) return mockJson(agentCustody(g.store, g.agentId, url.searchParams), { delay: 140 });
  if (head === "shipments" && !id) return mockJson(agentShipments(g.store, g.agentId, url.searchParams), { delay: 160 });
  if (head === "shipments" && id && path.length === 2) {
    const d = agentShipmentDetail(g.store, g.agentId, Number(id));
    return d ? mockJson(d, { delay: 140 }) : mockJson({ detail: "الشحنة غير موجودة." }, { status: 404 });
  }
  return mockJson({ detail: "غير موجود." }, { status: 404 });
}

async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  return liveOrMock(request, "courier", `/api/v1/agent/${joined}/`, () => mock(request, path));
}

export { handle as GET, handle as POST };
