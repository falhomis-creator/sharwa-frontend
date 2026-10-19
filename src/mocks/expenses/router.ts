import { isStoreOwner } from "@/lib/access";
import { readBody, respond, type MockRouteContext } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createExpense, listExpenses } from "@/mocks/expenses/state";

/**
 * `/api/bff/expenses/*` → proposed `/api/v1/expenses/*` (M33 §7, `[NEEDS BACKEND]`).
 * `operating_expenses_view` requires the merchant session and none of the 35 permission
 * keys covers expenses (§10), so staff get 403 until Django adds one. No feature gate
 * (FR-33.07). Edit/delete do not exist (FR-33.06) — 405.
 */
export async function expensesMock(request: Request, segments: string[], ctx: MockRouteContext): Promise<Response> {
  const { store, session, url } = ctx;
  if (!isStoreOwner(session)) return mockJson({ detail: "المصروفات التشغيلية متاحة لمالك المتجر فقط." }, { status: 403 });
  const parts = segments.filter(Boolean);
  if (parts.length === 0) {
    if (request.method === "GET") return mockJson(listExpenses(store, url.searchParams), { delay: 160 });
    if (request.method === "POST") return respond(createExpense(store, await readBody(request), null));
  }
  if (parts.length === 1 && /^\d+$/.test(parts[0]!)) return mockJson({ detail: "تعديل المصروفات وحذفها غير متاحَين بعد." }, { status: 405 });
  return parts.length === 0 ? mockJson({ detail: `الطريقة «${request.method}» غير مسموحة.` }, { status: 405 }) : mockJson({ detail: "غير موجود." }, { status: 404 });
}
