import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { findVisible, placeBid } from "@/mocks/storefront/catalog";
import { parseCurrency, storeDefaultCurrency } from "@/mocks/storefront/money";
import { verifyOtp } from "@/mocks/storefront/otp";

/** `[NEEDS BACKEND]` `POST …/auction/bids/` `{amount, phone, otp}` → 200 auction / 409 outbid (M10 §7). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/catalog/products/[id]/auction/bids">) {
  const { id } = await params;
  return storefrontAdapter(request, `/api/v1/catalog/products/${id}/auction/bids/`, async ({ store, url, body }) => {
    const { fields } = await body();
    const p = findVisible(store, Number(id));
    if (!p) return mockJson({ detail: "المنتج غير موجود." }, { status: 404 });
    const amount = String(fields.amount ?? "");
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) return mockJson({ amount: ["أدخل مبلغاً صحيحاً."] }, { status: 400 });
    const check = verifyOtp(store, fields.phone, fields.otp, "auction");
    if (!check.ok) return respondMock(check);
    const currency = parseCurrency(url.searchParams.get("currency") ?? fields.currency, storeDefaultCurrency(store));
    return respondMock(placeBid(store, p, amount, currency, { name: typeof fields.bidder_name === "string" ? fields.bidder_name : undefined, phone: String(fields.phone ?? "") }), 220);
  });
}
