import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { normalizePhone } from "@/lib/format";
import { mockJson } from "@/mocks/runtime";
import { findVisible, placeBid } from "@/mocks/storefront/catalog";
import { parseCurrency, storeDefaultCurrency } from "@/mocks/storefront/money";

const PHONE_RE = /^(9677\d{8}|9665\d{8})$/;

/**
 * `[NEEDS BACKEND]` `POST /api/v1/catalog/products/<id>/bids/` `{bidder_name, bidder_phone, amount}`
 * → 200 auction / 409 outbid or ended (M37 §7). Bidder identity = name + phone, NO WhatsApp
 * OTP (M37 §10 assumption, adopted 2026-10-19 — Phase 7 decision 4).
 */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/catalog/products/[id]/auction/bids">) {
  const { id } = await params;
  return storefrontAdapter(request, `/api/v1/catalog/products/${id}/bids/`, async ({ store, url, body }) => {
    const { fields } = await body();
    const p = findVisible(store, Number(id));
    if (!p) return mockJson({ detail: "المنتج غير موجود." }, { status: 404 });
    const amount = String(fields.amount ?? "");
    const name = typeof fields.bidder_name === "string" ? fields.bidder_name.trim() : "";
    const phone = typeof fields.bidder_phone === "string" && fields.bidder_phone.trim() ? normalizePhone(fields.bidder_phone) : "";
    const errors: Record<string, string[]> = {};
    if (name.length < 2) errors.bidder_name = ["هذا الحقل مطلوب."];
    if (!PHONE_RE.test(phone)) errors.bidder_phone = ["أدخل رقم جوال صحيحاً."];
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) errors.amount = ["أدخل مبلغاً صحيحاً."];
    if (Object.keys(errors).length) return mockJson(errors, { status: 400 });
    const currency = parseCurrency(url.searchParams.get("currency") ?? fields.currency, storeDefaultCurrency(store));
    return respondMock(placeBid(store, p, amount, currency, { name, phone }), 220);
  });
}
