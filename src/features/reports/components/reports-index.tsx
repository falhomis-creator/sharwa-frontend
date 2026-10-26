"use client";

import Link from "next/link";
import { parseAsString, useQueryStates } from "nuqs";
import { ChevronRight } from "lucide-react";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBox } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { includesNormalized } from "@/lib/i18n/normalize";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useReportIndex } from "@/features/reports/api";
import { canOpenReport } from "@/features/reports/permissions";
import { REPORT_STATUS_LABELS, type ReportRow } from "@/features/reports/schemas";
import { PushBroadcastCard } from "@/features/pwa/components/push-broadcast";

/**
 * `/dashboard/reports` (M25 US-25.1): the ten categories as vertical sections in registry
 * order, one line per report. Not-yet-available rows stay visible but disabled (FR-25.01);
 * only the permission map hides rows — the server's `allowed` AND the §5 map — with one
 * note saying more exist. The search filters locally over title and code.
 */
export function ReportsIndexScreen() {
  return (
    <AccessGate feature="reports" permission="reports.view">
      <ReportsIndexBody />
    </AccessGate>
  );
}

function ReportsIndexBody() {
  const { session, canPermission } = useAccess();
  const [{ q }, setQuery] = useQueryStates({ q: parseAsString.withDefault("") }, { history: "replace" });
  const index = useReportIndex();
  const subject = { kind: session.kind, features: session.features, permissions: session.staff?.permissions };

  const header = (
    <PageHeader
      title="التقارير"
      description="إجابات رقمية عن مبيعاتك ومخزونك وعملائك — اختر تقريراً، ثم النطاق الزمني."
      actions={
        <>
          {canPermission("reports.export") ? (
            <Link href="/dashboard/reports/exports" className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9" data-testid="link-exports">
              تصديراتي
            </Link>
          ) : null}
          <Link href="/dashboard/reports/scheduled" className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9" data-testid="link-scheduled">
            التقارير المجدولة
          </Link>
        </>
      }
    />
  );

  if (index.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="flex flex-col gap-8" aria-busy>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: 4 }, (_, j) => (
                <Skeleton key={j} className="h-11 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (index.error || !index.data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState error={index.error} onRetry={() => void index.refetch()} />
      </div>
    );
  }

  const visible = (r: ReportRow, category: string) => r.allowed && canOpenReport(subject, r.code, category);
  const hidden = index.data.reduce((n, c) => n + c.reports.filter((r) => !visible(r, c.category)).length, 0);
  const query = q.trim();
  const sections = index.data
    .map((c) => {
      const mine = c.reports.filter((r) => visible(r, c.category));
      const matches = query ? mine.filter((r) => includesNormalized(r.title, query) || r.code.toLowerCase().includes(query.toLowerCase())) : mine;
      return { ...c, reports: matches };
    })
    .filter((c) => c.reports.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <SearchBox value={q} onChange={(v) => void setQuery({ q: v || null })} placeholder="ابحث بعنوان التقرير أو الكود" label="بحث في التقارير" className="md:max-w-sm md:flex-1" delay={120} />
        {hidden > 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="reports-hidden-note" data-hidden={hidden}>
            تقارير إضافية تتطلب صلاحيات
          </p>
        ) : null}
      </div>

      {sections.length === 0 ? (
        <EmptyState title={query ? `لا تقارير تطابق «${query}»` : "لا تقارير متاحة لك"} description={query ? "جرّب كلمة أخرى أو كود التقرير، مثل sales_overview." : "اطلب صلاحية التقارير من مالك المتجر."} />
      ) : (
        <div className="flex flex-col gap-8" data-testid="reports-index">
          {sections.map((c) => (
            <section key={c.category} aria-labelledby={`cat-${c.category}`} className="grid gap-2 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-6" data-testid="report-category" data-category={c.category}>
              <h2 id={`cat-${c.category}`} className="pt-2 text-sm font-medium text-muted-foreground">
                {c.title}
              </h2>
              <ul className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden">
                {c.reports.map((r) => (
                  <li key={r.code}>
                    <ReportLine row={r} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {query ? null : <PushBroadcastCard />}
    </div>
  );
}

function ReportLine({ row }: { row: ReportRow }) {
  const open = row.status === "available";
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-baseline md:gap-3">
        <span className={cn("shrink-0 font-medium", !open && "text-muted-foreground")}>{row.title}</span>
        <span className="truncate text-sm text-muted-foreground">{row.description}</span>
      </span>
      <Mono className="hidden shrink-0 text-xs text-muted-foreground lg:inline">{row.code}</Mono>
      {open ? (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/50" />
          {REPORT_STATUS_LABELS[row.status]}
        </span>
      )}
    </>
  );
  if (open) {
    return (
      <Link href={`/dashboard/reports/${row.code}`} className="flex min-h-11 items-center gap-3 px-3 py-2 hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none" data-testid="report-row" data-code={row.code} data-status={row.status}>
        {body}
      </Link>
    );
  }
  return (
    <div
      role="link"
      aria-disabled="true"
      title={row.status === "coming_soon" ? "هذا التقرير قيد الإعداد وسيُتاح قريباً." : "هذا التقرير غير متاح بعد في متجرك."}
      className="flex min-h-11 cursor-not-allowed items-center gap-3 px-3 py-2 opacity-70"
      data-testid="report-row"
      data-code={row.code}
      data-status={row.status}
    >
      {body}
    </div>
  );
}
