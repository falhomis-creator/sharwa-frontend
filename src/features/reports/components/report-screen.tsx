"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { parseAsBoolean, parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, FileDown, RefreshCw, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessGate, ForbiddenState } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { inputClass } from "@/components/shared/field";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useCreateExport, useExports, useRefreshToday, useReport, useReportIndex } from "@/features/reports/api";
import { canExportReport } from "@/features/reports/permissions";
import {
  PRESETS,
  PRESET_LABELS,
  RANGE_PROBLEM_TEXT,
  longDay,
  presetOf,
  presetRange,
  previousPeriod,
  rangeProblem,
  todayIso,
  type Preset,
} from "@/features/reports/range";
import type { ExportFormat, ReportColumn, ReportData, ReportTableRow, SummaryItem } from "@/features/reports/schemas";
import { ReportChart } from "@/features/reports/components/report-chart";
import { ExportStripLine } from "@/features/reports/components/export-job";

/**
 * `/dashboard/reports/[code]` (M25 US-25.2/25.3/25.5). Control bar (range presets, compare,
 * location only with `has_locations`) → one text summary row (first number 32px, the rest
 * 20px, Mono, delta as coloured text) → ONE chart → a sortable table. Every control lives
 * in the URL (`from,to,compare,location` — FR-25.03), so a copied link reproduces the
 * screen (SC-25.5). Keyboard: D today · W 7 days · M 30 days · C compare · E export CSV.
 */
const reportUrlParsers = {
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  compare: parseAsBoolean.withDefault(false),
  location: parseAsInteger,
};

/** Above this many rows the table sorts and pages on the server (FR-25.10). */
const LOCAL_SORT_LIMIT = 1000;

export function ReportScreen({ code }: { code: string }) {
  return (
    <AccessGate feature="reports" permission="reports.view">
      <ReportBody code={code} />
    </AccessGate>
  );
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
}

function ReportBody({ code }: { code: string }) {
  const { session } = useAccess();
  const [url, setUrl] = useQueryStates(reportUrlParsers, { history: "replace" });
  const table = useTableUrlState();
  const today = todayIso();
  const fallback = presetRange("30d", today);
  const from = url.from || fallback.from;
  const to = url.to || fallback.to;
  const preset = url.from || url.to ? presetOf(from, to, today) : "30d";
  const problem = rangeProblem(from, to);
  const compareRange = url.compare && !problem ? previousPeriod(from, to) : null;

  const index = useReportIndex();
  const indexRow = index.data?.flatMap((c) => c.reports.map((r) => ({ ...r, category: c.category }))).find((r) => r.code === code);

  const [serverSort, setServerSort] = useState(false);
  const params = {
    from,
    to,
    compare_from: compareRange?.from,
    compare_to: compareRange?.to,
    location: url.location ?? undefined,
    ordering: serverSort ? table.ordering || undefined : undefined,
    page: serverSort ? table.page : undefined,
  };
  const query = useReport(code, params, { enabled: !problem });
  const data = query.data;

  // Render-time adjustment (no effect): once the server says the table is larger than one
  // page, sorting and paging move to the server (FR-25.10).
  const needsServer = data ? data.table.count > data.table.rows.length || data.table.count > LOCAL_SORT_LIMIT : false;
  if (data && needsServer !== serverSort) setServerSort(needsServer);

  // multi_location off → the location param leaves the URL (§8).
  const dropLocation = Boolean(data && !data.has_locations && url.location !== null);
  useEffect(() => {
    if (dropLocation) void setUrl({ location: null });
  }, [dropLocation, setUrl]);

  const category = data?.report.category ?? indexRow?.category ?? "";
  const subject = { kind: session.kind, features: session.features, permissions: session.staff?.permissions };
  const canExport = canExportReport(subject, code, category);
  const exportsAllowed = session.kind === "merchant" || (session.staff?.permissions ?? []).includes("reports.export");

  const createExport = useCreateExport(code);
  const runExport = (format: ExportFormat) => {
    if (!canExport || createExport.isPending) return;
    createExport.mutate(
      { format, params: { from, to, compare: url.compare, location: url.location !== null ? String(url.location) : null } },
      {
        onSuccess: () => toast.success("بدأ التصدير — تابعه في «تصديراتي»."),
        onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر بدء التصدير."),
      },
    );
  };

  const setPreset = (p: Exclude<Preset, "custom">) => {
    const r = presetRange(p, todayIso());
    void setUrl({ from: r.from, to: r.to });
    table.resetPage();
  };
  const setRange = (patch: { from?: string; to?: string }) => {
    void setUrl({ from: patch.from ?? from, to: patch.to ?? to });
    table.resetPage();
  };
  const toggleCompare = () => void setUrl({ compare: url.compare ? null : true });

  // D / W / M / C / E (§6).
  const unavailable = data ? data.report.status !== "available" : false;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || document.querySelector("[role=dialog]")) return;
      const k = e.key.toLowerCase();
      const map: Record<string, () => void> = {
        d: () => setPreset("today"),
        w: () => setPreset("7d"),
        m: () => setPreset("30d"),
        c: toggleCompare,
        e: () => runExport("csv"),
      };
      const fn = map[k];
      if (!fn || unavailable) return;
      e.preventDefault();
      fn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Full-page states ──
  if (query.error && isApiError(query.error) && query.error.status === 403) {
    const body = query.error.body as { report_title?: unknown } | undefined;
    const title = typeof body?.report_title === "string" ? body.report_title : (indexRow?.title ?? "هذا التقرير");
    return <ForbiddenState title={`ليست لديك صلاحية لعرض «${title}»`} description="اطلب صلاحية هذا التقرير من مالك المتجر." />;
  }
  if (query.error && isApiError(query.error) && query.error.status === 404) {
    return <EmptyState title="التقرير غير موجود" description="ربما تغيّر الرابط. اختر تقريراً من الفهرس." action={<IndexLink />} />;
  }
  if (data && data.report.status !== "available") {
    return (
      <div className="flex flex-col gap-6" data-testid="report-unavailable">
        <PageHeader title={data.report.title} eyebrow={data.report.code} description={data.report.description} />
        <EmptyState
          title={data.report.status === "coming_soon" ? "هذا التقرير قريباً" : "هذا التقرير غير متاح بعد"}
          description="نعمل على إتاحته في متجرك؛ ستجده في الفهرس فور توفره."
          action={<IndexLink />}
        />
      </div>
    );
  }

  const title = data?.report.title ?? indexRow?.title ?? "";
  const showLocation = Boolean(data?.has_locations);
  const controls = (
    <ControlBar
      preset={preset}
      from={from}
      to={to}
      compare={url.compare}
      location={url.location}
      locations={showLocation ? (data?.locations ?? []) : null}
      timezone={data?.timezone}
      onPreset={setPreset}
      onRange={setRange}
      onCompare={toggleCompare}
      onLocation={(id) => {
        void setUrl({ location: id });
        table.resetPage();
      }}
    />
  );

  return (
    <div className="flex flex-col gap-6" data-testid="report-screen" data-code={code}>
      <PageHeader
        title={title || " "}
        eyebrow={code}
        description={data ? `${data.report.category_title} · ${data.report.description}` : undefined}
        actions={
          <>
            {data?.report.core ? <RefreshToday code={code} refreshedAt={data.refreshed_at} /> : null}
            <ExportButtons canExport={canExport} pending={createExport.isPending} onExport={runExport} />
          </>
        }
      />

      {/* Control bar: inline from md, a bottom drawer on phones (§6). */}
      <div className="hidden md:block">{controls}</div>
      <MobileControls preset={preset} from={from} to={to} compare={url.compare}>
        {controls}
      </MobileControls>

      {problem ? (
        <p role="alert" className="text-sm text-destructive" data-testid="range-problem">
          {RANGE_PROBLEM_TEXT[problem]}
        </p>
      ) : query.isLoading || !data ? (
        query.error ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <ReportSkeleton />
        )
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : data.table.count === 0 && data.series.length === 0 ? (
        <EmptyState
          title="لا بيانات في هذا النطاق — جرّب 30 يوماً"
          description={`${longDay(from)} – ${longDay(to)}`}
          action={
            <Button variant="outline" className="h-11 lg:h-9" onClick={() => setPreset("30d")} data-testid="try-30d">
              آخر 30 يوماً
            </Button>
          }
        />
      ) : (
        <div className={cn("flex flex-col gap-8", query.isFetching && "opacity-70 transition-opacity")}>
          <SummaryRow items={data.summary} compare={url.compare} />
          <ReportChart kind={data.report.chart} series={data.series} title={`${title}: ${longDay(from)} – ${longDay(to)}`} />
          <ReportTable data={data} table={table} serverSort={serverSort} isFetching={query.isFetching} />
        </div>
      )}

      {exportsAllowed ? <ExportStrip code={code} canExport={canExport} /> : null}
    </div>
  );
}

function IndexLink() {
  return (
    <Link href="/dashboard/reports" className="inline-flex h-11 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9">
      فهرس التقارير <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
    </Link>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy data-testid="report-skeleton">
      <div className="flex flex-col gap-4 md:flex-row md:gap-10">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-[200px] w-full md:h-[280px]" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────── controls ─────────────────────────────

function ControlBar({
  preset,
  from,
  to,
  compare,
  location,
  locations,
  timezone,
  onPreset,
  onRange,
  onCompare,
  onLocation,
}: {
  preset: Preset;
  from: string;
  to: string;
  compare: boolean;
  location: number | null;
  locations: Array<{ id: number; name: string }> | null;
  timezone?: string;
  onPreset: (p: Exclude<Preset, "custom">) => void;
  onRange: (patch: { from?: string; to?: string }) => void;
  onCompare: () => void;
  onLocation: (id: number | null) => void;
}) {
  const [custom, setCustom] = useState(false);
  const showDates = custom || preset === "custom";
  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-x-4" data-testid="report-controls">
      <div role="group" aria-label="النطاق الزمني" title={timezone ? `المنطقة الزمنية: ${timezone}` : undefined} className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={p === "custom" ? showDates : preset === p && !custom}
            onClick={() => {
              if (p === "custom") setCustom(true);
              else {
                setCustom(false);
                onPreset(p);
              }
            }}
            className="h-11 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground aria-pressed:border-cta aria-pressed:bg-accent aria-pressed:text-accent-foreground lg:h-8"
            data-testid={`preset-${p}`}
          >
            {PRESET_LABELS[p]}
            {p === "today" ? <Kbd>D</Kbd> : p === "7d" ? <Kbd>W</Kbd> : p === "30d" ? <Kbd>M</Kbd> : null}
          </button>
        ))}
      </div>
      {showDates ? (
        <div className="flex items-center gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 md:flex-none">
            <span className="text-xs text-muted-foreground">من</span>
            <input type="date" dir="ltr" value={from} max={to} onChange={(e) => onRange({ from: e.target.value })} className={cn(inputClass, "font-mono md:w-36")} data-testid="range-from" />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 md:flex-none">
            <span className="text-xs text-muted-foreground">إلى</span>
            <input type="date" dir="ltr" value={to} min={from} onChange={(e) => onRange({ to: e.target.value })} className={cn(inputClass, "font-mono md:w-36")} data-testid="range-to" />
          </label>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground" data-testid="range-label">
          {longDay(from)} – {longDay(to)}
        </span>
      )}
      <button
        type="button"
        aria-pressed={compare}
        onClick={onCompare}
        className="h-11 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground aria-pressed:border-cta aria-pressed:bg-accent aria-pressed:text-accent-foreground lg:h-8"
        data-testid="compare-toggle"
      >
        مقارنة بالفترة السابقة <Kbd>C</Kbd>
      </button>
      {locations ? (
        <label className="flex flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
          <span className="text-xs text-muted-foreground">الموقع</span>
          <NativeSelect
            value={location === null ? "" : String(location)}
            onChange={(e) => onLocation(e.target.value ? Number(e.target.value) : null)}
            className="h-11 md:h-8 md:w-auto md:min-w-36"
            data-testid="location-select"
          >
            <option value="">كل المواقع</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </NativeSelect>
        </label>
      ) : null}
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="ms-1.5 hidden rounded border border-border px-1 font-mono text-[10px] text-muted-foreground lg:inline" dir="ltr">
      {children}
    </kbd>
  );
}

function MobileControls({ preset, from, to, compare, children }: { preset: Preset; from: string; to: string; compare: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button type="button" onClick={() => setOpen(true)} className="flex h-11 w-full items-center gap-2 rounded-lg border border-border px-3 text-start text-sm" data-testid="mobile-controls">
        <SlidersHorizontal className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {preset === "custom" ? `${longDay(from)} – ${longDay(to)}` : PRESET_LABELS[preset]}
          {compare ? " · مقارنة" : ""}
        </span>
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>النطاق والمقارنة</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto p-4">{children}</div>
          <DrawerFooter>
            <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-lg bg-primary text-sm text-primary-foreground">
              عرض التقرير
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

// ───────────────────────────── header actions ─────────────────────────────

function RefreshToday({ code, refreshedAt }: { code: string; refreshedAt: string | null }) {
  const refresh = useRefreshToday(code);
  const at = refresh.data?.refreshed_at ?? refreshedAt;
  return (
    <span className="flex flex-wrap items-center gap-2">
      {at ? (
        <span className="text-xs text-muted-foreground" data-testid="refreshed-at">
          آخر تحديث: {formatDateTime(at)}
        </span>
      ) : null}
      <Button
        variant="outline"
        className="h-11 lg:h-9"
        disabled={refresh.isPending}
        onClick={() =>
          refresh.mutate(undefined, {
            onSuccess: () => toast.success("حُدِّثت بيانات اليوم."),
            onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر التحديث."),
          })
        }
        data-testid="refresh-today"
      >
        <RefreshCw className={cn("size-4", refresh.isPending && "motion-safe:animate-spin")} aria-hidden />
        تحديث بيانات اليوم
      </Button>
    </span>
  );
}

function ExportButtons({ canExport, pending, onExport }: { canExport: boolean; pending: boolean; onExport: (f: ExportFormat) => void }) {
  const reason = canExport ? undefined : "التصدير يتطلب صلاحية «تصدير التقارير».";
  return (
    <span className="flex gap-2" title={reason}>
      {(["csv", "xlsx"] as const).map((f) => (
        <Button key={f} variant="outline" className="h-11 lg:h-9" disabled={!canExport || pending} onClick={() => onExport(f)} data-testid={`export-${f}`}>
          <FileDown className="size-4" aria-hidden />
          تصدير <Mono className="uppercase">{f}</Mono>
          {f === "csv" ? <Kbd>E</Kbd> : null}
        </Button>
      ))}
    </span>
  );
}

// ───────────────────────────── summary ─────────────────────────────

function Delta({ item }: { item: SummaryItem }) {
  if (item.delta_pct === null) {
    return (
      <span className="text-sm text-muted-foreground" data-testid="delta" data-delta="none">
        —
      </span>
    );
  }
  const d = item.delta_pct;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <Mono className={cn(d > 0 ? "text-success" : d < 0 ? "text-destructive" : "text-muted-foreground")} data-testid="delta" data-delta={d}>
        {d > 0 ? "+" : ""}
        {d.toFixed(1)}%
      </Mono>
      {item.compare_display_value ? (
        <span className="text-xs text-muted-foreground">
          مقابل <Mono>{item.compare_display_value}</Mono>
        </span>
      ) : null}
    </span>
  );
}

function SummaryRow({ items, compare }: { items: SummaryItem[]; compare: boolean }) {
  return (
    <dl className="flex flex-col gap-5 md:flex-row md:flex-wrap md:items-end md:gap-x-12" data-testid="report-summary">
      {items.map((item, i) => (
        <div key={item.key} className="flex flex-col gap-1" data-testid="summary-item">
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="flex flex-col gap-1">
            <Mono className={cn("font-medium tabular-nums leading-none", i === 0 ? "text-[32px]" : "text-xl")} data-testid={i === 0 ? "summary-primary" : undefined}>
              {item.display_value}
            </Mono>
            {compare ? <Delta item={item} /> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ───────────────────────────── table ─────────────────────────────

function cellSortValue(row: ReportTableRow, key: string): string | number {
  return row[`${key}__value`] ?? row[key] ?? "";
}

function renderCell(col: ReportColumn, row: ReportTableRow) {
  const v = row[col.key];
  if (col.type === "date") return <span className="whitespace-nowrap">{typeof v === "string" ? longDay(v) : ""}</span>;
  if (col.type === "text") return <span>{String(v ?? "")}</span>;
  if (col.type === "number") return <Mono>{typeof v === "number" ? formatNumber(v, 1) : String(v ?? "")}</Mono>;
  return <Mono>{String(v ?? "—")}</Mono>;
}

function ReportTable({
  data,
  table,
  serverSort,
  isFetching,
}: {
  data: ReportData;
  table: ReturnType<typeof useTableUrlState>;
  serverSort: boolean;
  isFetching: boolean;
}) {
  const cols = data.table.columns;
  const columns = useMemo<ColumnDef<ReportTableRow, unknown>[]>(
    () =>
      cols.map((c) => ({
        id: c.key,
        meta: { numeric: c.type === "number" || c.type === "money" || c.type === "percent", sortKey: c.key },
        header: headerLabel(c.label),
        cell: ({ row }) => renderCell(c, row.original),
      })),
    [cols],
  );

  const sorted = useMemo(() => {
    if (serverSort || !table.ordering) return data.table.rows;
    const desc = table.ordering.startsWith("-");
    const key = table.ordering.replace(/^-/, "");
    return [...data.table.rows].sort((a, b) => {
      const av = cellSortValue(a, key);
      const bv = cellSortValue(b, key);
      const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "ar");
      return desc ? -c : c;
    });
  }, [data.table.rows, table.ordering, serverSort]);

  const pageRows = serverSort ? sorted : sorted.slice((table.page - 1) * table.pageSize, table.page * table.pageSize);
  const first = cols[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 md:hidden">
        <span className="text-sm text-muted-foreground">التفاصيل</span>
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">ترتيب</span>
          <NativeSelect value={table.ordering} onChange={(e) => table.setOrdering(e.target.value)} className="h-11 w-auto min-w-36" data-testid="mobile-sort">
            <option value="">الافتراضي</option>
            {cols.flatMap((c) => [
              <option key={`${c.key}-d`} value={`-${c.key}`}>
                {c.label} (تنازلي)
              </option>,
              <option key={`${c.key}-a`} value={c.key}>
                {c.label} (تصاعدي)
              </option>,
            ])}
          </NativeSelect>
        </label>
      </div>
      <DataTable<ReportTableRow>
        testId="report-table"
        caption="جدول التقرير التفصيلي"
        columns={columns}
        data={pageRows}
        getRowId={(r) => String(r.id)}
        total={data.table.count}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        ordering={table.ordering}
        onOrderingChange={table.setOrdering}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={false}
        isFetching={isFetching}
        emptyState={<EmptyState title="لا صفوف في هذا النطاق" />}
        renderMobileCard={(row) => (
          <div className="flex flex-col gap-1.5 p-3" data-testid="report-card">
            <span className="font-medium">{first ? renderCell(first, row) : null}</span>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {cols.slice(1).map((c) => (
                <div key={c.key} className="contents">
                  <dt className="text-muted-foreground">{c.label}</dt>
                  <dd className="text-end">{renderCell(c, row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      />
    </div>
  );
}

// ───────────────────────────── «تصديراتي» strip ─────────────────────────────

function ExportStrip({ code, canExport }: { code: string; canExport: boolean }) {
  const exportsQuery = useExports();
  const mine = (exportsQuery.data?.results ?? []).filter((j) => j.report_code === code).slice(0, 3);
  return (
    <section aria-labelledby="exports-strip" className="flex flex-col gap-2" data-testid="exports-strip">
      <div className="flex items-center justify-between gap-2">
        <h2 id="exports-strip" className="text-sm font-medium">
          تصديراتي
        </h2>
        <Link href="/dashboard/reports/exports" className="inline-flex h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:h-8">
          كل التصديرات <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        </Link>
      </div>
      {exportsQuery.isLoading ? (
        <Skeleton className="h-11 w-full" />
      ) : exportsQuery.error ? (
        <ErrorState error={exportsQuery.error} onRetry={() => void exportsQuery.refetch()} />
      ) : mine.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا تصديرات لهذا التقرير بعد — اضغط «تصدير CSV» أو «تصدير XLSX».</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden">
          {mine.map((j) => (
            <ExportStripLine key={j.job_id} job={j} canExport={canExport} />
          ))}
        </ul>
      )}
    </section>
  );
}
