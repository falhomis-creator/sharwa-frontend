"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, headerLabel } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useWallet } from "@/features/platform-admin/api/hooks";
import { Code } from "@/features/platform-admin/components/bits";
import { WALLET_REASON_LABELS, type WalletDetail } from "@/features/platform-admin/schemas";

/** `console.<base>/wallets/<phone>` (M20 US-20.5 a4) — balances per currency and the ledger, read-only. */
type Tx = WalletDetail["transactions"][number];

export function WalletScreen({ phone }: { phone: string }) {
  const q = useWallet(phone);
  const [now] = useState(() => new Date());
  const columns = useMemo<ColumnDef<Tx, unknown>[]>(
    () => [
      { id: "reason", header: headerLabel("السبب"), cell: ({ row }) => <span className="whitespace-nowrap">{WALLET_REASON_LABELS[row.original.reason]}</span> },
      {
        id: "amount",
        meta: { numeric: true },
        header: headerLabel("المبلغ"),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 whitespace-nowrap" data-testid="tx-amount">
            <Mono aria-label={row.original.direction === "credit" ? "إضافة" : "خصم"} className={row.original.direction === "credit" ? "text-success" : "text-destructive"}>
              {row.original.direction === "credit" ? "+" : "−"}
            </Mono>
            <Money value={row.original.display_amount} />
          </span>
        ),
      },
      { id: "reference", header: headerLabel("المرجع"), cell: ({ row }) => <Code>{row.original.reference}</Code> },
      {
        id: "at",
        header: headerLabel("الوقت"),
        cell: ({ row }) => (
          <time dateTime={row.original.created_at} title={formatDateTime(row.original.created_at)} className="whitespace-nowrap text-xs text-muted-foreground">
            {formatRelative(row.original.created_at, now)}
          </time>
        ),
      },
    ],
    [now],
  );

  if (q.isLoading) return <Skeleton className="h-40 w-full" />;
  if (isApiError(q.error) && q.error.status === 404) return <EmptyState title="لا محفظة بهذا الرقم" description={phone} />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const w = q.data;

  return (
    <div className="flex flex-col gap-6" data-testid="wallet-detail">
      <PageHeader title={w.customer_name ?? "محفظة شروة باي"} eyebrow={w.customer_phone} description={w.is_merchant ? "محفظة تاجر — تُخصم منها رسوم المنصة (platform_fee)." : "محفظة عميل."} />
      <section aria-label="الأرصدة" className="flex flex-wrap gap-x-10 gap-y-4 border-b border-border pb-6" data-testid="wallet-balances">
        {w.balances.length ? (
          w.balances.map((b) => (
            <div key={b.currency} className="flex flex-col gap-1">
              <Mono className="text-xs text-muted-foreground">{b.currency}</Mono>
              <Money value={b.display_balance} className="text-2xl font-semibold" />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">بلا رصيد.</p>
        )}
      </section>
      <DataTable<Tx>
        testId="wallet-transactions"
        caption="حركات المحفظة"
        columns={columns}
        data={w.transactions}
        getRowId={(r) => String(r.id)}
        total={w.transactions.length}
        page={1}
        pageSize={Math.max(50, w.transactions.length)}
        onPageChange={() => undefined}
        isLoading={false}
        emptyState={<EmptyState title="لا حركات" />}
        renderMobileCard={(t) => (
          <div className="flex items-center justify-between gap-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm">{WALLET_REASON_LABELS[t.reason]}</span>
              <Code className="text-muted-foreground">{t.reference}</Code>
            </span>
            <span className="inline-flex items-center gap-1">
              <Mono className={t.direction === "credit" ? "text-success" : "text-destructive"}>{t.direction === "credit" ? "+" : "−"}</Mono>
              <Money value={t.display_amount} />
            </span>
          </div>
        )}
      />
    </div>
  );
}
