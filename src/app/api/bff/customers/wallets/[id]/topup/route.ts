import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody } from "@/lib/bff/mock-route";
import { actorName } from "@/mocks/catalog/products";
import { mockJson } from "@/mocks/runtime";
import { MANUAL_WALLET_REASONS, appendWalletTransaction, transactionView, walletMoney, type WalletReason } from "@/mocks/wallets/state";

/**
 * `POST /api/v1/customers/wallets/<id>/topup/` `{amount, reason, note, idempotency_key?}`
 * → `{display_balance, transaction}` (M35 US-35.2). Only the three manual reasons are
 * accepted (FR-35.03); a repeated `idempotency_key` returns the first transaction (FR-35.09).
 */
async function mockPOST(request: Request, { params }: RouteContext<"/api/bff/customers/wallets/[id]/topup">) {
  const { id } = await params;
  return mockRoute(
    request,
    async ({ store, session }) => {
      const body = await readBody(request);
      const reason = String(body.reason ?? "");
      if (!(MANUAL_WALLET_REASONS as readonly string[]).includes(reason)) {
        return mockJson({ reason: ["السبب يجب أن يكون تعبئة يدوية أو مكافأة أو تسوية."] }, { status: 400 });
      }
      const amount = String(body.amount ?? "").trim();
      if (!/^-?\d+(\.\d{1,2})?$/.test(amount)) return mockJson({ amount: ["أدخل مبلغاً صالحاً."] }, { status: 400 });
      if (Number(amount) < 0 && reason !== "adjustment") return mockJson({ amount: ["الخصم متاح فقط بسبب «تسوية»."] }, { status: 400 });
      const idem = request.headers.get("idempotency-key") ?? (typeof body.idempotency_key === "string" ? body.idempotency_key : undefined);
      const result = appendWalletTransaction(store, Number(id), {
        amount: Number(amount).toFixed(2),
        reason: reason as WalletReason,
        note: typeof body.note === "string" ? body.note : null,
        actor: actorName(session),
        idempotency_key: idem,
      });
      if (!result.ok) return mockJson(result.body, { status: result.status, delay: 120 });
      return mockJson({ display_balance: walletMoney(result.data.wallet.balance), transaction: transactionView(result.data.transaction) }, { delay: 260 });
    },
    { permission: "customers.edit_profile" },
  );
}

// INT-028: `liveOrMock` module `wallets` → Django `api/views_wallets.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/customers/wallets/[id]/topup">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/customers/wallets/${encodeURIComponent(p.id)}/topup/`;
}

export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "wallets", await upstream(ctx), () => mockPOST(request, ctx));
}
