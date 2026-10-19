import "server-only";
import { sessionFromRequest, storeHostFor } from "@/features/dashboard-shell/api/session";
import type { UpstreamContext } from "@/lib/bff/upstream";
import { MOCK_SESSION_COOKIE, parseMockSessionKind } from "@/mocks/dashboard/auth";
import { mockJson } from "@/mocks/runtime";
import { agentForStaff } from "@/mocks/shipping/sharwa-ship";

/**
 * M38 identity (FR-38.01): the courier app runs on the STAFF session of M18 — no token of
 * its own. In mocks the staff fixtures map to `StaffMember` ids (`staff` = سارة الحربي #2,
 * `manager` = منى القحطاني #4, see `src/mocks/staff/state.ts`), and the agent is the M15
 * provider whose `staff_account` is that id (`shipping_provider_profile`):
 *   - no session → 401;
 *   - staff without a provider profile → 403 with the server's exact sentence;
 *   - the store owner → 403 here (the owner acts with `agent_id` from the M39 supervisor
 *     screen, not from this app — M38 §2).
 */
const STAFF_ID: Record<"staff" | "manager", number> = { staff: 2, manager: 4 };

export type AgentGate = { agentId: number; agentName: string; store: string } | Response;

function cookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export async function agentGate(request: Request, ctx: Pick<UpstreamContext, "store" | "storeHost">): Promise<AgentGate> {
  if (!ctx.store) return mockJson({ detail: "استخدم نطاق المتجر." }, { status: 403 });
  const session = await sessionFromRequest(request, { store: ctx.store, storeHost: storeHostFor(ctx.store, ctx.storeHost) });
  if (!session) return mockJson({ detail: "لم تُقدَّم بيانات الاعتماد." }, { status: 401 });
  if (session.kind === "merchant") return mockJson({ detail: "هذا التطبيق لحسابات المندوبين. يدير مالك المتجر المندوبين من شاشة الإشراف في لوحة التحكم." }, { status: 403 });
  const kind = parseMockSessionKind(cookieValue(request.headers.get("cookie"), MOCK_SESSION_COOKIE));
  const staffId = kind === "staff" || kind === "manager" ? STAFF_ID[kind] : null;
  const agent = staffId === null ? undefined : agentForStaff(ctx.store, staffId);
  if (!agent) return mockJson({ detail: "حساب الموظف هذا غير مرتبط بأي ملف مندوب شحن." }, { status: 403 });
  if (!agent.is_active) return mockJson({ detail: "ملف المندوب هذا معطّل. تواصل مع مالك المتجر." }, { status: 403 });
  return { agentId: agent.id, agentName: agent.name, store: ctx.store };
}
