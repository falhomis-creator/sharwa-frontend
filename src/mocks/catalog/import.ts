import type { MockResult } from "@/lib/bff/mock-route";
import { isDecimal } from "@/lib/decimal";
import type { ImportStatus, ImportUpload } from "@/features/products/schemas";
import { createProduct, parseCsv } from "@/mocks/catalog/products";
import { catalog } from "@/mocks/catalog/state";

/**
 * CSV import as a three-stage job (FR-04.13): upload → preview + column mapping → run, with
 * a pollable status. NOTHING is written before `run` (SC-04.5). Rows are validated up front
 * so the preview shows the error of every row.
 */
const KNOWN: Record<string, string> = {
  name: "name",
  الاسم: "name",
  "اسم المنتج": "name",
  name_en: "name_en",
  sku: "sku",
  barcode: "barcode",
  الباركود: "barcode",
  price: "price",
  السعر: "price",
  old_price: "old_price",
  stock: "stock",
  المخزون: "stock",
  category: "category",
  التصنيف: "category",
  description: "description",
  الوصف: "description",
};

function rowError(row: Record<string, string>, mapping: Record<string, string>): string | null {
  const get = (field: string) => {
    const col = Object.entries(mapping).find(([, f]) => f === field)?.[0];
    return col ? (row[col] ?? "").trim() : "";
  };
  if (!get("name")) return "الاسم فارغ";
  const price = get("price");
  if (!price) return "السعر فارغ";
  if (!isDecimal(price)) return `سعر غير صالح «${price}»`;
  const stock = get("stock");
  if (stock && !/^\d+(\.\d{1,3})?$/.test(stock)) return `مخزون غير صالح «${stock}»`;
  return null;
}

export function uploadImport(store: string | null, fileName: string, text: string): MockResult<ImportUpload> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!["csv", "tsv", "txt", "xlsx"].includes(ext)) {
    return { ok: false, status: 400, body: { file: ["الصيغ المسموحة: csv, tsv, txt, xlsx"] } };
  }
  if (ext === "xlsx") {
    return { ok: false, status: 400, body: { file: ["ملفات xlsx يقرؤها الخادم الحقيقي فقط؛ صدّرها CSV للتجربة المحلية."] } };
  }
  if (text.includes("�")) {
    return { ok: false, status: 400, body: { file: ["الملف ليس بترميز UTF-8؛ احفظه بترميز UTF-8 ثم أعد الرفع."] } };
  }
  const table = parseCsv(text);
  if (table.length < 2) return { ok: false, status: 400, body: { file: ["الملف لا يحوي صفوف بيانات."] } };
  const columns = table[0]!.map((c) => c.trim());
  const rows = table.slice(1).map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] ?? ""])));
  const mapping: Record<string, string> = {};
  for (const c of columns) {
    const f = KNOWN[c.toLowerCase()] ?? KNOWN[c];
    if (f) mapping[c] = f;
  }
  const state = catalog(store);
  const id = `imp-${Date.now().toString(36)}-${state.imports.size + 1}`;
  state.imports.set(id, { id, columns, rows, status: "previewed", done: 0, failed: [], mapping, startedAt: 0 });
  const row_errors = rows
    .map((r, i) => ({ row: i + 2, msg: rowError(r, mapping) }))
    .filter((x): x is { row: number; msg: string } => x.msg !== null);
  return {
    ok: true,
    status: 201,
    data: { job_id: id, columns, preview: rows.slice(0, 20), total_rows: rows.length, suggested_mapping: mapping, row_errors },
  };
}

export function runImport(store: string | null, jobId: string, mapping: Record<string, string>): MockResult<ImportStatus> {
  const state = catalog(store);
  const job = state.imports.get(jobId);
  if (!job) return { ok: false, status: 404, body: { detail: "مهمة الاستيراد غير موجودة." } };
  if (job.status === "running" || job.status === "done") return { ok: false, status: 409, body: { detail: "نُفِّذت هذه المهمة مسبقاً." } };
  if (!Object.values(mapping).includes("name") || !Object.values(mapping).includes("price")) {
    return { ok: false, status: 400, body: { mapping: ["طابِق عمودَي الاسم والسعر على الأقل."] } };
  }
  job.mapping = mapping;
  job.status = "running";
  job.startedAt = Date.now();
  return { ok: true, data: { status: "running", done: 0, total: job.rows.length, failed: [] } };
}

/** Progress advances with wall-clock time (≈ 40 rows / 300ms) so the UI can poll it. */
export function importStatus(store: string | null, jobId: string): MockResult<ImportStatus> {
  const state = catalog(store);
  const job = state.imports.get(jobId);
  if (!job) return { ok: false, status: 404, body: { detail: "مهمة الاستيراد غير موجودة." } };
  if (job.status === "running") {
    const target = Math.min(job.rows.length, Math.floor(((Date.now() - job.startedAt) / 300) * 40) + 1);
    const catByName = new Map(state.categories.map((c) => [c.name, c.id]));
    while (job.done < target) {
      const row = job.rows[job.done]!;
      const err = rowError(row, job.mapping);
      if (err) job.failed.push({ row: job.done + 2, msg: err });
      else {
        const body: Record<string, unknown> = { is_available: false };
        for (const [col, field] of Object.entries(job.mapping)) {
          const v = (row[col] ?? "").trim();
          if (field === "category") body.category_id = catByName.get(v) ?? null;
          else body[field] = v;
        }
        if (!body.stock) body.stock = "0";
        const res = createProduct(store, body);
        if (!res.ok) job.failed.push({ row: job.done + 2, msg: Object.values(res.body).flat().join("، ") });
      }
      job.done += 1;
    }
    if (job.done >= job.rows.length) job.status = "done";
  }
  return { ok: true, data: { status: job.status, done: job.done, total: job.rows.length, failed: job.failed } };
}
