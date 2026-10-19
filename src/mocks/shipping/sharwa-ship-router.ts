import "server-only";
import { COURIER_SUPERVISION_FEATURES, hasPermission, type PermissionKey } from "@/lib/access";
import { respond, type MockRouteContext } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listZones } from "@/mocks/shipping/state";
import {
  assignShipment,
  emergencyReassign,
  findExt,
  issueWaybill,
  listAwb,
  listRateCards,
  listShifts,
  listShipments,
  pendingOrders,
  retryAwb,
  shipmentDetail,
  supervisor,
  transition,
} from "@/mocks/shipping/sharwa-ship";

/**
 * M39 `[NEEDS BACKEND]` rows (§7) behind `/api/bff/shipping/{sharwa-ship,shipments,
 * awb-queue,rate-cards,supervisor,agents,agent-shifts}/*`. The path after `shipping/` is
 * the proposed `/api/v1/shipping/*` path verbatim, so each adapter becomes a passthrough
 * the day Django ships it.
 *
 * Gates (M39 §2, FR-39.01): feature `sharwa_ship` (403 with the readable sentence), reads
 * under `orders.view`, writes (issue, manual status, retry, assign, reassign) the owner's.
 * Courier supervision — `supervisor`, `agent-shifts`, `agents/<id>/emergency-reassign`,
 * `shipments/<id>/assign` — opens with Sharwa Ship OR local delivery (Phase 7 decision 3).
 */
type Body = Record<string, unknown>;

async function json(req: Request): Promise<Body> {
  try {
    const d: unknown = await req.json();
    return d && typeof d === "object" && !Array.isArray(d) ? (d as Body) : {};
  } catch {
    return {};
  }
}

const forbidden = (detail: string) => mockJson({ detail }, { status: 403, delay: 80 });
const notFound = () => mockJson({ detail: "غير موجود." }, { status: 404 });
const notAllowed = (m: string) => mockJson({ detail: `الطريقة «${m}» غير مسموحة.` }, { status: 405 });

export async function sharwaShipMock(request: Request, segments: string[], ctx: MockRouteContext): Promise<Response> {
  const { store, session, url } = ctx;
  const sharwaShip = session.features.includes("sharwa_ship");
  const [head0, , b0] = segments;
  const courierRow = head0 === "supervisor" || head0 === "agent-shifts" || head0 === "agents" || (head0 === "shipments" && b0 === "assign");
  if (courierRow) {
    if (!COURIER_SUPERVISION_FEATURES.some((f) => session.features.includes(f))) return forbidden("الإشراف على المندوبين يتطلب «شروة شيب» أو التوصيل المحلي.");
  } else if (!sharwaShip) return forbidden("ميزة شروة شيب غير مفعّلة لمتجرك.");
  const can = (p: PermissionKey) => hasPermission({ kind: session.kind, features: session.features, permissions: session.staff?.permissions }, p);
  if (!can("orders.view")) return forbidden("ليست لديك صلاحية لعرض الشحنات.");
  const owner = session.kind === "merchant";
  const ownerOnly = () => forbidden("هذا الإجراء مقصور على مالك المتجر.");
  const m = request.method;
  const [head, a, b, c] = segments;

  switch (head) {
    case "sharwa-ship": {
      if (a === "pending-orders" && !b) return m === "GET" ? mockJson({ count: pendingOrders(store).length, results: pendingOrders(store) }, { delay: 160 }) : notAllowed(m);
      if (a === "zones" && !b) return m === "GET" ? mockJson(listZones(store).filter((z) => z.is_active).map((z) => ({ code: z.code, name: z.name, display_price: z.display_price, currency: z.currency })), { delay: 120 }) : notAllowed(m);
      if (a === "orders" && b && c === "waybill") {
        if (m !== "POST") return notAllowed(m);
        if (!owner) return ownerOnly();
        return respond(issueWaybill(store, Number(b), await json(request)));
      }
      return notFound();
    }
    case "shipments": {
      if (!a) return m === "GET" ? mockJson(listShipments(store, url.searchParams), { delay: 160 }) : notAllowed(m);
      const id = Number(a);
      const e = findExt(store, id);
      if (!e) return mockJson({ detail: "الشحنة غير موجودة." }, { status: 404 });
      if (!b) return m === "GET" ? mockJson(shipmentDetail(store, e), { delay: 140 }) : notAllowed(m);
      if (b === "status") {
        if (m !== "POST") return notAllowed(m);
        if (!owner) return ownerOnly();
        return respond(transition(store, id, await json(request), "merchant_manual", { type: "merchant", id: null, name: "مالك المتجر" }));
      }
      if (b === "assign") {
        if (m !== "POST") return notAllowed(m);
        if (!owner) return ownerOnly();
        return respond(assignShipment(store, id, await json(request)));
      }
      return notFound();
    }
    case "awb-queue": {
      if (!a) return m === "GET" ? mockJson({ count: listAwb(store).length, results: listAwb(store) }, { delay: 140 }) : notAllowed(m);
      if (b === "retry") {
        if (m !== "POST") return notAllowed(m);
        if (!owner) return ownerOnly();
        return respond(retryAwb(store, Number(a)));
      }
      return notFound();
    }
    case "rate-cards":
      return m === "GET" && !a ? mockJson(listRateCards(store), { delay: 120 }) : notFound();
    case "supervisor":
      if (!owner) return ownerOnly();
      return m === "GET" && !a ? mockJson(supervisor(store, { sharwaShip }), { delay: 160 }) : notFound();
    case "agents":
      if (a && b === "emergency-reassign") {
        if (m !== "POST") return notAllowed(m);
        if (!owner) return ownerOnly();
        return respond(emergencyReassign(store, Number(a), await json(request)));
      }
      return notFound();
    case "agent-shifts":
      if (!owner) return ownerOnly();
      return m === "GET" && !a ? mockJson({ results: listShifts(store) }, { delay: 120 }) : notFound();
    default:
      return notFound();
  }
}
