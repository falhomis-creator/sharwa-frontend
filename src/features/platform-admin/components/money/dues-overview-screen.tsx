"use client";

import { useMemo } from "react";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, FilterBar, FilterSelect, SearchBox, headerLabel } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { useDuesOverview } from "@/features/platform-admin/api/hooks";
import { Code } from "@/features/platform-admin/components/bits";
import { WalletBalances } from "@/features/platform-admin/components/money/wallet-balances";
import type { DuesOverviewRow } from "@/features/platform-admin/schemas";

/**
 * `console.<base>/dues` (M45 US-45.1): one row per active ready store, sorted by revenue
 * on the SERVER (no client re-sort), the merchant's Sharwa Pay balances per currency as
 * sent, and how many dues wait. `q` and `period` live in the URL (FR-45.07).
 */
const PERIODS = ["today", "7d", "30d"] as const;
const PERIOD_LABELS: Record<(typeof PERIODS)[number], string> = { today: "اليوم", "7d": "آخر 7 أيام", "30d": "آخر 30 يوماً" };
const parsers = { q: parseAsString.withDefault(""), period: parseAsStringLiteral(PERIODS) };

export function DuesOverviewScreen() {
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const query = useDuesOverview({ q: f.q || undefined, period: f.period ?? undefined });
  const rows = query.data?.results;

  const columns = useMemo<ColumnDef<DuesOverviewRow, unknown>[]>(
    () => [
      {
        id: "store",
        header: headerLabel("المتجر"),
        cell: ({ row }) => (
          <Link href={`/dues/${encodeURIComponent(row.original.schema_name)}`} className="whitespace-nowrap font-medium hover:underline" data-testid="dues-store-link">
            {row.original.name}
          </Link>
        ),
      },
      { id: "schema", header: headerLabel("المخطط"), cell: ({ row }) => <Code>{row.original.schema_name}</Code> },
      {
        id: "snapshot",
        header: headerLabel("آخر لقطة"),
        cell: ({ row }) => (row.original.snapshot ? <Mono className="text-xs text-muted-foreground">{row.original.snapshot.date}</Mono> : <span className="text-muted-foreground">—</span>),
      },
      { id: "orders", meta: { numeric: true }, header: headerLabel("الطلبات"), cell: ({ row }) => (row.original.snapshot ? <Mono>{row.original.snapshot.orders_count}</Mono> : <span className="text-muted-foreground">—</span>) },
      { id: "revenue", meta: { numeric: true }, header: headerLabel("الإيراد (ر.س)"), cell: ({ row }) => <Money value={row.original.snapshot?.display_revenue_sar} /> },
      { id: "wallet", meta: { numeric: true }, header: headerLabel("محفظة شروة باي"), cell: ({ row }) => <WalletBalances wallet={row.original.wallet} /> },
      {
        id: "pending",
        meta: { numeric: true },
        header: headerLabel("مستحقات معلّقة"),
        cell: ({ row }) => <Mono className={row.original.pending_count ? "text-foreground" : "text-muted-foreground"}>{row.original.pending_count}</Mono>,
      },
    ],
    [],
  );

  const filtered = Boolean(f.q || f.period);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="المستحقات" description="عمولات المبيعات وفواتير التطبيقات لكل المتاجر — التحصيل من محفظة شروة باي للتاجر أو الإعفاء، بقرار صريح لكل سجل." />
      <DataTable<DuesOverviewRow>
        testId="dues-overview"
        caption="مستحقات المتاجر"
        columns={columns}
        data={rows}
        getRowId={(r) => r.schema_name}
        total={rows?.length ?? 0}
        page={1}
        pageSize={Math.max(rows?.length ?? 0, 50)}
        onPageChange={() => undefined}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={filtered}
        emptyState={<EmptyState title="لا متاجر جاهزة" description="تظهر هنا المتاجر النشطة بعد اكتمال تجهيزها." />}
        noResultsState={<EmptyState title="لا نتائج" description="غيّر البحث أو الفترة." />}
        toolbar={
          <FilterBar
            activeCount={Number(Boolean(f.period))}
            onClear={() => void setF({ q: null, period: null })}
            search={<SearchBox value={f.q} onChange={(v) => void setF({ q: v || null })} placeholder="اسم المتجر أو المخطط" label="بحث في المتاجر" />}
          >
            <FilterSelect
              label="الفترة"
              value={f.period ?? ""}
              allLabel="آخر 30 يوماً (افتراضي)"
              onChange={(v) => void setF({ period: (v || null) as (typeof PERIODS)[number] | null })}
              options={PERIODS.filter((p) => p !== "30d").map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
              testId="filter-period"
            />
          </FilterBar>
        }
        renderMobileCard={(r) => (
          <Link href={`/dues/${encodeURIComponent(r.schema_name)}`} className="flex items-start justify-between gap-3 py-1">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-medium">{r.name}</span>
              <Money value={r.snapshot?.display_revenue_sar} className="text-xs" />
              {r.pending_count ? <span className="text-xs text-muted-foreground">مستحقات معلّقة: <Mono>{r.pending_count}</Mono></span> : null}
            </span>
            <WalletBalances wallet={r.wallet} />
          </Link>
        )}
      />
    </div>
  );
}
