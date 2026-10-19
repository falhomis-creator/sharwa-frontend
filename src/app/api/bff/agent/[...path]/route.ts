import { contextFromRequest } from "@/lib/bff/upstream";
import { agentGate } from "@/mocks/courier/gate";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";
import { agentCustody, agentMe, agentShipmentDetail, agentShipments } from "@/mocks/shipping/sharwa-ship";

/**
 * `/api/bff/agent/*` → the four `[NEEDS BACKEND]` M38 reads (§7): `GET /api/v1/agent/
 * {me,shipments,shipments/<id>,custody}/`. The five Ready actions go straight to the
 * `/api/v1/agent/*` passthrough. Same identity gate as the passthrough fixtures
 * (`src/mocks/courier/gate.ts`).
 */
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!isMocksOn()) return notAvailable();
  if (request.method !== "GET") return mockJson({ detail: `الطريقة «${request.method}» غير مسموحة.` }, { status: 405 });
  const ctx = contextFromRequest(request);
  const g = await agentGate(request, ctx);
  if (g instanceof Response) return g;
  const { path } = await params;
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

export { handle as GET, handle as POST };
