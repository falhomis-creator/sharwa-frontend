import { mockRoute } from "@/lib/bff/mock-route";
import { expensesMock } from "@/mocks/expenses/router";

/** `/api/bff/expenses/*` → proposed `/api/v1/expenses/*` (M33 §7, `[NEEDS BACKEND]`). One catch-all; see the router. */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return mockRoute(request, (ctx) => expensesMock(request, path, ctx));
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
