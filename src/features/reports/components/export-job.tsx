"use client";

import { Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { downloadHref, useCreateExport, useExportJob } from "@/features/reports/api";
import { EXPORT_STATUS_LABELS, type ExportJob, type ExportStatus } from "@/features/reports/schemas";
import { longDay } from "@/features/reports/range";

/**
 * One `ReportExportJob` (M25 US-25.3): status as text + dot, polled every 5 s until final;
 * `ready` → download with the temporary token; `failed` → the server's reason + «إعادة
 * المحاولة» (a NEW job); `expired` → download disabled with «انتهت صلاحية الملف — أعد التصدير».
 */
const DOT: Record<ExportStatus, string> = {
  queued: "bg-muted-foreground/60",
  processing: "bg-info",
  ready: "bg-success",
  failed: "bg-destructive",
  expired: "bg-muted-foreground/40",
};

export function ExportStatusText({ status }: { status: ExportStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", status === "failed" && "text-destructive")} data-testid="export-status" data-status={status}>
      <span aria-hidden className={cn("size-2 rounded-full", DOT[status], status === "processing" && "motion-safe:animate-pulse")} />
      {EXPORT_STATUS_LABELS[status]}
    </span>
  );
}

export function rangeText(params: ExportJob["params"]): string {
  const from = typeof params.from === "string" ? params.from : null;
  const to = typeof params.to === "string" ? params.to : null;
  return from && to ? `${longDay(from)} – ${longDay(to)}` : "النطاق الافتراضي";
}

export function useLiveJob(job: ExportJob): ExportJob {
  return useExportJob(job).data ?? job;
}

/** The action cell: download / retry / disabled-expired. */
export function ExportAction({ job, canExport }: { job: ExportJob; canExport: boolean }) {
  const retry = useCreateExport(job.report_code);
  const href = downloadHref(job);
  const doRetry = () =>
    retry.mutate(
      { format: job.format, params: job.params },
      {
        onSuccess: () => toast.success("أُنشئت مهمة تصدير جديدة."),
        onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر إنشاء التصدير."),
      },
    );
  if (job.status === "ready" && href) {
    return (
      <a href={href} download className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-8" data-testid="export-download">
        <Download className="size-4" aria-hidden /> تنزيل <Mono className="text-xs uppercase">{job.format}</Mono>
      </a>
    );
  }
  if (job.status === "failed" || job.status === "expired") {
    return (
      <span className="flex flex-wrap items-center gap-2">
        {job.status === "expired" ? (
          <span title="انتهت صلاحية الملف — أعد التصدير" className="inline-flex">
            <Button variant="outline" disabled className="h-11 lg:h-8" data-testid="export-download-disabled">
              <Download className="size-4" aria-hidden /> تنزيل
            </Button>
          </span>
        ) : null}
        <span title={canExport ? undefined : "تتطلب صلاحية التصدير"} className="inline-flex">
          <Button variant="outline" className="h-11 lg:h-8" onClick={doRetry} disabled={!canExport || retry.isPending} data-testid="export-retry">
            <RotateCcw className="size-4" aria-hidden /> إعادة المحاولة
          </Button>
        </span>
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">يُحدَّث كل 5 ثوانٍ</span>;
}

export function ExportNote({ job }: { job: ExportJob }) {
  if (job.status === "failed" && job.error) return <p className="text-xs text-destructive" data-testid="export-error">{job.error}</p>;
  if (job.status === "expired") return <p className="text-xs text-muted-foreground" data-testid="export-expired">انتهت صلاحية الملف — أعد التصدير</p>;
  if (job.status === "ready" && job.expires_at) return <p className="text-xs text-muted-foreground">صالح حتى {formatDateTime(job.expires_at)}</p>;
  return null;
}

/** A compact line for the «تصديراتي» strip on a report page. */
export function ExportStripLine({ job: seed, canExport }: { job: ExportJob; canExport: boolean }) {
  const job = useLiveJob(seed);
  return (
    <li className="flex flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:justify-between" data-testid="export-line" data-job={job.job_id} data-status={job.status}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <ExportStatusText status={job.status} />
          <Mono className="text-xs uppercase text-muted-foreground">{job.format}</Mono>
          <span className="text-xs text-muted-foreground">{rangeText(job.params)}</span>
        </span>
        <ExportNote job={job} />
      </div>
      <ExportAction job={job} canExport={canExport} />
    </li>
  );
}
