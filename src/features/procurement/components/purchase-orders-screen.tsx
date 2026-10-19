"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { Columns3, Plus, Rows3 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, FilterBar, FilterSelect, SearchBox, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { inputClass } from "@/components/shared/field";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePoFormOptions, usePurchaseOrders } from "@/features/procurement/api";
import { PO_STATUSES, PO_STATUS_LABELS, PO_VIEWS, type PoListItem, type PoStatus } from "@/features/procurement/schemas";
import { PoStatusText, ProcurementGate, useProcurementAccess } from "@/features/procurement/components/bits";

/**
 * `/dashboard/purchase-orders` (M23 US-23.5): six status columns (Linear) or a table; the
 * view and every filter live in the URL (FR-23.09). Mobile: a horizontal strip of status
 * tabs over a card list. `N` new order, `J/K` move between cards, Enter opens.
 */
const parsers = {
  view: parseAsStringLiteral(PO_VIEWS).withDefault("board"),
  status: parseAsStringLiteral(PO_STATUSES),
  supplier: parseAsInteger,
  location: parseAsInteger,
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
  col: parseAsStringLiteral(PO_STATUSES).withDefault("draft"),
};
const PAGE_SIZE = 20;

export function PurchaseOrdersScreen() {
  return (
    <ProcurementGate>
      <PurchaseOrdersInner />
    </ProcurementGate>
  );
}

function PurchaseOrdersInner() {
  const router = useRouter();
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const { canManage } = useProcurementAccess();
  const options = usePoFormOptions();
  const base = { supplier: f.supplier ?? undefined, location: f.location ?? undefined, from: f.from || undefined, to: f.to || undefined, q: f.q || undefined };
  const board = usePurchaseOrders({ ...base, page_size: 200 }, { enabled: f.view === "board" });
  const list = usePurchaseOrders({ ...base, status: f.status ?? undefined, page: table.page > 1 ? table.page : undefined }, { enabled: f.view === "table" });

  const set = (patch: Parameters<typeof setF>[0]) => {
    void setF(patch);
    table.resetPage();
  };
  const activeCount = [f.supplier, f.location, f.from, f.to, f.view === "table" ? f.status : null].filter(Boolean).length;

  // `N` → new order (spec §6), unless typing.
  useEffect(() => {
    if (!canManage) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable))) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        router.push("/dashboard/purchase-orders/new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canManage, router]);

  const filters = (
    <FilterBar
      activeCount={activeCount}
      onClear={() => set({ supplier: null, location: null, from: null, to: null, status: null, q: null })}
      search={<SearchBox value={f.q} onChange={(v) => set({ q: v || null })} placeholder="رقم الأمر أو المورد أو SKU" label="بحث في أوامر الشراء" />}
    >
      {f.view === "table" ? (
        <FilterSelect label="الحالة" value={f.status ?? ""} onChange={(v) => set({ status: (v || null) as PoStatus | null })} options={PO_STATUSES.map((s) => ({ value: s, label: PO_STATUS_LABELS[s] }))} testId="filter-status" />
      ) : null}
      <FilterSelect label="المورد" value={f.supplier ? String(f.supplier) : ""} onChange={(v) => set({ supplier: v ? Number(v) : null })} options={(options.data?.suppliers ?? []).map((s) => ({ value: String(s.id), label: s.name }))} testId="filter-supplier" />
      {options.data?.multi_location ? (
        <FilterSelect label="الموقع" value={f.location ? String(f.location) : ""} onChange={(v) => set({ location: v ? Number(v) : null })} options={options.data.locations.map((l) => ({ value: String(l.id), label: l.name }))} testId="filter-location" />
      ) : null}
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        من
        <input type="date" dir="ltr" value={f.from} onChange={(e) => set({ from: e.target.value || null })} className={cn(inputClass, "font-mono")} aria-label="من تاريخ" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        إلى
        <input type="date" dir="ltr" value={f.to} onChange={(e) => set({ to: e.target.value || null })} className={cn(inputClass, "font-mono")} aria-label="إلى تاريخ" />
      </label>
    </FilterBar>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="أوامر الشراء"
        description="مسودة ← موافقة ← استلام. الاستلام يُحدّث مخزون الموقع تلقائياً."
        actions={
          <>
            <div role="group" aria-label="نمط العرض" className="flex rounded-lg border border-border p-0.5">
              {(["board", "table"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={f.view === v}
                  onClick={() => set({ view: v })}
                  className={cn("flex h-10 items-center gap-1.5 rounded-md px-3 text-sm lg:h-8", f.view === v ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}
                  data-testid={`view-${v}`}
                >
                  {v === "board" ? <Columns3 className="size-4" aria-hidden /> : <Rows3 className="size-4" aria-hidden />}
                  {v === "board" ? "لوحة" : "جدول"}
                </button>
              ))}
            </div>
            <Link href="/dashboard/suppliers" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
              الموردون
            </Link>
            {canManage ? (
              <Link href="/dashboard/purchase-orders/new" className={cn(buttonVariants(), "h-11 gap-1.5 lg:h-9")} data-testid="new-po" aria-keyshortcuts="N">
                <Plus className="size-4" aria-hidden /> أمر شراء جديد
              </Link>
            ) : null}
          </>
        }
      />
      {f.view === "board" ? (
        <>
          {filters}
          <Board
            rows={board.data?.results}
            loading={board.isLoading}
            error={board.error}
            onRetry={() => void board.refetch()}
            col={f.col}
            onCol={(col) => void setF({ col })}
            canManage={canManage}
            filtered={Boolean(activeCount || f.q)}
          />
        </>
      ) : (
        <PoTable query={list} page={table.page} onPage={table.setPage} toolbar={filters} filtered={Boolean(activeCount || f.q)} canManage={canManage} />
      )}
    </div>
  );
}

function Board({
  rows,
  loading,
  error,
  onRetry,
  col,
  onCol,
  canManage,
  filtered,
}: {
  rows: PoListItem[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  col: PoStatus;
  onCol: (c: PoStatus) => void;
  canManage: boolean;
  filtered: boolean;
}) {
  const router = useRouter();
  const byStatus = useMemo(() => {
    const m = new Map<PoStatus, PoListItem[]>(PO_STATUSES.map((s) => [s, []]));
    for (const r of rows ?? []) m.get(r.status)!.push(r);
    return m;
  }, [rows]);
  const flat = useMemo(() => PO_STATUSES.flatMap((s) => byStatus.get(s)!), [byStatus]);
  const [focus, setFocus] = useState<number | null>(null);
  const refs = useRef(new Map<number, HTMLAnchorElement>());

  // J/K between cards (spec §6), in column order.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"))) return;
      const k = e.key.toLowerCase();
      if (k !== "j" && k !== "k") return;
      if (!flat.length) return;
      e.preventDefault();
      const idx = focus === null ? -1 : flat.findIndex((r) => r.id === focus);
      const next = flat[Math.min(flat.length - 1, Math.max(0, idx + (k === "j" ? 1 : -1)))]!;
      setFocus(next.id);
      refs.current.get(next.id)?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat, focus]);

  if (loading) return <Skeleton className="h-80 w-full" />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows?.length && !filtered)
    return (
      <EmptyState
        title="لا أوامر شراء — أنشئ أول أمر"
        description="اختر المورد وموقع الاستلام وأضف السطور."
        action={canManage ? <Link href="/dashboard/purchase-orders/new" className={cn(buttonVariants(), "h-11 lg:h-9")}>أمر شراء جديد</Link> : undefined}
      />
    );

  const card = (o: PoListItem) => (
    <Link
      key={o.id}
      href={`/dashboard/purchase-orders/${o.id}`}
      ref={(el) => {
        if (el) refs.current.set(o.id, el);
        else refs.current.delete(o.id);
      }}
      onFocus={() => setFocus(o.id)}
      className={cn("flex flex-col gap-1.5 rounded-md border border-border bg-background p-3 text-sm outline-none hover:border-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/50", focus === o.id && "border-foreground/60")}
      data-testid="po-card"
      data-status={o.status}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/dashboard/purchase-orders/${o.id}`);
      }}
    >
      <span className="flex items-center justify-between gap-2">
        <Mono className="font-medium">{o.number}</Mono>
        <Mono className="text-[11px] text-muted-foreground" title={formatDateTime(o.created_at)}>
          {formatDate(o.created_at)}
        </Mono>
      </span>
      <span className="truncate">{o.supplier.name}</span>
      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          <Mono>{o.lines_count}</Mono> سطر
        </span>
        <Money value={o.display_total} className="text-foreground" />
      </span>
    </Link>
  );

  return (
    <>
      {/* Mobile: status tabs + one card list. */}
      <div className="flex flex-col gap-3 md:hidden">
        <div role="tablist" aria-label="حالات أوامر الشراء" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4">
          {PO_STATUSES.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={col === s} onClick={() => onCol(s)} className={cn("flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-2 text-sm", col === s ? "border-foreground font-medium" : "border-transparent text-muted-foreground")}>
              {PO_STATUS_LABELS[s]} <Mono className="text-xs text-muted-foreground">{byStatus.get(s)!.length}</Mono>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2" role="tabpanel">
          {byStatus.get(col)!.length ? byStatus.get(col)!.map(card) : <p className="py-6 text-center text-sm text-muted-foreground">لا شيء هنا</p>}
        </div>
      </div>
      {/* Desktop: six columns, 1px borders, scroll starts at the start (right) edge. */}
      <div className="hidden overflow-x-auto md:block" data-testid="po-board">
        <div className="grid min-w-[1080px] grid-cols-6 gap-3">
          {PO_STATUSES.map((s) => (
            <section key={s} aria-label={PO_STATUS_LABELS[s]} className="flex min-h-64 flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2" data-testid="po-column" data-status={s}>
              <header className="flex items-center justify-between px-1 py-1">
                <PoStatusText status={s} />
                <Mono className="text-xs text-muted-foreground" data-testid="po-column-count">
                  {byStatus.get(s)!.length}
                </Mono>
              </header>
              {byStatus.get(s)!.length ? byStatus.get(s)!.map(card) : <p className="px-1 py-6 text-center text-xs text-muted-foreground">لا شيء هنا</p>}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

function PoTable({
  query,
  page,
  onPage,
  toolbar,
  filtered,
  canManage,
}: {
  query: ReturnType<typeof usePurchaseOrders>;
  page: number;
  onPage: (p: number) => void;
  toolbar: React.ReactNode;
  filtered: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const columns = useMemo<ColumnDef<PoListItem, unknown>[]>(
    () => [
      { id: "number", header: headerLabel("الرقم"), cell: ({ row }) => <Link href={`/dashboard/purchase-orders/${row.original.id}`} className="hover:underline"><Mono className="font-medium">{row.original.number}</Mono></Link> },
      { id: "supplier", header: headerLabel("المورد"), cell: ({ row }) => <span className="truncate">{row.original.supplier.name}</span> },
      { id: "location", header: headerLabel("الموقع"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.location.name}</span> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <PoStatusText status={row.original.status} /> },
      { id: "lines", meta: { numeric: true }, header: headerLabel("السطور"), cell: ({ row }) => <Mono>{row.original.lines_count}</Mono> },
      { id: "total", meta: { numeric: true }, header: headerLabel("الإجمالي"), cell: ({ row }) => <Money value={row.original.display_total} /> },
      { id: "created", header: headerLabel("الإنشاء"), cell: ({ row }) => <Mono className="text-xs text-muted-foreground">{formatDate(row.original.created_at)}</Mono> },
    ],
    [],
  );
  return (
    <DataTable<PoListItem>
      testId="po-table"
      caption="أوامر الشراء"
      columns={columns}
      data={query.data?.results}
      getRowId={(r) => String(r.id)}
      total={query.data?.count ?? 0}
      page={page}
      pageSize={PAGE_SIZE}
      onPageChange={onPage}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      error={query.error}
      onRetry={() => void query.refetch()}
      isFiltered={filtered}
      onRowOpen={(r) => router.push(`/dashboard/purchase-orders/${r.id}`)}
      toolbar={toolbar}
      emptyState={<EmptyState title="لا أوامر شراء — أنشئ أول أمر" action={canManage ? <Link href="/dashboard/purchase-orders/new" className={cn(buttonVariants(), "h-11 lg:h-9")}>أمر شراء جديد</Link> : undefined} />}
      renderMobileCard={(o) => (
        <Link href={`/dashboard/purchase-orders/${o.id}`} className="flex flex-col gap-1 p-3 text-sm">
          <span className="flex justify-between">
            <Mono className="font-medium">{o.number}</Mono>
            <PoStatusText status={o.status} />
          </span>
          <span className="flex justify-between text-muted-foreground">
            <span>{o.supplier.name}</span>
            <Money value={o.display_total} />
          </span>
        </Link>
      )}
    />
  );
}
