import { hasPermission } from "@/lib/access";
import type { MockRouteContext } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { b2bOptions, bumpApprovalVersion } from "@/mocks/b2b/state";

/**
 * `/api/bff/b2b/*` — the `[NEEDS BACKEND]` half of M36: the draft form's choices
 * (`GET /api/v1/roles/` shared with M18, the M22 branches). Negotiation drafts
 * (`/api/v1/orders/negotiations/`) stay hidden until Django ships them (§10).
 */
export async function b2bMock(request: Request, segments: string[], ctx: MockRouteContext): Promise<Response> {
  const { store, session } = ctx;
  const subject = { kind: session.kind, features: session.features, permissions: session.staff?.permissions };
  if (!hasPermission(subject, "orders.create_b2b") && !hasPermission(subject, "orders.approve_b2b")) return mockJson({ detail: "ليست لديك صلاحية لهذا الإجراء." }, { status: 403 });
  const parts = segments.filter(Boolean);
  if (parts.length === 1 && parts[0] === "options" && request.method === "GET") return mockJson(b2bOptions(store), { delay: 100 });
  // Mock-only: simulate another approver deciding first (the 409 path of US-36.2.2).
  if (parts.length === 3 && parts[0] === "_test" && parts[1] === "bump" && request.method === "POST") {
    return bumpApprovalVersion(store, Number(parts[2])) ? mockJson({ ok: true }) : mockJson({ detail: "غير موجود." }, { status: 404 });
  }
  return mockJson({ detail: "غير موجود." }, { status: 404 });
}
