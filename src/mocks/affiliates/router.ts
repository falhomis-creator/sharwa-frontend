import { isStoreOwner } from "@/lib/access";
import { readBody, respond, type MockRouteContext } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createPartner, getPartner, listPartners, listSales, markPaid, partnerSummary, patchPartner } from "@/mocks/affiliates/state";

/**
 * `/api/bff/{affiliates,influencers}/*` → the proposed `/api/v1/{affiliates,influencers}/*`
 * (M17 §7, every row `[NEEDS BACKEND]`). The path after the resource is the upstream path
 * verbatim, so the day Django ships it this becomes a passthrough.
 *
 * Gates: the plan feature (`affiliates` / `influencers`, FR-17.01) for every row; writes
 * (create, edit, stop, mark paid) are the OWNER's — none of the 35 permission keys covers
 * marketing partners or their payouts (src/lib/access.ts `isStoreOwner`).
 */
type Kind = "affiliates" | "influencers";

const FEATURE_OFF: Record<Kind, string> = {
  affiliates: "ميزة التسويق بالعمولة غير مفعّلة في خطتك.",
  influencers: "ميزة المؤثرين غير مفعّلة في خطتك.",
};

export async function partnersMock(kind: Kind, request: Request, segments: string[], ctx: MockRouteContext): Promise<Response> {
  const { store, session, url } = ctx;
  if (!session.features.includes(kind)) return mockJson({ detail: FEATURE_OFF[kind] }, { status: 403 });
  const method = request.method;
  const isWrite = method !== "GET" && method !== "HEAD";
  if (isWrite && !isStoreOwner(session)) return mockJson({ detail: "إدارة المسوّقين والمؤثرين ومستحقاتهم لمالك المتجر." }, { status: 403 });
  const parts = segments.filter(Boolean);
  const notAllowed = () => mockJson({ detail: `الطريقة «${method}» غير مسموحة.` }, { status: 405 });

  // GET list · POST create
  if (parts.length === 0) {
    if (method === "GET") return mockJson(listPartners(store, kind, url.searchParams), { delay: 160 });
    if (method === "POST") return respond(createPartner(store, kind, await readBody(request)));
    return notAllowed();
  }
  // GET summary (FR-17.09)
  if (parts.length === 1 && parts[0] === "summary") {
    return method === "GET" ? mockJson(partnerSummary(store, kind), { delay: 100 }) : notAllowed();
  }
  const id = Number(parts[0]);
  if (!Number.isInteger(id) || id <= 0) return mockJson({ detail: "غير موجود." }, { status: 404 });
  if (parts.length === 1) {
    if (method === "GET") {
      const row = getPartner(store, kind, id);
      return row ? mockJson(row, { delay: 120 }) : mockJson({ detail: "غير موجود." }, { status: 404 });
    }
    if (method === "PATCH") return respond(patchPartner(store, kind, id, await readBody(request)));
    return notAllowed();
  }
  if (parts[1] === "sales" && parts.length === 2) return method === "GET" ? respond(listSales(store, kind, id, url.searchParams)) : notAllowed();
  if (parts[1] === "sales" && parts[2] === "mark-paid" && parts.length === 3) return method === "POST" ? respond(markPaid(store, kind, id, await readBody(request))) : notAllowed();
  return mockJson({ detail: "غير موجود." }, { status: 404 });
}
