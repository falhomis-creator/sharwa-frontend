import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { CURRENCIES, type Currency } from "@/lib/schemas/money";
import { formulaPreview } from "@/mocks/product-extras/state";

/**
 * `POST /api/v1/products/formula-preview/` `{formula_unit_price, formula_coefficient,
 * formula_fixed_extra, currency?}` → `{price, display_price, expression}` (M37 US-37.4.1,
 * `[NEEDS BACKEND]` — `calculate_formula_unit_price` lives on the model today). The editor
 * shows THIS answer; it never multiplies locally (FR-37.02).
 */
export async function POST(request: Request) {
  return mockRoute(request, async () => {
    const body = await readBody(request);
    const currency = (CURRENCIES as readonly string[]).includes(String(body.currency)) ? (body.currency as Currency) : "SAR";
    return respond(formulaPreview(body, currency), { delay: 120 });
  });
}
