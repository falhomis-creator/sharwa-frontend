import type { MockResult } from "@/lib/bff/mock-route";
import { readBody } from "@/lib/bff/mock-route";
import { hasImageExtension, IMAGE_EXTENSIONS_MESSAGE } from "@/features/organization/schemas";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * An offer is sent as JSON, or as multipart `FormData` when an image is attached
 * (US-13.2.2). The mock turns the file into a data URL; the real server stores it.
 */
export async function readOfferBody(request: Request): Promise<MockResult<Record<string, unknown>>> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("multipart/form-data")) return { ok: true, data: await readBody(request) };
  const form = await request.formData().catch(() => null);
  if (!form) return { ok: false, status: 400, body: { detail: "تعذّر قراءة النموذج." } };
  const data: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (value instanceof File) {
      if (value.size === 0) continue;
      if (!hasImageExtension(value.name)) return { ok: false, status: 400, body: { image: [IMAGE_EXTENSIONS_MESSAGE] } };
      if (value.size > MAX_BYTES) return { ok: false, status: 400, body: { image: ["حجم الصورة أكبر من 5MB."] } };
      const b64 = Buffer.from(await value.arrayBuffer()).toString("base64");
      data[key] = `data:${value.type || "image/png"};base64,${b64}`;
    } else {
      data[key] = value === "true" ? true : value === "false" ? false : value;
    }
  }
  return { ok: true, data };
}
