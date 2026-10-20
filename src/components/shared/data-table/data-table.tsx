"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Rows3, Rows4, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { ScrollX } from "@/components/shared/scroll-x";
import { TablePagination } from "@/components/shared/data-table/table-pagination";
import { nextOrdering, type Density } from "@/components/shared/data-table/use-table-url-state";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Shared data table (T069) on TanStack Table 8 — the one table every dashboard list uses.
 *
 * Constitution › الجداول: 44px rows, a sticky header, horizontal hairlines only, numeric
 * columns `text-end font-mono`, switchable density. Server-driven: the caller owns the
 * data, the page and the ordering (URL state via nuqs); this component only renders and
 * reports intent. Multi-select drives a bulk bar that previews by count.
 *
 * States: skeleton · empty (no data at all) · no results (filters active) · error · no
 * permission. Below `md` a `renderMobileCard` replaces the table (M04/M06 §6 «الجوال»).
 *
 * Keyboard (M04/M06 §6): `J`/`K` move between rows, `Enter`/`Space` open the focused row.
 */
export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[] | undefined;
  getRowId: (row: T) => string;
  /** Accessible name of the table. */
  caption: string;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  ordering?: string;
  onOrderingChange?: (ordering: string) => void;
  density?: Density;
  onDensityChange?: (density: Density) => void;
  isLoading: boolean;
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  forbidden?: boolean;
  /** Rendered when the list has no data at all (no filters). */
  emptyState?: ReactNode;
  /** Rendered when filters/search produced nothing. */
  noResultsState?: ReactNode;
  isFiltered?: boolean;
  selectable?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  /** The bulk bar's action buttons, given the selected ids. */
  bulkActions?: (ids: string[]) => ReactNode;
  renderMobileCard?: (row: T) => ReactNode;
  onRowOpen?: (row: T) => void;
  /** Toolbar content rendered above the table (filters, search). */
  toolbar?: ReactNode;
  testId?: string;
}

const ROW_HEIGHT: Record<Density, string> = { comfortable: "h-11", compact: "h-9" };

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  caption,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  ordering = "",
  onOrderingChange,
  density = "comfortable",
  onDensityChange,
  isLoading,
  isFetching = false,
  error,
  onRetry,
  forbidden = false,
  emptyState,
  noResultsState,
  isFiltered = false,
  selectable = false,
  rowSelection,
  onRowSelectionChange,
  bulkActions,
  renderMobileCard,
  onRowOpen,
  toolbar,
  testId,
}: DataTableProps<T>) {
  const [localSelection, setLocalSelection] = useState<RowSelectionState>({});
  const selection = rowSelection ?? localSelection;
  const setSelection = onRowSelectionChange ?? setLocalSelection;
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const mobileRef = useRef<HTMLUListElement>(null);

  const selectionColumn = useMemo<ColumnDef<T, unknown>>(
    () => ({
      id: "__select",
      meta: { srOnlyHeader: true, className: "w-10" },
      header: ({ table }) => (
        <span className="flex items-center justify-center">
          <Checkbox
            aria-label="تحديد كل صفوف الصفحة"
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(Boolean(v))}
          />
        </span>
      ),
      cell: ({ row }) => (
        <span className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            aria-label="تحديد الصف"
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(Boolean(v))}
          />
        </span>
      ),
    }),
    [],
  );

  // TanStack Table returns fresh functions each render; React Compiler skips this component
  // on purpose, which is the correct behaviour for a table.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<T>({
    data: data ?? [],
    columns: selectable ? [selectionColumn, ...columns] : columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: total,
    enableRowSelection: selectable,
    state: { rowSelection: selection },
    onRowSelectionChange: (updater) => {
      setSelection(typeof updater === "function" ? updater(selection) : updater);
    },
  });

  const selectedIds = Object.keys(selection).filter((k) => selection[k]);
  const rows = table.getRowModel().rows;

  // J/K row navigation + Enter/Space to open. Rows are real focus targets (roving).
  useEffect(() => {
    if (!onRowOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector("[role=dialog]")) return;
      const key = event.key.toLowerCase();
      if (key !== "j" && key !== "k") return;
      const desktop = bodyRef.current && bodyRef.current.offsetParent !== null;
      const container: HTMLElement | null = desktop ? bodyRef.current : mobileRef.current;
      if (!container) return;
      const items = Array.from(container.querySelectorAll<HTMLElement>("[data-row]"));
      if (items.length === 0) return;
      event.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLElement);
      const next = key === "j" ? Math.min(items.length - 1, current + 1) : Math.max(0, current - 1);
      items[current === -1 ? 0 : next]?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRowOpen]);

  if (forbidden) {
    return (
      <div className="surface-card p-6 lg:p-8" data-testid={testId ? `${testId}-forbidden` : undefined}>
        <p className="text-base font-medium">ليست لديك صلاحية لعرض هذه القائمة</p>
        <p className="mt-1 text-sm text-muted-foreground">اطلب الصلاحية من مالك المتجر أو مدير الفرع.</p>
      </div>
    );
  }

  const showEmpty = !isLoading && !error && rows.length === 0;
  const visibleColumns = table.getVisibleLeafColumns();

  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      {toolbar || onDensityChange ? (
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">{toolbar}</div>
          {onDensityChange ? (
            <button
              type="button"
              onClick={() => onDensityChange(density === "comfortable" ? "compact" : "comfortable")}
              aria-label={density === "comfortable" ? "كثافة مضغوطة" : "كثافة مريحة"}
              title={density === "comfortable" ? "كثافة مضغوطة" : "كثافة مريحة"}
              className="hidden size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
            >
              {density === "comfortable" ? (
                <Rows4 className="size-4" strokeWidth={1.75} aria-hidden />
              ) : (
                <Rows3 className="size-4" strokeWidth={1.75} aria-hidden />
              )}
            </button>
          ) : null}
        </div>
      ) : null}

      {selectable && selectedIds.length > 0 ? (
        <div
          role="region"
          aria-label="إجراءات جماعية"
          data-testid="bulk-bar"
          className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-card"
        >
          <span className="text-sm">
            <Mono>{formatNumber(selectedIds.length)}</Mono> محدد
          </span>
          <div className="flex flex-1 flex-wrap items-center gap-1.5">{bulkActions?.(selectedIds)}</div>
          <button
            type="button"
            onClick={() => setSelection({})}
            aria-label="إلغاء التحديد"
            className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      ) : null}

      {error && !isLoading ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : showEmpty ? (
        isFiltered ? (noResultsState ?? emptyState) : emptyState
      ) : (
        <>
          {/* Desktop/tablet table */}
          <ScrollX
            className={cn(
              "surface-card",
              renderMobileCard && "hidden md:block",
              isFetching && !isLoading && "opacity-70 transition-opacity",
            )}
          >
            <table className="w-full border-collapse text-sm" aria-busy={isLoading || isFetching}>
              <caption className="sr-only">{caption}</caption>
              <thead className="sticky top-0 z-10 bg-card">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-border/60">
                    {hg.headers.map((header) => {
                      const meta = header.column.columnDef.meta;
                      const sortKey = meta?.sortKey;
                      const direction =
                        sortKey && ordering === sortKey ? "asc" : sortKey && ordering === `-${sortKey}` ? "desc" : null;
                      const content = header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext());
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined}
                          className={cn(
                            "h-11 whitespace-nowrap bg-muted/40 px-3 text-xs font-medium text-muted-foreground first:ps-5 last:pe-5",
                            meta?.numeric ? "text-end" : "text-start",
                            meta?.className,
                          )}
                        >
                          {sortKey && onOrderingChange ? (
                            <button
                              type="button"
                              onClick={() => onOrderingChange(nextOrdering(ordering, sortKey))}
                              className={cn(
                                "inline-flex h-8 items-center gap-1 rounded-sm hover:text-foreground",
                                meta?.numeric && "flex-row-reverse",
                              )}
                            >
                              {content}
                              {direction === "asc" ? (
                                <ArrowUp className="size-3" aria-hidden />
                              ) : direction === "desc" ? (
                                <ArrowDown className="size-3" aria-hidden />
                              ) : (
                                <ArrowUpDown className="size-3 opacity-40" aria-hidden />
                              )}
                            </button>
                          ) : meta?.srOnlyHeader && header.column.id !== "__select" ? (
                            <span className="sr-only">{content}</span>
                          ) : (
                            content
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody ref={bodyRef}>
                {isLoading
                  ? Array.from({ length: Math.min(pageSize, 10) }, (_, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        {visibleColumns.map((c) => (
                          <td key={c.id} className={cn(ROW_HEIGHT[density], "px-3")}>
                            <Skeleton className="h-3 w-full max-w-32" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : rows.map((row) => (
                      <tr
                        key={row.id}
                        data-row
                        data-state={row.getIsSelected() ? "selected" : undefined}
                        tabIndex={onRowOpen ? 0 : undefined}
                        onKeyDown={(e) => {
                          if (!onRowOpen || e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowOpen(row.original);
                          }
                        }}
                        className="border-b border-border/60 outline-none transition-colors last:border-0 hover:bg-accent/50 focus-visible:bg-muted/70 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring data-[state=selected]:bg-muted/60"
                      >
                        {row.getVisibleCells().map((cell) => {
                          const meta = cell.column.columnDef.meta;
                          return (
                            <td
                              key={cell.id}
                              className={cn(
                                ROW_HEIGHT[density],
                                "px-3 align-middle first:ps-5 last:pe-5",
                                meta?.numeric ? "text-end font-mono tabular-nums" : "text-start",
                                meta?.className,
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
              </tbody>
            </table>
          </ScrollX>

          {/* Mobile cards */}
          {renderMobileCard ? (
            <ul ref={mobileRef} className="surface-card flex flex-col divide-y divide-border/60 overflow-hidden md:hidden">
              {isLoading
                ? Array.from({ length: 6 }, (_, i) => (
                    <li key={i} className="flex flex-col gap-2 p-3">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </li>
                  ))
                : rows.map((row) => (
                    <li key={row.id} className="flex items-stretch">
                      {selectable ? (
                        <label className="flex w-11 shrink-0 items-center justify-center">
                          <Checkbox
                            aria-label="تحديد"
                            checked={row.getIsSelected()}
                            onCheckedChange={(v) => row.toggleSelected(Boolean(v))}
                          />
                        </label>
                      ) : null}
                      <div className="min-w-0 flex-1">{renderMobileCard(row.original)}</div>
                    </li>
                  ))}
            </ul>
          ) : null}

          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </div>
  );
}

/** Sortable header label with the column's own text (keeps column defs terse). */
export function headerLabel(label: string) {
  return function Header() {
    return <>{label}</>;
  };
}
