"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AccessGate } from "@/components/shared/access-gate";
import { DataTable, headerLabel } from "@/components/shared/data-table/data-table";
import { FilterBar, FilterSelect, SearchBox } from "@/components/shared/data-table/filter-bar";
import { useTableUrlState } from "@/components/shared/data-table/use-table-url-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { useCampaigns } from "@/features/marketing/api";
import { BackToHub, OwnerGate } from "@/features/marketing/components/shared";
import { AUDIENCE_LABELS, CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUSES, CHANNEL_LABELS, type Campaign } from "@/features/marketing/schemas";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/** US-13.4.1 — campaigns list (owner only, feature `campaigns`). */
const filterParsers = { q: parseAsString.withDefault(""), status: parseAsStringLiteral(CAMPAIGN_STATUSES) };
const newButtonClass = "inline-flex h-11 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80 lg:h-9";

export function CampaignStatusText({ status, className }: { status: Campaign["status"]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", status === "draft" && "text-muted-foreground", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", status === "sent" ? "bg-success" : status === "scheduled" ? "bg-warning" : "bg-muted-foreground")} />
      {CAMPAIGN_STATUS_LABELS[status]}
    </span>
  );
}

export function audienceText(c: Pick<Campaign, "audience_type" | "product">) {
  return c.audience_type === "bought_product" ? `${AUDIENCE_LABELS.bought_product}: ${c.product?.name ?? "—"}` : AUDIENCE_LABELS[c.audience_type];
}

export function CampaignsScreen() {
  return (
    <AccessGate feature="campaigns">
      <OwnerGate description="الحملات مقصورة على مالك المتجر.">
        <Inner />
      </OwnerGate>
    </AccessGate>
  );
}

function Inner() {
  const router = useRouter();
  const [filters, setFilters] = useQueryStates(filterParsers, { history: "replace" });
  const table = useTableUrlState();
  const list = useCampaigns({ q: filters.q || undefined, status: filters.status ?? undefined });
  const isFiltered = !!filters.q || !!filters.status;

  const columns = useMemo<ColumnDef<Campaign, unknown>[]>(
    () => [
      { id: "name", header: headerLabel("الحملة"), cell: ({ row }) => (<span className="flex min-w-40 flex-col leading-tight"><span className="truncate font-medium">{row.original.name}</span><span className="truncate text-xs text-muted-foreground">{audienceText(row.original)}</span></span>) },
      { id: "channel", header: headerLabel("القناة"), cell: ({ row }) => <span className="whitespace-nowrap text-xs">{CHANNEL_LABELS[row.original.channel]}</span> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <CampaignStatusText status={row.original.status} /> },
      { id: "when", header: headerLabel("الوقت"), cell: ({ row }) => (<span className="whitespace-nowrap text-xs text-muted-foreground">{row.original.status === "sent" && row.original.sent_at ? formatRelative(row.original.sent_at) : row.original.status === "scheduled" && row.original.scheduled_at ? formatDateTime(row.original.scheduled_at) : formatRelative(row.original.created_at)}</span>) },
      { id: "recipients", meta: { numeric: true }, header: headerLabel("المستلمون"), cell: ({ row }) => { const r = row.original.recipients; return row.original.status === "draft" ? <span className="text-xs text-muted-foreground">—</span> : <Mono>{r.sent + r.pending + r.failed}{r.failed ? <span className="text-xs text-destructive"> ({r.failed} فشل)</span> : null}</Mono>; } },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5" data-testid="campaigns-screen">
      <BackToHub />
      <PageHeader title="الحملات" description="رسالة واحدة لجمهور محدد عبر قناة مربوطة — فوراً أو في وقت مجدول." actions={<Link href="/dashboard/marketing/campaigns/new" className={newButtonClass} data-testid="new-campaign">حملة جديدة</Link>} />
      <DataTable
        columns={columns}
        data={list.data?.results}
        getRowId={(c) => String(c.id)}
        caption="الحملات"
        total={list.data?.count ?? 0}
        page={1}
        pageSize={100}
        onPageChange={() => undefined}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        isFiltered={isFiltered}
        emptyState={<EmptyState title="لا حملات بعد" description="ابدأ بحملة واتساب لعملائك." action={<Link href="/dashboard/marketing/campaigns/new" className={newButtonClass}>حملة جديدة</Link>} />}
        noResultsState={<EmptyState title="لا نتائج مطابقة" description="غيّر البحث أو الفلتر." />}
        onRowOpen={(c) => router.push(`/dashboard/marketing/campaigns/${c.id}`)}
        toolbar={
          <FilterBar search={<SearchBox value={filters.q} onChange={(q) => void setFilters({ q: q || null })} placeholder="ابحث باسم الحملة" />} activeCount={Number(!!filters.status)} onClear={() => void setFilters({ q: null, status: null })}>
            <FilterSelect label="الحالة" value={filters.status ?? ""} onChange={(v) => void setFilters({ status: (v || null) as typeof filters.status })} options={CAMPAIGN_STATUSES.map((s) => ({ value: s, label: CAMPAIGN_STATUS_LABELS[s] }))} testId="campaign-status" />
          </FilterBar>
        }
        renderMobileCard={(c) => (
          <button type="button" onClick={() => router.push(`/dashboard/marketing/campaigns/${c.id}`)} className="flex min-h-16 w-full items-center gap-3 p-3 text-start" data-testid="campaign-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1"><span className="truncate text-sm font-medium">{c.name}</span><span className="truncate text-xs text-muted-foreground">{CHANNEL_LABELS[c.channel]} · {audienceText(c)}</span></span>
            <CampaignStatusText status={c.status} className="text-xs" />
          </button>
        )}
        testId="campaigns-table"
      />
    </div>
  );
}
