import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { walletById, walletDetailView } from "@/mocks/wallets/state";

/** `GET /api/v1/customers/wallets/<id>/` → the wallet with its points balance (M35 §7). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/customers/wallets/[id]">) {
  const { id } = await params;
  return mockRoute(
    request,
    ({ store }) => {
      const wallet = walletById(store, Number(id));
      if (!wallet) return mockJson({ detail: "المحفظة غير موجودة." }, { status: 404 });
      return mockJson(walletDetailView(store, wallet), { delay: 160 });
    },
    { permission: "customers.view" },
  );
}
