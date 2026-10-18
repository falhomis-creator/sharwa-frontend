"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, headerLabel } from "@/components/shared/data-table";
import { formatDateTime } from "@/lib/format";
import { useExports } from "@/features/reports/api";
import type { ExportJob } from "@/features/reports/schemas";
import { ExportAction, ExportNote, ExportStatusText, rangeText, useLiveJob } from "@/features/reports/components/export-job";

/**
 * `/dashboard/reports/exports` — «تصديراتي» (M25 FR-25.07): the last 50 jobs with their
 * statuses; non-final rows poll every 5 s; failed/expired rows retry as a NEW job.
 */
export function ExportsScreen() {
  return (
    <AccessGate feature="reports" permission="reports.export">
      <ExportsBody />
    </AccessGate>
  );
}

/** Cells read the live job (the list row is only the seed of its status query). */
function LiveStatus({ job }: { job: ExportJob }) {
  const live = useLiveJob(job);
  return (
    <span className="flex flex-col gap-0.5" data-testid="export-row-status" data-job={live.job_id} data-status={live.status}>
      <ExportStatusText status={live.status} />
      <ExportNote job={live} />
    </span>
  );
}

function LiveAction({ job }: { job: ExportJob }) {
  return <ExportAction job={useLiveJob(job)} canExport />;
}

function ExportsBody() {
  const query = useExports();
  const columns = useMemo<ColumnDef<ExportJob, unknown>[]>(
    () => [
      {
        id: "report",
        header: headerLabel("التقرير"),
        cell: ({ row }) => (
          <Link href={`/dashboard/reports/${row.original.report_code}`} className="font-medium hover:underline">
            {row.original.report_title}
          </Link>
        ),
      },
      { id: "range", header: headerLabel("النطاق"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{rangeText(row.original.params)}</span> },
      { id: "format", header: headerLabel("الصيغة"), cell: ({ row }) => <Mono className="uppercase">{row.original.format}</Mono> },
      { id: "created_at", header: headerLabel("أُنشئ"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.created_at)}</span> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <LiveStatus job={row.original} /> },
      { id: "action", meta: { srOnlyHeader: true }, header: headerLabel("الإجراء"), cell: ({ row }) => <LiveAction job={row.original} /> },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="تصديراتي"
        description="ملفات التقارير تُجهَّز في الخادم دون تجميد المتصفح؛ رابط التنزيل مؤقت."
        actions={
          <Link href="/dashboard/reports" className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9">
            فهرس التقارير
          </Link>
        }
      />
      <DataTable<ExportJob>
        testId="exports-table"
        caption="آخر 50 مهمة تصدير"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.job_id)}
        total={query.data?.count ?? 0}
        page={1}
        pageSize={50}
        onPageChange={() => undefined}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyState={
          <EmptyState
            title="لا تصديرات بعد"
            description="افتح أي تقرير واضغط «تصدير CSV» أو «تصدير XLSX»؛ ستظهر المهمة هنا بحالتها."
            action={
              <Link href="/dashboard/reports" className="inline-flex h-11 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground lg:h-9">
                فهرس التقارير
              </Link>
            }
          />
        }
        renderMobileCard={(row) => (
          <div className="flex flex-col gap-2 p-3" data-testid="export-card">
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium">{row.report_title}</span>
              <Mono className="text-xs uppercase text-muted-foreground">{row.format}</Mono>
            </span>
            <span className="text-xs text-muted-foreground">
              {rangeText(row.params)} · {formatDateTime(row.created_at)}
            </span>
            <LiveStatus job={row} />
            <LiveAction job={row} />
          </div>
        )}
      />
    </div>
  );
}
