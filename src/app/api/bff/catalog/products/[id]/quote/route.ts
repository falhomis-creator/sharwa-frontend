import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { findVisible, formulaQuote } from "@/mocks/storefront/catalog";
import { parseCurrency, storeDefaultCurrency } from "@/mocks/storefront/money";

/** `GET …/quote/?value=` → `{display_price}` for formula pricing (M10 US-10.3.2) — Django since INT-012 (unit price × value, as the cart charges). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/catalog/products/[id]/quote">) {
  const { id } = await params;
  return storefrontAdapter(request, `/api/v1/catalog/products/${id}/quote/`, ({ store, url }) => {
    const p = findVisible(store, Number(id));
    const value = Number(url.searchParams.get("value"));
    if (!p) return mockJson({ detail: "المنتج غير موجود." }, { status: 404 });
    if (!Number.isFinite(value) || value <= 0) return mockJson({ value: ["أدخل قيمة أكبر من صفر."] }, { status: 400 });
    const currency = parseCurrency(url.searchParams.get("currency"), storeDefaultCurrency(store));
    const quote = formulaQuote(store, p, value, currency);
    return quote ? mockJson(quote, { delay: 120 }) : mockJson({ detail: "هذا المنتج بسعر ثابت." }, { status: 400 });
  });
}
