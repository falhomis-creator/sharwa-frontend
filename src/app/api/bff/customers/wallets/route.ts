import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { normalizePhone } from "@/lib/format";
import { mockJson } from "@/mocks/runtime";
import { createWallet, listWallets, walletDetailView } from "@/mocks/wallets/state";

/**
 * `GET /api/v1/customers/wallets/?q&sort&page&page_size` and `POST /api/v1/customers/wallets/`
 * `{customer_phone, customer_name?}` → 201 / 400 `{customer_phone:[…]}` — M35 §7, `[NEEDS BACKEND]`.
 * Reads need `customers.view`; creating a wallet needs `customers.edit_profile` (M35 §10).
 */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listWallets(store, url.searchParams), { delay: 200 }), { permission: "customers.view" });
}

export async function POST(request: Request) {
  return mockRoute(
    request,
    async ({ store }) => {
      const body = await readBody(request);
      const phone = normalizePhone(String(body.customer_phone ?? ""));
      const result = createWallet(store, phone, typeof body.customer_name === "string" ? body.customer_name : null);
      if (!result.ok) return respond(result);
      return mockJson(walletDetailView(store, result.data), { status: 201, delay: 220 });
    },
    { permission: "customers.edit_profile" },
  );
}
