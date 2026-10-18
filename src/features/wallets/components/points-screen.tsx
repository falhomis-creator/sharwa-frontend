"use client";

import Link from "next/link";
import { parseAsString, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { buttonVariants } from "@/components/ui/button";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, SearchBox, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { formatDateTime, formatNumber, formatRelative, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useLoyaltyProgram, usePointsList } from "@/features/wallets/api";
import type { PointsListItem } from "@/features/wallets/schemas";

/**
 * `/dashboard/customers/points` (M35 US-35.5): every `CustomerPoints` row, read-only —
 * earning and redeeming belong to the system. A phone without a wallet gets «إنشاء محفظة».
 */
export function PointsScreen() {
  return (
    <AccessGate feature="loyalty_settings" permission="customers.view">
      <PointsInner />
    </AccessGate>
  );
}

function PointsInner() {
  const table = useTableUrlState();
  const [{ q }, setParams] = useQueryStates({ q: parseAsString.withDefault("") }, { history: "replace" });
  const { canPermission } = useAccess();
  const canCreate = canPermission("customers.edit_profile");
  const program = useLoyaltyProgram();
  const [now] = useState(() => new Date());
  const query = usePointsList({ q: q || undefined, page: table.page, page_size: table.pageSize });
  const data = query.data;

  const columns = useMemo<ColumnDef<PointsListItem, unknown>[]>(
    () => [
      { id: "phone", header: headerLabel("الهاتف"), cell: ({ row }) => <Mono className="text-sm">{prettyPhone(row.original.customer_phone)}</Mono>, meta: { className: "whitespace-nowrap" } },
      { id: "name", header: headerLabel("العميل"), cell: ({ row }) => <span className="truncate">{row.original.customer_name}</span> },
      { id: "balance", meta: { numeric: true }, header: headerLabel("الرصيد"), cell: ({ row }) => <Mono className="font-medium">{formatNumber(row.original.balance)}</Mono> },
      {
        id: "last",
        header: headerLabel("آخر كسب"),
        cell: ({ row }) =>
          row.original.last_earn_at ? (
            <time dateTime={row.original.last_earn_at} title={formatDateTime(row.original.last_earn_at)} className="text-xs text-muted-foreground">
              {formatRelative(row.original.last_earn_at, now)}
            </time>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "wallet",
        header: headerLabel("المحفظة"),
        cell: ({ row }) =>
          row.original.wallet_id ? (
            <Link href={`/dashboard/customers/wallets/${row.original.wallet_id}?tab=points`} className="text-xs underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>
              فتح المحفظة
            </Link>
          ) : canCreate ? (
            <Link href={`/dashboard/customers/wallets/new?phone=${row.original.customer_phone}`} className="text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()} data-testid="points-create-wallet">
              إنشاء محفظة
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">لا محفظة</span>
          ),
      },
    ],
    [canCreate, now],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="نقاط الولاء"
        description="أرصدة النقاط لكل عميل — تُكسب وتُستبدل من النظام؛ القراءة فقط هنا."
        actions={
          <Link href="/dashboard/marketing/loyalty" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
            إعدادات البرنامج
          </Link>
        }
      />
      <p className="text-sm text-muted-foreground" data-testid="points-program">
        {program.data ? (
          program.data.is_enabled ? (
            <>
              البرنامج مفعّل · كل <Mono className="text-foreground">{program.data.riyals_per_point}</Mono> ر.س = نقطة · <Mono className="text-foreground">{program.data.points_per_riyal_redemption}</Mono> نقطة = ر.س
            </>
          ) : (
            "برنامج الولاء غير مفعّل — الأرصدة التاريخية تبقى مقروءة."
          )
        ) : (
          "…"
        )}
      </p>
      <DataTable<PointsListItem>
        testId="points-table"
        caption="أرصدة نقاط العملاء"
        columns={columns}
        data={data?.results}
        getRowId={(r) => r.customer_phone}
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
        emptyState={<EmptyState title="لا نقاط بعد" description="تُكسب النقاط من الطلبات المكتملة حين يكون البرنامج مفعّلاً." />}
        noResultsState={<EmptyState title="لا عملاء يطابقون البحث" />}
        toolbar={
          <FilterBar activeCount={0} search={<SearchBox value={q} onChange={(v) => { void setParams({ q: v || null }); table.resetPage(); }} placeholder="الهاتف أو الاسم" label="بحث في النقاط" />}>
            <span />
          </FilterBar>
        }
        renderMobileCard={(r) => (
          <div className="flex min-h-16 w-full items-center gap-3 p-3" data-testid="points-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <Mono className="text-sm">{prettyPhone(r.customer_phone)}</Mono>
              <span className="truncate text-sm text-muted-foreground">{r.customer_name}</span>
            </span>
            <Mono className="text-base font-semibold">{formatNumber(r.balance)}</Mono>
          </div>
        )}
      />
    </div>
  );
}
