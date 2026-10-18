"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, SearchBox, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { formatDateTime, formatNumber, formatRelative, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useWallets } from "@/features/wallets/api";
import { WALLET_SORTS, WALLET_SORT_LABELS, type WalletListItem } from "@/features/wallets/schemas";
import { WalletDetailView } from "@/features/wallets/components/wallet-detail";

/**
 * `/dashboard/customers/wallets` (M35 US-35.1): a dense table with a single text totals
 * strip (no cards), `q` + `sort` in the URL, the `?wallet=` side sheet rendering the same
 * detail as the full page. Phones get cards with the balance large in Mono.
 */
const parsers = {
  q: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(WALLET_SORTS).withDefault("last_transaction_at"),
  wallet: parseAsInteger,
};

export function WalletsScreen() {
  return (
    <AccessGate feature="customer_wallets" permission="customers.view">
      <WalletsInner />
    </AccessGate>
  );
}

function WalletsInner() {
  const router = useRouter();
  const table = useTableUrlState();
  const [{ q, sort, wallet }, setParams] = useQueryStates(parsers, { history: "replace" });
  const { canPermission } = useAccess();
  const canCreate = canPermission("customers.edit_profile");
  const [now] = useState(() => new Date());
  const query = useWallets({ q: q || undefined, sort, page: table.page, page_size: table.pageSize });
  const data = query.data;

  const set = (patch: Partial<{ q: string | null; sort: (typeof WALLET_SORTS)[number] }>) => {
    void setParams(patch);
    table.resetPage();
  };

  const columns = useMemo<ColumnDef<WalletListItem, unknown>[]>(
    () => [
      {
        id: "phone",
        header: headerLabel("الهاتف"),
        cell: ({ row }) => (
          <button type="button" tabIndex={-1} onClick={() => void setParams({ wallet: row.original.id })} className="underline-offset-4 hover:underline" data-testid="wallet-open">
            <Mono className="text-sm">{prettyPhone(row.original.customer_phone)}</Mono>
          </button>
        ),
        meta: { className: "whitespace-nowrap" },
      },
      {
        id: "name",
        header: headerLabel("العميل"),
        cell: ({ row }) => (
          <span className="flex min-w-32 items-center gap-2">
            <span className="truncate">{row.original.customer_name}</span>
            {!row.original.is_active ? <span className="text-xs text-destructive">معطّلة</span> : null}
          </span>
        ),
      },
      {
        id: "balance",
        meta: { numeric: true },
        header: headerLabel("الرصيد"),
        cell: ({ row }) => <Money value={row.original.display_balance} className="font-medium" />,
      },
      {
        id: "last",
        header: headerLabel("آخر حركة"),
        cell: ({ row }) =>
          row.original.last_transaction_at ? (
            <time dateTime={row.original.last_transaction_at} title={formatDateTime(row.original.last_transaction_at)} className="text-xs text-muted-foreground">
              {formatRelative(row.original.last_transaction_at, now)}
            </time>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "count",
        meta: { numeric: true },
        header: headerLabel("الحركات"),
        cell: ({ row }) => <Mono className="text-xs text-muted-foreground">{formatNumber(row.original.transactions_count)}</Mono>,
      },
    ],
    [now, setParams],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="محافظ العملاء"
        description="رصيد مسبق لكل عميل برقم هاتفه — بالريال السعودي فقط — مع دفتر حركات لا يُعدَّل."
        actions={
          canCreate ? (
            <Link href="/dashboard/customers/wallets/new" className={cn(buttonVariants(), "h-11 lg:h-9")} data-testid="new-wallet">
              <Plus className="size-4" aria-hidden /> محفظة جديدة
            </Link>
          ) : null
        }
      />
      <p className="text-sm text-muted-foreground" data-testid="wallets-totals">
        {data ? (
          <>
            مجموع الأرصدة <Money value={data.totals.display_balance_sum} className="text-foreground" />
            <span aria-hidden className="px-2 text-border">
              ·
            </span>
            محافظ نشطة <Mono className="text-foreground">{formatNumber(data.totals.active_count)}</Mono>
            <span aria-hidden className="px-2 text-border">
              ·
            </span>
            محافظ العملاء بالريال السعودي فقط
          </>
        ) : (
          "…"
        )}
      </p>
      <DataTable<WalletListItem>
        testId="wallets-table"
        caption="قائمة محافظ العملاء"
        columns={columns}
        data={data?.results}
        getRowId={(r) => String(r.id)}
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
        isFiltered={Boolean(q)}
        onRowOpen={(row) => void setParams({ wallet: row.id })}
        emptyState={
          <EmptyState
            title="لا محافظ بعد"
            description="أنشئ محفظة لعميل أو فعّل الدفع بالمحفظة في صفحة الدفع؛ تُنشأ المحافظ تلقائياً عند أول استرجاع إلى الرصيد."
            action={
              canCreate ? (
                <Link href="/dashboard/customers/wallets/new" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
                  محفظة جديدة
                </Link>
              ) : undefined
            }
          />
        }
        noResultsState={<EmptyState title="لا محافظ تطابق البحث" description="جرّب رقم هاتف آخر أو اسماً مختلفاً." />}
        toolbar={
          <FilterBar activeCount={0} onClear={() => set({ q: null })} search={<SearchBox value={q} onChange={(v) => set({ q: v || null })} placeholder="الهاتف أو اسم العميل" label="بحث في المحافظ" />}>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              ترتيب
              <NativeSelect value={sort} onChange={(e) => set({ sort: e.target.value as (typeof WALLET_SORTS)[number] })} className="h-11 md:h-8" aria-label="ترتيب المحافظ" data-testid="wallets-sort">
                {WALLET_SORTS.map((s) => (
                  <option key={s} value={s}>
                    {WALLET_SORT_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </FilterBar>
        }
        renderMobileCard={(w) => (
          <button type="button" onClick={() => router.push(`/dashboard/customers/wallets/${w.id}`)} className="flex min-h-16 w-full items-center gap-3 p-3 text-start" data-testid="wallet-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <Mono className="text-sm">{prettyPhone(w.customer_phone)}</Mono>
              <span className="truncate text-sm text-muted-foreground">{w.customer_name}</span>
            </span>
            <Money value={w.display_balance} className="text-base font-semibold" />
          </button>
        )}
      />
      <Sheet open={wallet !== null} onOpenChange={(o) => !o && void setParams({ wallet: null })}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 data-[side=left]:w-full data-[side=left]:sm:max-w-2xl" data-testid="wallet-sheet">
          <SheetTitle className="sr-only">تفاصيل المحفظة {wallet ?? ""}</SheetTitle>
          <SheetDescription className="sr-only">الرصيد والحركات والنقاط</SheetDescription>
          {wallet !== null ? <WalletDetailView key={wallet} walletId={wallet} variant="sheet" /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
