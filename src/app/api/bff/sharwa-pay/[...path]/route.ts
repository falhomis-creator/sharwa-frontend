import { env } from "@/env";
import { contextFromRequest, jsonResponse } from "@/lib/bff/upstream";
import { resolveTenant } from "@/lib/tenant";
import { isMocksOn, notAvailable } from "@/mocks/runtime";
import { sharwaPayMock } from "@/mocks/sharwa-pay/router";

/**
 * `/api/bff/sharwa-pay/*` → `/api/v1/sharwa-pay/*` (M40 §7 — every row `[NEEDS BACKEND]`).
 * FR-40.01: the wallet lives on the PLATFORM origin only — a store origin, a custom domain
 * or the console gets 404, so a store page can never read a customer's wallet.
 */
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const ctx = contextFromRequest(request);
  if (resolveTenant(ctx.host, env.TENANT_BASE_DOMAIN).kind !== "platform") return jsonResponse({ detail: "غير موجود." }, { status: 404 });
  if (!isMocksOn()) return notAvailable();
  const { path } = await params;
  const res = await sharwaPayMock(request, path);
  res.headers.set("cache-control", "no-store");
  return res;
}

export { handle as GET, handle as POST };
