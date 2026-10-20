"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, FilterSelect, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { compareDecimal } from "@/lib/decimal";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMerchantWallet, useWalletTransactions } from "@/features/payments/api";
import {
  CURRENCIES,
  CURRENCY_SHORT,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type WalletBalance,
  type WalletTransaction,
} from "@/features/payments/schemas";
import { PaymentsGate, isTyping } from "@/features/payments/components/shared";

/**
 * `/dashboard/wallet` (M14 US-14.4): four currency rows — never one converted total
 * (FR-14.03, SC-14.4) — each with its own «طلب سحب» (disabled at zero, with the reason);
 * then the ledger with `currency · type · from · to` in the URL and server paging
 * (FR-14.06). `W` opens a withdrawal request.
 */
const parsers = {
  currency: parseAsStringLiteral(CURRENCIES),
  type: parseAsStringLiteral(TRANSACTION_TYPES),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
};

export function WalletScreen() {
  return (
    <PaymentsGate anyOf={["merchantwallet"]}>
      <WalletInner />
    </PaymentsGate>
  );
}

function WalletInner() {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || document.querySelector("[role=dialog]")) return;
      if (e.key.toLowerCase() === "w") {
        e.preventDefault();
        router.push("/dashboard/wallet/withdrawals/new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="محفظة المتجر"
        description="أرصدتك من المبيعات الإلكترونية وشروة باي، لكل عملة رصيدها — لا تحويل بين العملات."
        actions={
          <>
            <Link href="/dashboard/wallet/withdrawals" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
              طلبات السحب
            </Link>
            <Link href="/dashboard/wallet/dues" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
              المستحقات
            </Link>
            <Link href="/dashboard/wallet/withdrawals/new" className={cn(buttonVariants(), "h-11 gap-2 lg:h-9")} data-testid="withdraw-new" aria-keyshortcuts="W">
              طلب سحب
              <kbd className="hidden rounded border border-primary-foreground/30 px-1 font-mono text-[10px] lg:inline">W</kbd>
            </Link>
          </>
        }
      />
      <Balances />
      <Transactions />
    </div>
  );
}

function Balances() {
  const query = useMerchantWallet();
  return (
    <section aria-label="الأرصدة" className="flex flex-col gap-2" data-testid="wallet-balances">
      <h2 className="text-base font-semibold">الأرصدة</h2>
      {query.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy>
          {CURRENCIES.map((c) => (
            <Skeleton key={c} className="h-16 w-full" />
          ))}
        </div>
      ) : query.error || !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <ul className="divide-y divide-border/60 surface-card overflow-hidden">
          {query.data.balances.map((b) => (
            <BalanceRow key={b.currency} b={b} />
          ))}
        </ul>
      )}
    </section>
  );
}

function BalanceRow({ b }: { b: WalletBalance }) {
  const empty = compareDecimal(b.available, "0") <= 0;
  const reason = empty ? (b.pending_withdrawals > 0 ? "الرصيد كله محجوز لطلب سحب قيد المراجعة" : "لا رصيد متاح للسحب بهذه العملة") : undefined;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 md:p-4" data-testid="balance-row" data-currency={b.currency}>
      <div className="flex w-32 shrink-0 flex-col">
        <Mono className="text-sm font-medium">{b.currency}</Mono>
        <span className="text-xs text-muted-foreground">{CURRENCY_SHORT[b.currency]}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-end gap-0.5 text-end md:items-start md:text-start">
        <Money value={b.display_balance} className="text-xl font-semibold md:text-2xl" />
        <span className="text-xs text-muted-foreground">
          المتاح للسحب <Money value={b.display_available} className="text-foreground" />
          {b.pending_withdrawals > 0 ? (
            <>
              {" · "}محجوز <Money value={b.display_reserved} className="text-warning" />
            </>
          ) : null}
        </span>
      </div>
      <span title={reason} className="w-full md:w-auto">
        {empty ? (
          <span aria-disabled className={cn(buttonVariants({ variant: "outline" }), "pointer-events-none h-11 w-full opacity-50 md:w-auto lg:h-9")} data-testid="balance-withdraw" data-disabled="true">
            سحب
          </span>
        ) : (
          <Link href={`/dashboard/wallet/withdrawals/new?currency=${b.currency}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full md:w-auto lg:h-9")} data-testid="balance-withdraw">
            سحب
          </Link>
        )}
      </span>
    </li>
  );
}

function Reference({ t, plain = false }: { t: WalletTransaction; plain?: boolean }) {
  if (!t.reference) return <span className="text-xs text-muted-foreground">—</span>;
  if (plain) return <span className="text-xs">{t.reference.label}</span>;
  if (t.reference.kind === "order")
    return (
      <Link href={`/dashboard/orders?order=${t.reference.id}`} className="text-xs underline-offset-4 hover:underline" data-testid="tx-ref-order">
        {t.reference.label}
      </Link>
    );
  if (t.reference.kind === "withdrawal")
    return (
      <Link href="/dashboard/wallet/withdrawals" className="text-xs underline-offset-4 hover:underline">
        {t.reference.label}
      </Link>
    );
  return (
    <Link href="/dashboard/wallet/dues" className="text-xs underline-offset-4 hover:underline">
      {t.reference.label}
    </Link>
  );
}

function Transactions() {
  const table = useTableUrlState();
  const [filters, setParams] = useQueryStates(parsers, { history: "replace" });
  const query = useWalletTransactions({
    currency: filters.currency ?? undefined,
    type: filters.type ?? undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: table.page,
    page_size: table.pageSize,
  });
  const [now] = useState(() => new Date());
  const active = [filters.currency, filters.type, filters.from, filters.to].filter(Boolean).length;
  const set = (patch: Partial<{ currency: (typeof CURRENCIES)[number] | null; type: (typeof TRANSACTION_TYPES)[number] | null; from: string | null; to: string | null }>) => {
    void setParams(patch);
    table.resetPage();
  };

  const columns = useMemo<ColumnDef<WalletTransaction, unknown>[]>(
    () => [
      {
        id: "date",
        header: headerLabel("التاريخ"),
        cell: ({ row }) => (
          <time dateTime={row.original.created_at} title={formatRelative(row.original.created_at, now)} className="whitespace-nowrap text-xs tabular-nums">
            {formatDateTime(row.original.created_at)}
          </time>
        ),
      },
      { id: "type", header: headerLabel("النوع"), cell: ({ row }) => <span className="whitespace-nowrap text-sm font-medium">{TRANSACTION_TYPE_LABELS[row.original.type]}</span> },
      { id: "reason", header: headerLabel("السبب"), cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.reason}</span> },
      { id: "ref", header: headerLabel("المرجع"), cell: ({ row }) => <Reference t={row.original} /> },
      { id: "currency", header: headerLabel("العملة"), cell: ({ row }) => <Mono className="text-xs">{row.original.currency}</Mono> },
      {
        id: "amount",
        meta: { numeric: true },
        header: headerLabel("المبلغ"),
        cell: ({ row }) => <Money value={row.original.display_amount} className={cn("text-sm font-medium", row.original.amount.startsWith("-") ? "text-destructive" : "text-success")} />,
      },
      { id: "after", meta: { numeric: true }, header: headerLabel("الرصيد بعد"), cell: ({ row }) => <Money value={row.original.display_balance_after} muted className="text-xs" /> },
    ],
    [now],
  );

  return (
    <section aria-label="سجل الحركات" className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">سجل الحركات</h2>
      <DataTable<WalletTransaction>
        testId="wallet-transactions"
        caption="سجل حركات محفظة المتجر"
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
        emptyState={<EmptyState title="لا حركات بعد" description="تظهر هنا تحصيلات الطلبات المدفوعة إلكترونياً والاسترجاعات والعمولات والسحوبات." />}
        noResultsState={<EmptyState title="لا حركات تطابق الفلاتر" description="غيّر العملة أو النوع أو النطاق الزمني." />}
        toolbar={
          <FilterBar activeCount={active} onClear={() => set({ currency: null, type: null, from: null, to: null })}>
            <FilterSelect label="العملة" value={filters.currency ?? ""} onChange={(v) => set({ currency: (v || null) as (typeof CURRENCIES)[number] | null })} options={CURRENCIES.map((c) => ({ value: c, label: `${c} · ${CURRENCY_SHORT[c]}` }))} testId="tx-currency" />
            <FilterSelect label="النوع" value={filters.type ?? ""} onChange={(v) => set({ type: (v || null) as (typeof TRANSACTION_TYPES)[number] | null })} options={TRANSACTION_TYPES.map((t) => ({ value: t, label: TRANSACTION_TYPE_LABELS[t] }))} testId="tx-type" />
            <label className="flex flex-col gap-1 text-xs text-muted-foreground md:flex-row md:items-center md:gap-1.5">
              من
              <input type="date" dir="ltr" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value || null })} className="h-11 rounded-lg border border-input bg-card px-2 font-mono text-sm text-foreground md:h-8" aria-label="من تاريخ" data-testid="tx-from" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground md:flex-row md:items-center md:gap-1.5">
              إلى
              <input type="date" dir="ltr" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value || null })} className="h-11 rounded-lg border border-input bg-card px-2 font-mono text-sm text-foreground md:h-8" aria-label="إلى تاريخ" data-testid="tx-to" />
            </label>
          </FilterBar>
        }
        renderMobileCard={(t) => (
          <div className="flex min-h-16 w-full items-center gap-3 p-3" data-testid="tx-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm font-medium">
                {TRANSACTION_TYPE_LABELS[t.type]} <Mono className="text-xs text-muted-foreground">{t.currency}</Mono>
              </span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <time dateTime={t.created_at}>{formatRelative(t.created_at, now)}</time>
                <Reference t={t} plain />
              </span>
            </span>
            <span className="flex flex-col items-end gap-0.5">
              <Money value={t.display_amount} className={cn("text-base font-semibold", t.amount.startsWith("-") ? "text-destructive" : "text-success")} />
              <Money value={t.display_balance_after} muted className="text-xs" />
            </span>
          </div>
        )}
      />
    </section>
  );
}
