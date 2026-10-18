import { hasPermission } from "@/lib/access";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { resolveApproval } from "@/mocks/approvals/state";
import { audit, sessionActor } from "@/mocks/staff/state";

/** `POST /api/v1/approvals/<id>/resolve/` `{decision, note?, version}` → 200 / 409 / 403 self (FR-18.06). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/approvals/[id]/resolve">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    async ({ store, session }) => {
      const subject = { kind: session.kind, features: session.features, permissions: session.staff?.permissions };
      if (session.kind !== "merchant" && !hasPermission(subject, "staff.manage")) return mockJson({ detail: "حسم الطلبات مقصور على المالك أو من يملك إدارة الموظفين." }, { status: 403 });
      const me = sessionActor(store, session);
      const body = await readBody(request);
      const result = resolveApproval(store, id, body, me);
      if (result.ok) {
        audit(store, { action_code: "approval.resolved", actor: me.name, entity: `طلب موافقة #${id}`, before_snapshot: { status: "pending" }, after_snapshot: { status: result.data.status, note: result.data.note } });
      }
      return respond(result, { delay: 220 });
    },
    { permission: "staff.view" },
  );
}
