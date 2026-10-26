import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { attachReceipt } from "@/mocks/storefront/checkout";

/** `POST /api/v1/orders/<public_uuid>/receipt/` (Django, INT-014) multipart `{receipt_image, transfer_amount_reported}` (FR-12.07). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/orders/public/[uuid]/receipt">) {
  const { uuid } = await params;
  return storefrontAdapter(request, `/api/v1/orders/${encodeURIComponent(uuid)}/receipt/`, async ({ store, body }) => {
    const { fields, files } = await body();
    const file = files.receipt_image;
    if (file && (!/\.(jpe?g|png)$/i.test(file.name) || file.size > 5 * 1024 * 1024)) {
      return mockJson({ receipt_image: ["الإيصال: صورة JPEG أو PNG حتى 5MB."] }, { status: 400 });
    }
    return respondMock(attachReceipt(store, uuid, fields, Boolean(file)), 260);
  });
}
