"use client";

import { useMemo, useState } from "react";
import { parseAsString, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AccessGate } from "@/components/shared/access-gate";
import { Mono } from "@/components/shared/mono";
import { DataTable, FilterBar, SearchBox, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/features/staff/schemas";
import { useAuditLog, useStaffWrites } from "@/features/staff/api";
import { ShortHash, SnapshotDiff, outlineButton } from "@/features/staff/components/bits";

/**
 * `/dashboard/staff/audit-log` (M18 US-18.6, T113): the append-only chain — action, actor,
 * time, compact before/after diff, the short row hash — and «التحقق من سلامة السجل».
 */
export function AuditLogScreen() {
  return (
    <AccessGate feature="staff_rbac" permission="staff.view_sessions">
      <AuditLog />
    </AccessGate>
  );
}

function AuditLog() {
  const table = useTableUrlState();
  const [filters, setFilters] = useQueryStates({ q: parseAsString.withDefault("") }, { history: "replace" });
  const query = useAuditLog({ q: filters.q || undefined, page: table.page, page_size: table.pageSize });
  const writes = useStaffWrites();
  const verify = writes.verifyChain;
  const [result, setResult] = useState<{ ok: boolean; broken_at: number | null; rows: number } | null>(null);

  const runVerify = async () => {
    try {
      setResult(await verify.mutateAsync(false));
    } catch (e) {
      setResult(null);
      if (isApiError(e)) setResult({ ok: false, broken_at: null, rows: 0 });
    }
  };

  const columns = useMemo<ColumnDef<AuditEntry, unknown>[]>(
    () => [
      {
        id: "action",
        header: headerLabel("الإجراء"),
        meta: { className: "whitespace-nowrap" },
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Mono className="text-sm">{row.original.action_code}</Mono>
            {row.original.entity ? <span className="text-xs text-muted-foreground">{row.original.entity}</span> : null}
          </div>
        ),
      },
      { id: "actor", header: headerLabel("الفاعل"), cell: ({ row }) => <span className="text-sm">{row.original.actor}</span> },
      { id: "time", header: headerLabel("الوقت"), meta: { className: "whitespace-nowrap" }, cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateTime(row.original.created_at)}</span> },
      { id: "diff", header: headerLabel("التغيير"), cell: ({ row }) => <SnapshotDiff before={row.original.before_snapshot} after={row.original.after_snapshot} /> },
      { id: "hash", header: headerLabel("التجزئة"), meta: { className: "whitespace-nowrap text-end" }, cell: ({ row }) => <ShortHash hash={row.original.row_hash} /> },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="سجل التدقيق"
        description="كل تغيير حساس يُسجَّل ولا يُعدَّل؛ كل سطر مرتبط بتجزئة السطر الذي قبله."
        actions={
          <button type="button" className={outlineButton} onClick={() => void runVerify()} disabled={verify.isPending} data-testid="verify-chain">
            <ShieldCheck className="size-4" aria-hidden /> التحقق من سلامة السجل
          </button>
        }
      />
      {result ? (
        <p role="status" className={cn("flex items-center gap-2 text-sm", result.ok ? "text-success" : "text-destructive")} data-testid="verify-result">
          <span aria-hidden className={cn("size-1.5 rounded-full", result.ok ? "bg-success" : "bg-destructive")} />
          {result.ok ? (
            <>
              السجل سليم — <Mono>{result.rows}</Mono> سطراً متسلسلاً.
            </>
          ) : result.broken_at !== null ? (
            <>
              انقطاع في السلسلة عند السطر <Mono>{result.broken_at}</Mono>.
            </>
          ) : (
            "تعذّر التحقق."
          )}
        </p>
      ) : null}
      <DataTable
        caption="سجل التدقيق"
        testId="audit-table"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={Boolean(filters.q)}
        emptyState={<EmptyState title="لا سجلات بعد" description="يبدأ السجل مع أول تغيير على الموظفين أو الأدوار أو الموافقات." />}
        noResultsState={<EmptyState title="لا سجلات تطابق البحث" />}
        toolbar={
          <FilterBar
            search={
              <SearchBox
                value={filters.q}
                onChange={(q) => {
                  void setFilters({ q });
                  table.resetPage();
                }}
                placeholder="الإجراء أو الفاعل أو الكيان"
              />
            }
            activeCount={filters.q ? 1 : 0}
            onClear={() => void setFilters({ q: "" })}
          >
            <span className="text-xs text-muted-foreground">الأحدث أولاً</span>
          </FilterBar>
        }
        renderMobileCard={(r) => (
          <div className="flex flex-col gap-1 py-1">
            <div className="flex items-center justify-between gap-2">
              <Mono className="text-sm">{r.action_code}</Mono>
              <ShortHash hash={r.row_hash} />
            </div>
            <p className="text-xs text-muted-foreground">
              {r.actor} · {formatDateTime(r.created_at)}
              {r.entity ? ` · ${r.entity}` : ""}
            </p>
            <SnapshotDiff before={r.before_snapshot} after={r.after_snapshot} />
          </div>
        )}
      />
    </div>
  );
}
