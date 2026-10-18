import { canManageCatalog, forbidden, mockRoute, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { uploadImport } from "@/mocks/catalog/import";

/** `POST /api/v1/products/import/` multipart `file` → `{job_id, preview, columns, …}` — stage 1 of 3 (FR-04.13). */
export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return mockJson({ file: ["اختر ملفاً."] }, { status: 400 });
    const text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
    return respond(uploadImport(store, file.name, text));
  });
}
