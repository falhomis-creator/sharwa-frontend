"use client";

import Link from "next/link";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDues } from "@/features/payments/api";
import { DUE_KINDS, DUE_KIND_LABELS, DUE_STATUSES, DUE_STATUS_LABELS, DUE_STATUS_TONE, type Due, type DueKind } from "@/features/payments/schemas";
import { BackLink, PaymentsGate, StatusText } from "@/features/payments/components/shared";

/**
 * `/dashboard/wallet/dues?kind=commission|app_charge` (M14 US-14.5): read-only platform
 * dues. The totals strip shows the server's per-status sums as received (Mono, never
 * summed here); each total filters the table. When the platform's `commission_enabled`
 * is off, the commissions tab reads «العمولات غير مفعّلة حالياً» instead of an empty table.
 */
const parsers = { kind: parseAsStringLiteral(DUE_KINDS).withDefault("commission"), status: parseAsStringLiteral(DUE_STATUSES) };

export function DuesScreen() {
  return (
    <PaymentsGate anyOf={["merchantwallet"]}>
      <DuesInner />
    </PaymentsGate>
  );
}

function DuesInner() {
  const table = useTableUrlState();
  const [{ kind, status }, setParams] = useQueryStates(parsers, { history: "replace" });
  const query = useDues({ kind, status: status ?? undefined, page: table.page, page_size: table.pageSize });
  const data = query.data;
  const off = kind === "commission" && data && !data.commission_enabled;

  const columns = useMemo<ColumnDef<Due, unknown>[]>(
    () => [
      { id: "date", header: headerLabel("التاريخ"), cell: ({ row }) => <span className="tabular-nums whitespace-nowrap text-xs">{formatDateTime(row.original.created_at)}</span> },
      {
        id: "title",
        header: headerLabel("البند"),
        cell: ({ row }) => (
          <span className="flex min-w-40 flex-col">
            <span className="text-sm">{row.original.title}</span>
            {row.original.detail ? <span className="text-xs text-muted-foreground">{row.original.detail}</span> : null}
          </span>
        ),
      },
      {
        id: "ref",
        header: headerLabel("المرجع"),
        cell: ({ row }) =>
          row.original.reference?.kind === "order" ? (
            <Link href={`/dashboard/orders?order=${row.original.reference.id}`} className="text-xs underline-offset-4 hover:underline">
              {row.original.reference.label}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      { id: "amount", meta: { numeric: true }, header: headerLabel("المبلغ"), cell: ({ row }) => <Money value={row.original.display_amount} className="font-medium" /> },
      {
        id: "status",
        header: headerLabel("الحالة"),
        cell: ({ row }) => <StatusText label={DUE_STATUS_LABELS[row.original.status]} dot={DUE_STATUS_TONE[row.original.status].dot} text={DUE_STATUS_TONE[row.original.status].text} testId="due-status" />,
      },
    ],
    [],
  );

  const switchKind = (k: DueKind) => {
    void setParams({ kind: k === "commission" ? null : k, status: null });
    table.resetPage();
  };

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/wallet">محفظة المتجر</BackLink>
      <PageHeader title="المستحقات للمنصة" description="عمولات شروة على الطلبات ورسوم التطبيقات المثبّتة — للاطلاع فقط؛ تُحصَّل من رصيد محفظتك." />
      <div role="tablist" aria-label="نوع المستحق" className="flex gap-1 border-b border-border">
        {DUE_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => switchKind(k)}
            data-testid={`dues-tab-${k}`}
            className={cn("-mb-px min-h-11 border-b-2 px-3 text-sm lg:min-h-9", kind === k ? "border-cta font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {DUE_KIND_LABELS[k]}
          </button>
        ))}
      </div>

      {off ? (
        <div role="status" className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-6" data-testid="commission-off">
          <p className="text-base font-medium">العمولات غير مفعّلة حالياً</p>
          <p className="text-sm text-muted-foreground">لا تقتطع شروة عمولة على طلبات متجرك الآن. ستظهر السجلات هنا إن فُعّلت لاحقاً مع إشعار مسبق.</p>
        </div>
      ) : (
        <>
          <nav aria-label="مجاميع المستحقات" className="-mx-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm" data-testid="dues-totals">
            {DUE_STATUSES.map((s, i) => (
              <span key={s} className="flex items-center">
                {i > 0 ? (
                  <span aria-hidden className="px-1 text-border">
                    ·
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => {
                    void setParams({ status: status === s ? null : s });
                    table.resetPage();
                  }}
                  className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-md px-1.5 hover:text-foreground lg:min-h-8", status === s ? "text-foreground underline underline-offset-[6px]" : "text-muted-foreground")}
                  data-testid={`dues-total-${s}`}
                >
                  {DUE_STATUS_LABELS[s]}
                  <Money value={data?.totals[s] ?? "…"} className={cn("text-foreground", s === "pending" && "text-warning")} />
                  <Mono className="text-xs text-muted-foreground">({data?.counts[s] ?? "–"})</Mono>
                </button>
              </span>
            ))}
          </nav>
          <DataTable<Due>
            testId="dues-table"
            caption={DUE_KIND_LABELS[kind]}
            columns={columns}
            data={data?.results}
            getRowId={(r) => `${r.kind}-${r.id}`}
            total={data?.count ?? 0}
            page={table.page}
            pageSize={table.pageSize}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            density={table.density}
            onDensityChange={table.setDensity}
            isLoading={query.isLoading}
            isFetching={query.isFetching}
            error={query.error}
            onRetry={() => void query.refetch()}
            isFiltered={Boolean(status)}
            emptyState={<EmptyState title={kind === "commission" ? "لا عمولات بعد" : "لا رسوم تطبيقات"} description={kind === "commission" ? "تُسجَّل العمولة عند كل طلب مدفوع إلكترونياً." : "لا تطبيقات مدفوعة مثبّتة على متجرك."} />}
            noResultsState={<EmptyState title="لا بنود بهذه الحالة" description="اختر حالة أخرى من الشريط أعلاه." />}
            renderMobileCard={(d) => (
              <div className="flex min-h-16 w-full items-center gap-3 p-3" data-testid="due-card">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm">{d.title}</span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{formatDateTime(d.created_at)}</span>
                    {d.reference ? <span>{d.reference.label}</span> : null}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <Money value={d.display_amount} className="text-base font-semibold" />
                  <StatusText label={DUE_STATUS_LABELS[d.status]} dot={DUE_STATUS_TONE[d.status].dot} text={DUE_STATUS_TONE[d.status].text} />
                </span>
              </div>
            )}
          />
        </>
      )}
    </div>
  );
}
