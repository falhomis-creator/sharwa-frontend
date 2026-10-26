import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { addReview, findVisible, listReviews } from "@/mocks/storefront/catalog";
import { verifyOtp } from "@/mocks/storefront/otp";

/**
 * Reviews (M10 §7, M42 §7): `GET …/reviews/?page&rating` → summary + page — Django since INT-012;
 * `POST …/reviews/` `{rating, comment, phone, otp}` → stored for moderation (US-10.6.2) — Django since
 * INT-029 (`ProductReview.is_approved=False` until the merchant approves it in the M07 reviews tab).
 */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/catalog/products/[id]/reviews">) {
  const { id } = await params;
  return storefrontAdapter(request, `/api/v1/catalog/products/${id}/reviews/`, ({ store, url }) => {
    if (!findVisible(store, Number(id))) return mockJson({ detail: "المنتج غير موجود." }, { status: 404 });
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    const rating = Number(url.searchParams.get("rating"));
    return mockJson(listReviews(store, Number(id), page, Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null), { delay: 140 });
  });
}

export async function POST(request: Request, { params }: RouteContext<"/api/bff/catalog/products/[id]/reviews">) {
  const { id } = await params;
  return storefrontAdapter(request, `/api/v1/catalog/products/${id}/reviews/`, async ({ store, body }) => {
    const { fields } = await body();
    if (!findVisible(store, Number(id))) return mockJson({ detail: "المنتج غير موجود." }, { status: 404 });
    const e: Record<string, string[]> = {};
    const rating = Number(fields.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) e.rating = ["اختر تقييماً من 1 إلى 5."];
    const comment = String(fields.comment ?? "").trim();
    if (comment.length < 3) e.comment = ["اكتب تعليقاً قصيراً."];
    if (comment.length > 1000) e.comment = ["التعليق طويل جداً (1000 حرف كحد أقصى)."];
    const check = verifyOtp(store, fields.phone, fields.otp, "review");
    if (!check.ok) return respondMock(check);
    if (Object.keys(e).length) return mockJson(e, { status: 400 });
    addReview(store, Number(id), rating, comment, String(fields.name ?? "").trim() || "عميل");
    return mockJson({ detail: "شكراً، سيظهر تقييمك بعد المراجعة." }, { status: 201, delay: 200 });
  });
}
