import { hasPermission } from "@/lib/access";
import { readBody, respond, type MockRouteContext } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createExpense, listExpenses } from "@/mocks/expenses/state";

/**
 * `/api/bff/expenses/*` mock — mirrors `/api/v1/expenses/*` (M33 §7, INT-043 `api/views_expenses.py`).
 * The owner, or a member holding `expenses.manage` (Django migration 0235); anyone else 403.
 * A staff entry records the member's name (`created_by_name`), the owner's is `null`.
 * No feature gate (FR-33.07). Edit/delete do not exist (FR-33.06) — 405.
 */
export async function expensesMock(request: Request, segments: string[], ctx: MockRouteContext): Promise<Response> {
  const { store, session, url } = ctx;
  if (!hasPermission({ kind: session.kind, features: session.features, permissions: session.staff?.permissions }, "expenses.manage")) {
    return mockJson({ detail: "ليست لديك صلاحية لهذا الإجراء." }, { status: 403 });
  }
  const parts = segments.filter(Boolean);
  if (parts.length === 0) {
    if (request.method === "GET") return mockJson(listExpenses(store, url.searchParams), { delay: 160 });
    if (request.method === "POST") return respond(createExpense(store, await readBody(request), session.kind === "staff" ? (session.staff?.full_name ?? "موظف") : null));
  }
  if (parts.length === 1 && /^\d+$/.test(parts[0]!)) return mockJson({ detail: "تعديل المصروفات وحذفها غير متاحَين بعد." }, { status: 405 });
  return parts.length === 0 ? mockJson({ detail: `الطريقة «${request.method}» غير مسموحة.` }, { status: 405 }) : mockJson({ detail: "غير موجود." }, { status: 404 });
}
