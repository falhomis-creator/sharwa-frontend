import { ALLOWED_FORMATS_MESSAGE, LOGO_EXTENSIONS, MAX_IMAGE_BYTES } from "@/features/design/schemas";

/**
 * Local image checks (FR-08.07): `jpg, jpeg, png, webp, gif` only, ≤ 5MB, size shown before
 * any upload. An `svg` is refused here with «الصيغ المسموحة: …» — nothing is sent.
 */
export type ImageCheck = { ok: true; file: File; size: number } | { ok: false; message: string };

export function checkImage(file: File): ImageCheck {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeOk = !file.type || /^image\/(jpe?g|png|webp|gif)$/.test(file.type);
  if (!(LOGO_EXTENSIONS as readonly string[]).includes(ext) || !typeOk) return { ok: false, message: ALLOWED_FORMATS_MESSAGE };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: `الحجم ${formatBytes(file.size)} أكبر من المسموح (5MB).` };
  return { ok: true, file, size: file.size };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("تعذّر قراءة الملف."));
    reader.readAsDataURL(file);
  });
}
