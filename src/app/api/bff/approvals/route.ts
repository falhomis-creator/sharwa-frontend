import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { approvalsState } from "@/mocks/approvals/state";
import { sessionActor } from "@/mocks/staff/state";

/** `GET /api/v1/approvals/?status&type&page` — escalated first, then newest (US-18.5.4). */
export async function GET(request: Request) {
  return mockRoute(
    request,
    ({ store, session, url }) => {
      const me = sessionActor(store, session);
      const status = url.searchParams.get("status");
      const type = url.searchParams.get("type");
      let rows = [...approvalsState(store).items];
      if (status) rows = rows.filter((a) => a.status === status);
      if (type) rows = rows.filter((a) => a.request_type === type);
      rows.sort((a, b) => Number(Boolean(b.escalated_at)) - Number(Boolean(a.escalated_at)) || b.created_at.localeCompare(a.created_at));
      const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
      const size = Math.min(100, Math.max(1, Number(url.searchParams.get("page_size") ?? 50)));
      return mockJson(
        { count: rows.length, results: rows.slice((page - 1) * size, page * size).map((a) => ({ ...a, is_mine: a.requester_id !== null && a.requester_id === me.id })) },
        { delay: 160 },
      );
    },
    { permission: "staff.view" },
  );
}
