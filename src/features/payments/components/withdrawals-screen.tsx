"use client";

import Link from "next/link";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, FilterSelect, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWithdrawals } from "@/features/payments/api";
import {
  CURRENCIES,
  CURRENCY_SHORT,
  WITHDRAWAL_STATUSES,
  WITHDRAWAL_STATUS_LABELS,
  WITHDRAWAL_STATUS_TONE,
  type Withdrawal,
} from "@/features/payments/schemas";
import { BackLink, PaymentsGate, StatusText } from "@/features/payments/components/shared";

/**
 * `/dashboard/wallet/withdrawals` (M14 US-14.4.3): every request with its status
 * (`pending` قيد المراجعة · `approved` مُنفَّذ · `rejected` مرفوض + the reason), date,
 * currency and receiving account. Decisions belong to the platform owner (M20).
 */
const parsers = { status: parseAsStringLiteral(WITHDRAWAL_STATUSES), currency: parseAsStringLiteral(CURRENCIES) };

export function WithdrawalsScreen() {
  return (
    <PaymentsGate anyOf={["merchantwallet"]}>
      <WithdrawalsInner />
    </PaymentsGate>
  );
}

function WithdrawalStatusText({ w }: { w: Withdrawal }) {
  const tone = WITHDRAWAL_STATUS_TONE[w.status];
  return <StatusText label={WITHDRAWAL_STATUS_LABELS[w.status]} dot={tone.dot} text={tone.text} testId="withdrawal-status" />;
}

function WithdrawalsInner() {
  const table = useTableUrlState();
  const [filters, setParams] = useQueryStates(parsers, { history: "replace" });
  const query = useWithdrawals({ status: filters.status ?? undefined, currency: filters.currency ?? undefined, page: table.page, page_size: table.pageSize });
  const active = [filters.status, filters.currency].filter(Boolean).length;
  const set = (patch: Partial<typeof filters>) => {
    void setParams(patch);
    table.resetPage();
  };

  const columns = useMemo<ColumnDef<Withdrawal, unknown>[]>(
    () => [
      { id: "id", header: headerLabel("الطلب"), cell: ({ row }) => <Mono className="text-xs">#{row.original.id}</Mono> },
      { id: "date", header: headerLabel("التاريخ"), cell: ({ row }) => <span className="tabular-nums whitespace-nowrap text-xs">{formatDateTime(row.original.created_at)}</span> },
      { id: "currency", header: headerLabel("العملة"), cell: ({ row }) => <Mono className="text-xs">{row.original.currency}</Mono> },
      { id: "amount", meta: { numeric: true }, header: headerLabel("المبلغ"), cell: ({ row }) => <Money value={row.original.display_amount} className="font-medium" /> },
      {
        id: "account",
        header: headerLabel("حساب الاستلام"),
        cell: ({ row }) => (
          <span className="flex min-w-40 flex-col">
            <span className="truncate text-sm">{row.original.payout_account.label}</span>
            <Mono className="self-start text-xs text-muted-foreground">{row.original.payout_account.account_number}</Mono>
          </span>
        ),
      },
      {
        id: "status",
        header: headerLabel("الحالة"),
        cell: ({ row }) => (
          <span className="flex min-w-32 flex-col gap-0.5">
            <WithdrawalStatusText w={row.original} />
            {row.original.rejection_reason ? <span className="text-xs text-muted-foreground" data-testid="withdrawal-reason">{row.original.rejection_reason}</span> : null}
            {row.original.decided_at ? <span className="tabular-nums text-[11px] text-muted-foreground">{formatDateTime(row.original.decided_at)}</span> : null}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/wallet">محفظة المتجر</BackLink>
      <PageHeader
        title="طلبات السحب"
        description="تراجع إدارة شروة كل طلب وتحوّل المبلغ إلى حسابك، عادةً خلال يومي عمل."
        actions={
          <Link href="/dashboard/wallet/withdrawals/new" className={cn(buttonVariants(), "h-11 lg:h-9")} data-testid="withdraw-new">
            طلب سحب
          </Link>
        }
      />
      <DataTable<Withdrawal>
        testId="withdrawals-table"
        caption="طلبات السحب"
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
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={active > 0}
        emptyState={
          <EmptyState
            title="لا طلبات سحب"
            description="حين يتوفر رصيد في محفظتك اطلب سحبه إلى أحد حساباتك النشطة."
            action={
              <Link href="/dashboard/wallet/withdrawals/new" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
                طلب سحب
              </Link>
            }
          />
        }
        noResultsState={<EmptyState title="لا طلبات تطابق الفلاتر" description="غيّر الحالة أو العملة." />}
        toolbar={
          <FilterBar activeCount={active} onClear={() => set({ status: null, currency: null })}>
            <FilterSelect label="الحالة" value={filters.status ?? ""} onChange={(v) => set({ status: (v || null) as Withdrawal["status"] | null })} options={WITHDRAWAL_STATUSES.map((s) => ({ value: s, label: WITHDRAWAL_STATUS_LABELS[s] }))} testId="wd-status" />
            <FilterSelect label="العملة" value={filters.currency ?? ""} onChange={(v) => set({ currency: (v || null) as Withdrawal["currency"] | null })} options={CURRENCIES.map((c) => ({ value: c, label: `${c} · ${CURRENCY_SHORT[c]}` }))} testId="wd-currency" />
          </FilterBar>
        }
        renderMobileCard={(w) => (
          <div className="flex min-h-16 w-full flex-col gap-1.5 p-3" data-testid="withdrawal-card">
            <span className="flex items-center justify-between gap-3">
              <Money value={w.display_amount} className="text-base font-semibold" />
              <WithdrawalStatusText w={w} />
            </span>
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Mono>{w.currency}</Mono>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{formatDateTime(w.created_at)}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{w.payout_account.label}</span>
            </span>
            {w.rejection_reason ? <span className="text-xs text-destructive">{w.rejection_reason}</span> : null}
          </div>
        )}
      />
    </div>
  );
}
