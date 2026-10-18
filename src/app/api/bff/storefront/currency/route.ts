import { jsonResponse } from "@/lib/bff/upstream";
import { CURRENCIES } from "@/lib/schemas/money";
import { CURRENCY_COOKIE } from "@/features/storefront/currency";

/**
 * Local adapter (no Django row): stores the visitor's display-currency PREFERENCE in a
 * cookie so the next server render uses it (M09 FR-09.07). The cart's authoritative
 * currency is pinned separately by `GET /api/v1/cart/?currency=` in the Django session.
 * Set server-side so no client code ever touches `document.cookie` (contract §3).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { currency?: unknown };
  const currency = typeof body.currency === "string" ? body.currency : "";
  if (!(CURRENCIES as readonly string[]).includes(currency)) {
    return jsonResponse({ currency: ["عملة غير مدعومة."] }, { status: 400 });
  }
  return jsonResponse(
    { currency },
    { headers: { "set-cookie": `${CURRENCY_COOKIE}=${currency}; Path=/; Max-Age=31536000; SameSite=Lax` } },
  );
}
