import type { MockResult } from "@/lib/bff/mock-route";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, nextId, storeState } from "@/mocks/store-state";
import { getReportDef } from "@/mocks/reports/registry";

/**
 * `ReportExportJob` (M25 US-25.3, `[NEEDS BACKEND]` — Celery in Django).
 *
 * The mock advances a job on every status read of THAT job (`GET /exports/<id>/`), which
 * is what the UI polls every 5 s: queued → processing → ready. `audit_log` exports fail
 * with a server reason (the «export too large» edge case). A ready job expires after
 * `EXPIRE_AFTER_READS` further reads (so the check script can reach `expired` without
 * waiting 24 h); the UI stops polling at `ready`, so a ready row stays ready on screen.
 * The list (`GET /exports/`) never advances anything.
 */
export const EXPORT_STATUSES = ["queued", "processing", "ready", "failed", "expired"] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];
export const EXPORT_FORMATS = ["csv", "xlsx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

const EXPIRE_AFTER_READS = 3;
const FAILING_CODE = "audit_log";
const FAIL_REASON = "تجاوز التصدير حد الخادم (100,000 صف). قسّم النطاق إلى فترات أقصر وأعد المحاولة.";

export interface MockExportJob {
  id: number;
  report_code: string;
  format: ExportFormat;
  params: Record<string, string | boolean | null>;
  status: ExportStatus;
  download_token: string | null;
  error: string | null;
  created_at: string;
  expires_at: string | null;
  reads: number;
  ready_reads: number;
  requested_by: string;
}

function token(id: number): string {
  return `dl_${((id * 2654435761) >>> 0).toString(36)}${(id * 97).toString(36)}`;
}

function seed(store: string | null): MockExportJob[] {
  if (isEmptyStore(store)) return [];
  const at = (h: number) => new Date(FIXTURE_NOW - h * 3_600_000).toISOString();
  const job = (id: number, code: string, format: ExportFormat, status: ExportStatus, hoursAgo: number, from: string, to: string): MockExportJob => ({
    id,
    report_code: code,
    format,
    params: { from, to, compare: false, location: null },
    status,
    download_token: status === "ready" ? token(id) : null,
    error: status === "failed" ? FAIL_REASON : null,
    created_at: at(hoursAgo),
    expires_at: status === "ready" || status === "expired" ? at(hoursAgo - 24) : null,
    reads: status === "processing" ? 1 : 2,
    ready_reads: 0,
    requested_by: "مالك المتجر",
  });
  return [
    job(904, "best_sellers", "xlsx", "processing", 0.05, "2026-09-18", "2026-10-17"),
    job(903, "sales_overview", "csv", "ready", 2, "2026-09-01", "2026-09-30"),
    job(902, "audit_log", "csv", "failed", 26, "2025-10-01", "2026-09-30"),
    job(901, "orders", "xlsx", "expired", 52, "2026-08-01", "2026-08-31"),
  ];
}

function jobs(store: string | null): MockExportJob[] {
  return storeState(store, "reports:exports", () => seed(store));
}

export function exportView(j: MockExportJob) {
  const def = getReportDef(j.report_code);
  return {
    job_id: j.id,
    report_code: j.report_code,
    report_title: def?.title ?? j.report_code,
    format: j.format,
    params: j.params,
    status: j.status,
    download_token: j.status === "ready" ? j.download_token : null,
    error: j.error,
    created_at: j.created_at,
    expires_at: j.expires_at,
    requested_by: j.requested_by,
  };
}

export function listExports(store: string | null) {
  const all = jobs(store).slice().sort((a, b) => b.id - a.id).slice(0, 50);
  return { count: all.length, results: all.map(exportView) };
}

export function createExport(store: string | null, code: string, body: Record<string, unknown>, actor: string): MockResult<ReturnType<typeof exportView>> {
  const def = getReportDef(code);
  if (!def) return { ok: false, status: 404, body: { detail: "التقرير غير موجود." } };
  if (def.status !== "available") return { ok: false, status: 400, body: { detail: "هذا التقرير غير متاح بعد للتصدير." } };
  const format = body.format;
  if (format !== "csv" && format !== "xlsx") return { ok: false, status: 400, body: { format: ["اختر CSV أو XLSX."] } };
  const raw = body.params && typeof body.params === "object" ? (body.params as Record<string, unknown>) : {};
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const id = nextId(store, "report-export", 904);
  const j: MockExportJob = {
    id,
    report_code: code,
    format,
    params: { from: str(raw.from), to: str(raw.to), compare: raw.compare === true, location: str(raw.location) },
    status: "queued",
    download_token: null,
    error: null,
    created_at: new Date(Math.max(Date.now(), FIXTURE_NOW)).toISOString(),
    expires_at: null,
    reads: 0,
    ready_reads: 0,
    requested_by: actor,
  };
  jobs(store).push(j);
  return { ok: true, status: 201, data: exportView(j) };
}

function find(store: string | null, id: number) {
  return jobs(store).find((j) => j.id === id);
}

/** One status read — advances the job (see the file comment). */
export function readExport(store: string | null, id: number): MockResult<ReturnType<typeof exportView>> {
  const j = find(store, id);
  if (!j) return { ok: false, status: 404, body: { detail: "مهمة التصدير غير موجودة." } };
  if (j.status === "queued" || j.status === "processing") {
    j.reads += 1;
    if (j.reads === 1) j.status = "processing";
    else if (j.reads >= 2) {
      if (j.report_code === FAILING_CODE) {
        j.status = "failed";
        j.error = FAIL_REASON;
      } else {
        j.status = "ready";
        j.download_token = token(j.id);
        j.expires_at = new Date(Date.parse(j.created_at) + 24 * 3_600_000).toISOString();
      }
    }
  } else if (j.status === "ready") {
    j.ready_reads += 1;
    if (j.ready_reads > EXPIRE_AFTER_READS) {
      j.status = "expired";
      j.download_token = null;
    }
  }
  return { ok: true, data: exportView(j) };
}

export function downloadExport(store: string | null, id: number, tok: string | null): MockResult<MockExportJob> {
  const j = find(store, id);
  if (!j) return { ok: false, status: 404, body: { detail: "مهمة التصدير غير موجودة." } };
  if (j.status === "expired") return { ok: false, status: 410, body: { detail: "انتهت صلاحية الملف — أعد التصدير." } };
  if (j.status !== "ready") return { ok: false, status: 409, body: { detail: "الملف ليس جاهزاً بعد." } };
  if (!tok || tok !== j.download_token) return { ok: false, status: 403, body: { detail: "رمز التنزيل غير صالح." } };
  return { ok: true, data: j };
}

export function getExport(store: string | null, id: number) {
  return find(store, id);
}
