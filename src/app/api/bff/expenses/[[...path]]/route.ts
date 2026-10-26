import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { expensesMock } from "@/mocks/expenses/router";

/**
 * `/api/bff/expenses/*` → `/api/v1/expenses/*` (M33 — INT-043). ONE optional catch-all: the path after `expenses/` is
 * the upstream path verbatim (plus Django's trailing slash); the bare `/api/bff/expenses` is the ledger itself.
 *
 * live (`expenses` in SHARWA_LIVE_MODULES) → `api/views_expenses.py`: `GET ?category&currency&from&to&page` →
 * `{count, months:[{month, totals, rows}]}` (month totals per currency, built by Django), `POST` → 201 the row;
 * `expenses.manage` or the owner (403 otherwise); `<id>/` → 405 (no edit/delete yet, FR-33.06).
 * mock → `src/mocks/expenses` behind the merchant/staff session (`mockRoute`).
 */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  return liveOrMock(request, "expenses", joined ? `/api/v1/expenses/${joined}/` : "/api/v1/expenses/", () =>
    mockRoute(request, (ctx) => expensesMock(request, path, ctx)),
  );
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
