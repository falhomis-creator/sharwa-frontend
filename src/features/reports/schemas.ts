import { z } from "zod";

/** M25 schemas (§5, §7) — Zod on every response (§11 IX). Enum values verbatim, labels Arabic. */
export const REPORT_STATUSES = ["available", "not_yet_available", "coming_soon"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  available: "متاح",
  not_yet_available: "غير متاح بعد",
  coming_soon: "قريباً",
};

export const EXPORT_STATUSES = ["queued", "processing", "ready", "failed", "expired"] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];
export const EXPORT_STATUS_LABELS: Record<ExportStatus, string> = {
  queued: "في الانتظار",
  processing: "قيد التنفيذ",
  ready: "جاهز",
  failed: "فشل",
  expired: "منتهٍ",
};
export const FINAL_EXPORT_STATUSES: readonly ExportStatus[] = ["ready", "failed", "expired"];

export const EXPORT_FORMATS = ["csv", "xlsx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const FREQUENCY_LABELS: Record<Frequency, string> = { daily: "يومي", weekly: "أسبوعي", monthly: "شهري" };
/** «يُرسل كل …» phrasing per frequency. */
export const FREQUENCY_SENTENCE: Record<Frequency, string> = { daily: "يُرسل كل يوم", weekly: "يُرسل كل أسبوع", monthly: "يُرسل كل شهر" };

// ── index ──
export const reportRowSchema = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(REPORT_STATUSES),
  permission: z.string(),
  core: z.boolean().optional().default(false),
  allowed: z.boolean(),
});
export type ReportRow = z.infer<typeof reportRowSchema>;

export const reportIndexSchema = z.array(
  z.object({
    category: z.string(),
    title: z.string(),
    reports: z.array(reportRowSchema),
  }),
);
export type ReportIndex = z.infer<typeof reportIndexSchema>;

// ── report data ──
export const reportMetaSchema = z.object({
  code: z.string(),
  title: z.string(),
  category: z.string(),
  category_title: z.string(),
  description: z.string(),
  status: z.enum(REPORT_STATUSES),
  core: z.boolean(),
  chart: z.enum(["line", "bar"]),
});

export const summaryItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  display_value: z.string(),
  compare_display_value: z.string().nullable(),
  delta_pct: z.number().nullable(),
});
export type SummaryItem = z.infer<typeof summaryItemSchema>;

export const seriesSchema = z.object({
  label: z.string(),
  points: z.array(z.object({ x: z.string(), y: z.number(), display_y: z.string() })),
});
export type Series = z.infer<typeof seriesSchema>;

export const COLUMN_TYPES = ["text", "date", "number", "money", "percent"] as const;
export const columnSchema = z.object({ key: z.string(), label: z.string(), type: z.enum(COLUMN_TYPES) });
export type ReportColumn = z.infer<typeof columnSchema>;
export type ReportTableRow = Record<string, string | number>;

export const reportDataSchema = z.object({
  report: reportMetaSchema,
  has_locations: z.boolean(),
  locations: z.array(z.object({ id: z.number(), name: z.string() })),
  timezone: z.string(),
  refreshed_at: z.string().nullable(),
  range: z.object({ from: z.string(), to: z.string() }).optional(),
  compare: z.object({ from: z.string(), to: z.string() }).nullable().optional(),
  summary: z.array(summaryItemSchema),
  series: z.array(seriesSchema),
  table: z.object({
    columns: z.array(columnSchema),
    rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
    count: z.number(),
  }),
});
export type ReportData = z.infer<typeof reportDataSchema>;

export const refreshSchema = z.object({ refreshed_at: z.string() });

// ── exports ──
export const exportJobSchema = z.object({
  job_id: z.number(),
  report_code: z.string(),
  report_title: z.string(),
  format: z.enum(EXPORT_FORMATS),
  params: z.record(z.string(), z.union([z.string(), z.boolean(), z.null()])),
  status: z.enum(EXPORT_STATUSES),
  download_token: z.string().nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
  expires_at: z.string().nullable(),
  requested_by: z.string(),
});
export type ExportJob = z.infer<typeof exportJobSchema>;
export const exportListSchema = z.object({ count: z.number(), results: z.array(exportJobSchema) });

// ── schedules ──
export const scheduleSchema = z.object({
  id: z.number(),
  report_code: z.string(),
  report_title: z.string(),
  frequency: z.enum(FREQUENCIES),
  email: z.string(),
  is_active: z.boolean(),
  next_run_at: z.string().nullable(),
  created_at: z.string(),
});
export type Schedule = z.infer<typeof scheduleSchema>;
export const scheduleListSchema = z.object({ count: z.number(), results: z.array(scheduleSchema) });

/** The local form (FR-25.08: the email is validated before the request). */
export const scheduleFormSchema = z.object({
  report_code: z.string().min(1, "اختر تقريراً."),
  frequency: z.enum(FREQUENCIES, { error: "اختر التكرار." }),
  email: z.string().trim().min(1, "أدخل البريد المستلم.").regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "أدخل بريداً إلكترونياً صحيحاً."),
});
export type ScheduleForm = z.infer<typeof scheduleFormSchema>;
