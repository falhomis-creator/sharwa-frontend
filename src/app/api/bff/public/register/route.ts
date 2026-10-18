import { contextFromRequest, forwardResponse } from "@/lib/bff/upstream";
import { fixtureResponse, readJsonBody, tryTarget } from "@/lib/bff/target-adapter";
import { registerMock } from "@/mocks/public/register";
import { isMocksOn, notAvailable } from "@/mocks/runtime";

/**
 * `POST /api/v1/public/register/` `{store_name, merchant_phone, subdomain,
 * interested_categories[], agree_terms}` → `{otp_token, ttl_seconds, masked_phone}` or
 * 400 `{field: [msg]}` — [NEEDS BACKEND] (M02 §7). Django's HTML `POST /register/` keeps
 * the draft in its session and is not called: its form field names are not in discovery.
 */
export async function POST(request: Request) {
  const ctx = contextFromRequest(request);
  const body = await readJsonBody(request);
  const res = await tryTarget(request, "/api/v1/public/register/", ctx, { method: "POST", json: body });
  if (res) return forwardResponse(res);
  return isMocksOn() ? fixtureResponse(registerMock(body)) : notAvailable();
}
