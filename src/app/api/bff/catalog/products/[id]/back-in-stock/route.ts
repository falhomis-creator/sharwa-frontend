import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { findVisible } from "@/mocks/storefront/catalog";
import { normalizeBuyerPhone } from "@/mocks/storefront/otp";

/** `[NEEDS BACKEND]` `POST …/back-in-stock/` `{phone}` — `BackInStockNotification` (M10 §7, E-42). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/catalog/products/[id]/back-in-stock">) {
  const { id } = await params;
  return storefrontAdapter(request, `/api/v1/catalog/products/${id}/back-in-stock/`, async ({ store, body }) => {
    const { fields } = await body();
    if (!findVisible(store, Number(id))) return mockJson({ detail: "المنتج غير موجود." }, { status: 404 });
    if (!normalizeBuyerPhone(fields.phone)) return mockJson({ phone: ["رقم واتساب غير صحيح."] }, { status: 400 });
    return mockJson({ detail: "سنرسل لك رسالة واتساب عند توفّر المنتج." }, { status: 201, delay: 180 });
  });
}
