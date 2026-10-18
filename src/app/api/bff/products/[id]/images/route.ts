import { canManageCatalog, forbidden, mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { addImages } from "@/mocks/catalog/products";
import { hasImageExtension, IMAGE_EXTENSIONS_MESSAGE } from "@/features/organization/schemas";

/**
 * `POST /api/v1/products/<id>/images/` multipart (`images` files). The mock keeps each file
 * as a data URL in memory so the gallery can render it; Django will return media URLs.
 * The extension rule is enforced here as well as in the browser (FR-04.08).
 */
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request, { params }: RouteContext<"/api/bff/products/[id]/images">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    const form = await request.formData().catch(() => null);
    const files = form ? form.getAll("images").filter((f): f is File => f instanceof File) : [];
    if (files.length === 0) return mockJson({ images: ["اختر صورة واحدة على الأقل."] }, { status: 400 });
    const urls: string[] = [];
    for (const f of files) {
      if (!hasImageExtension(f.name)) return mockJson({ images: [IMAGE_EXTENSIONS_MESSAGE] }, { status: 400 });
      if (f.size > MAX_BYTES) return mockJson({ images: ["حجم الصورة أكبر من 5MB."] }, { status: 400 });
      const b64 = Buffer.from(await f.arrayBuffer()).toString("base64");
      urls.push(`data:${f.type || "image/png"};base64,${b64}`);
    }
    const images = addImages(store, id, urls);
    if (!images) return mockJson({ detail: "المنتج غير موجود." }, { status: 404 });
    return mockJson(images, { status: 201, delay: 200 });
  });
}
