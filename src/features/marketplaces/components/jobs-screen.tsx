"use client";

import { useMemo, useState } from "react";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, FilterBar, FilterSelect, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useJob, useJobs, useMarketHub, useTriggerJob } from "@/features/marketplaces/api";
import { JOB_STATUSES, JOB_STATUS_LABELS, JOB_TYPES, JOB_TYPE_LABELS, MARKETS, MARKET_LABELS, type Job, type JobStatus, type JobType, type Market } from "@/features/marketplaces/schemas";
import { JobStatusText, MarketplacesGate, MarketplacesNav, formatDuration } from "@/features/marketplaces/components/bits";

/**
 * `/dashboard/channels/marketplaces/jobs[?job=<id>]` (US-28.4, FR-28.06/07): the log with
 * 8 types × 5 statuses, filters in the URL, live rows polled every 10s, the detail in a
 * side sheet (spec §6 `/jobs/[id]` → `?job=` keeps the route tree shallow), manual runs.
 */
const parsers = {
  market: parseAsStringLiteral(MARKETS),
  job_type: parseAsStringLiteral(JOB_TYPES),
  status: parseAsStringLiteral(JOB_STATUSES),
  triggered_by: parseAsStringLiteral(["system", "user"] as const),
  job: parseAsInteger,
};
const PAGE_SIZE = 20;

export function MarketJobsScreen() {
  return (
    <MarketplacesGate>
      <JobsInner />
    </MarketplacesGate>
  );
}

function JobsInner() {
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const [now] = useState(() => new Date());
  const hub = useMarketHub();
  const trigger = useTriggerJob();
  const query = useJobs({ market: f.market ?? undefined, job_type: f.job_type ?? undefined, status: f.status ?? undefined, triggered_by: f.triggered_by ?? undefined, page: table.page > 1 ? table.page : undefined });
  const set = (p: Parameters<typeof setF>[0]) => {
    void setF(p);
    table.resetPage();
  };
  const connected = (m: Market) => hub.data?.find((x) => x.marketplace === m)?.connected ?? false;

  const run = async (market: Market, job_type: "order_pull" | "fba_inventory") => {
    try {
      const r = await trigger.mutateAsync({ market, job_type });
      toast.success(`بدأت المهمة #${r.job_id}`);
      void setF({ job: r.job_id });
    } catch (e) {
      toast.error(isApiError(e) ? e.userMessage : "تعذّر تشغيل المهمة");
    }
  };

  const columns = useMemo<ColumnDef<Job, unknown>[]>(
    () => [
      {
        id: "id",
        header: headerLabel("المهمة"),
        cell: ({ row }) => (
          <button type="button" className="min-h-11 hover:underline lg:min-h-8" onClick={() => void setF({ job: row.original.id })} data-testid="job-open">
            <Mono>#{row.original.id}</Mono>
          </button>
        ),
      },
      { id: "type", header: headerLabel("النوع"), cell: ({ row }) => <span className="whitespace-nowrap">{JOB_TYPE_LABELS[row.original.job_type]}</span> },
      { id: "market", header: headerLabel("السوق"), cell: ({ row }) => <span className="text-muted-foreground">{MARKET_LABELS[row.original.marketplace]}</span> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <JobStatusText status={row.original.status} /> },
      { id: "by", header: headerLabel("المُطلِق"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.triggered_by}</span> },
      { id: "dur", meta: { numeric: true }, header: headerLabel("المدة"), cell: ({ row }) => <Mono className="text-muted-foreground">{formatDuration(row.original.duration_seconds)}</Mono> },
      {
        id: "result",
        meta: { numeric: true },
        header: headerLabel("ناجح / فاشل"),
        cell: ({ row }) => (
          <Mono>
            {row.original.success_count} / <span className={row.original.error_count ? "text-destructive" : undefined}>{row.original.error_count}</span>
          </Mono>
        ),
      },
      { id: "at", header: headerLabel("الوقت"), cell: ({ row }) => <time dateTime={row.original.created_at} title={formatDateTime(row.original.created_at)} className="whitespace-nowrap text-xs text-muted-foreground">{formatRelative(row.original.created_at, now)}</time> },
    ],
    [now, setF],
  );

  const activeCount = [f.market, f.job_type, f.status, f.triggered_by].filter(Boolean).length;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مهام المزامنة"
        description="كل ما يتبادله المتجر مع الأسواق: دفع، أسعار، مخزون، طلبات."
        actions={
          <>
            {MARKETS.map((m) => (
              <Button key={m} variant="outline" className="h-11 lg:h-9" disabled={!connected(m) || trigger.isPending} onClick={() => void run(m, "order_pull")} data-testid={`pull-${m}`}>
                سحب طلبات {MARKET_LABELS[m]} الآن
              </Button>
            ))}
            <Button variant="outline" className="h-11 lg:h-9" disabled={!connected("amazon") || trigger.isPending} onClick={() => void run("amazon", "fba_inventory")} data-testid="fba-refresh">
              تحديث مخزون FBA
            </Button>
          </>
        }
      />
      <MarketplacesNav active="jobs" />
      <DataTable<Job>
        testId="jobs-table"
        caption="مهام المزامنة"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={PAGE_SIZE}
        onPageChange={table.setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={Boolean(activeCount)}
        onRowOpen={(r) => void setF({ job: r.id })}
        emptyState={<EmptyState title="لا مهام بعد" />}
        renderMobileCard={(j) => (
          <button type="button" className="flex w-full flex-col gap-1 p-3 text-start text-sm" onClick={() => void setF({ job: j.id })}>
            <span className="flex justify-between gap-2">
              <span>
                {JOB_TYPE_LABELS[j.job_type]} <Mono className="text-muted-foreground">#{j.id}</Mono>
              </span>
              <JobStatusText status={j.status} />
            </span>
            <span className="text-xs text-muted-foreground">
              {MARKET_LABELS[j.marketplace]} · {j.triggered_by}
            </span>
          </button>
        )}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={() => set({ market: null, job_type: null, status: null, triggered_by: null })}>
            <FilterSelect label="السوق" value={f.market ?? ""} onChange={(v) => set({ market: (v || null) as Market | null })} options={MARKETS.map((m) => ({ value: m, label: MARKET_LABELS[m] }))} />
            <FilterSelect label="النوع" value={f.job_type ?? ""} onChange={(v) => set({ job_type: (v || null) as JobType | null })} options={JOB_TYPES.map((t) => ({ value: t, label: JOB_TYPE_LABELS[t] }))} testId="filter-job-type" />
            <FilterSelect label="الحالة" value={f.status ?? ""} onChange={(v) => set({ status: (v || null) as JobStatus | null })} options={JOB_STATUSES.map((s) => ({ value: s, label: JOB_STATUS_LABELS[s] }))} testId="filter-job-status" />
            <FilterSelect label="المُطلِق" value={f.triggered_by ?? ""} onChange={(v) => set({ triggered_by: (v || null) as "system" | "user" | null })} options={[{ value: "system", label: "النظام" }, { value: "user", label: "مستخدم" }]} />
          </FilterBar>
        }
      />
      <JobSheet id={f.job} onClose={() => void setF({ job: null })} />
    </div>
  );
}

function JobSheet({ id, onClose }: { id: number | null; onClose: () => void }) {
  const q = useJob(id);
  const j = q.data;
  return (
    <Sheet open={id !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md" data-testid="job-sheet">
        <div className="flex flex-col gap-1 border-b border-border p-4">
          <SheetTitle>
            المهمة <Mono>#{id}</Mono>
          </SheetTitle>
          <SheetDescription>{j ? `${JOB_TYPE_LABELS[j.job_type]} · ${MARKET_LABELS[j.marketplace]}` : " "}</SheetDescription>
        </div>
        {!j ? (
          <Skeleton className="m-4 h-40" />
        ) : (
          <div className="flex flex-col gap-4 p-4 text-sm">
            <JobStatusText status={j.status} />
            <dl className="grid grid-cols-2 gap-3">
              {[
                ["الناجح", <Mono key="s">{j.success_count}</Mono>],
                ["الفاشل", <Mono key="e" className={j.error_count ? "text-destructive" : undefined}>{j.error_count}</Mono>],
                ["الإجمالي", <Mono key="t">{j.total}</Mono>],
                ["المدة", <Mono key="d">{formatDuration(j.duration_seconds)}</Mono>],
                ["المُطلِق", j.triggered_by],
                ["البدء", j.started_at ? <Mono key="b">{formatDateTime(j.started_at)}</Mono> : "—"],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex flex-col gap-0.5 border-b border-border pb-2">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {j.summary ? (
              <p className="text-sm" dir="ltr">
                {j.summary}
              </p>
            ) : null}
            {j.status === "running" ? <p className="text-xs text-muted-foreground">تُحدَّث كل 10 ثوانٍ حتى تنتهي.</p> : null}
            {j.error_count && (j.status === "completed_with_errors" || j.status === "failed") ? (
              j.errors_csv_url ? (
                <a href={j.errors_csv_url} download className={cn(buttonVariants({ variant: "outline" }), "h-11 self-start lg:h-9")} data-testid="job-errors-csv">
                  تنزيل أخطاء CSV
                </a>
              ) : (
                <span className="flex flex-col gap-1">
                  <Button variant="outline" disabled className="h-11 self-start lg:h-9">
                    تنزيل أخطاء CSV
                  </Button>
                  <span className="text-xs text-muted-foreground">انتهت صلاحية ملف الأخطاء.</span>
                </span>
              )
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
