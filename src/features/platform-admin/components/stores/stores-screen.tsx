"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable, FilterBar, FilterSelect, SearchBox, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { formatDate } from "@/lib/format";
import { usePlans, useStores } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { ReadOnlyNote, StatusText } from "@/features/platform-admin/components/bits";
import { ActiveCell, ProvisioningCell, baseStoreColumns } from "@/features/platform-admin/components/store-cells";
import { BulkOverrideDialog, ReprovisionDialog } from "@/features/platform-admin/components/stores/bulk-dialogs";
import { SharwaShipCell, isProvisioningLive } from "@/features/platform-admin/components/stores/store-bits";
import { PROVISIONING_LABELS, PROVISIONING_STATUSES, type StoreRow } from "@/features/platform-admin/schemas";

/**
 * `console.<base>/stores` (M20 US-20.2). Server-paginated; `status` (+ `stalled`), `plan`,
 * `is_active`, `q` live in the URL (FR-20.03). Bulk: re-provision and a feature override,
 * both previewed by count and reported per store (FR-20.02).
 */
const STATUS_FILTERS = [...PROVISIONING_STATUSES, "stalled"] as const;
const parsers = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(STATUS_FILTERS),
  plan: parseAsString.withDefault(""),
  is_active: parseAsStringLiteral(["true", "false"] as const),
};

export function StoresScreen() {
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const [now] = useState(() => new Date());
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [bulk, setBulk] = useState<null | "reprovision" | "override">(null);
  const canStores = useCanWrite("stores");
  const canBilling = useCanWrite("billing");
  const plans = usePlans();

  const params = { q: f.q || undefined, status: f.status ?? undefined, plan: f.plan || undefined, is_active: f.is_active ?? undefined, page: table.page, page_size: table.pageSize, ordering: table.ordering || undefined };
  const [polling, setPolling] = useState(false);
  const query = useStores(params, { refetchInterval: polling ? 3000 : false });
  const rows = query.data?.results;
  const needsPoll = Boolean(rows?.some((r) => isProvisioningLive(r) || r.sharwa_ship === "activating" || r.sharwa_ship === "deactivating"));
  if (needsPoll !== polling) setPolling(needsPoll);

  const set = (patch: Partial<{ q: string | null; status: (typeof STATUS_FILTERS)[number] | null; plan: string | null; is_active: "true" | "false" | null }>) => {
    void setF(patch);
    table.resetPage();
    setSelection({});
  };
  const activeCount = Number(Boolean(f.status)) + Number(Boolean(f.plan)) + Number(Boolean(f.is_active));
  const clear = () => set({ q: null, status: null, plan: null, is_active: null });

  const columns = useMemo<ColumnDef<StoreRow, unknown>[]>(() => {
    const base = baseStoreColumns(now);
    return [
      ...base.slice(0, 5),
      { id: "plan", header: headerLabel("الباقة"), cell: ({ row }) => <span className="whitespace-nowrap text-xs">{row.original.current_plan?.name ?? <span className="text-muted-foreground">بلا باقة</span>}</span> },
      { id: "active", header: headerLabel("الحالة"), cell: ({ row }) => <ActiveCell row={row.original} /> },
      { id: "sharwa_ship", header: headerLabel("شروة شيب"), cell: ({ row }) => <SharwaShipCell state={row.original.sharwa_ship} /> },
      ...base.slice(5),
    ];
  }, [now]);

  const selectedRows = (ids: string[]) => (rows ?? []).filter((r) => ids.includes(r.schema_name));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="كل المتاجر" description="ابحث بالاسم أو المخطط أو الهاتف أو النطاق، وفلتر بالتجهيز والباقة والنشاط." />
      {!canStores ? <ReadOnlyNote /> : null}
      <DataTable<StoreRow>
        testId="stores-table"
        caption="متاجر المنصة"
        columns={columns}
        data={rows}
        getRowId={(r) => r.schema_name}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={(p) => {
          table.setPage(p);
          setSelection({});
        }}
        onPageSizeChange={table.setPageSize}
        ordering={table.ordering}
        onOrderingChange={table.setOrdering}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={activeCount > 0 || Boolean(f.q)}
        emptyState={<EmptyState title="لا متاجر بعد" />}
        noResultsState={<EmptyState title={f.status === "failed" ? "لا متاجر فاشلة" : "لا نتائج"} description="غيّر البحث أو الفلاتر." action={<Button variant="outline" className="h-11 lg:h-8" onClick={clear}>مسح الفلاتر</Button>} />}
        selectable={canStores || canBilling}
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        bulkActions={(ids) => (
          <>
            <Button size="sm" variant="outline" className="h-11 lg:h-7" disabled={!canStores} onClick={() => setBulk("reprovision")} data-testid="bulk-reprovision">
              إعادة التجهيز
            </Button>
            <Button size="sm" variant="outline" className="h-11 lg:h-7" disabled={!canBilling} onClick={() => setBulk("override")} data-testid="bulk-override">
              استثناء ميزة
            </Button>
            <span className="sr-only">{ids.length}</span>
          </>
        )}
        renderMobileCard={(r) => (
          <Link href={`/stores/${encodeURIComponent(r.schema_name)}`} className="flex flex-col gap-1 py-1" data-testid="store-card">
            <span className="font-medium">{r.name}</span>
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <bdi>
                <Mono>{r.schema_name}</Mono>
              </bdi>
              · {r.current_plan?.name ?? "بلا باقة"} · {formatDate(r.created_on)}
            </span>
            <span className="flex flex-wrap gap-3">
              <ProvisioningCell row={r} />
              <ActiveCell row={r} />
            </span>
          </Link>
        )}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={clear} search={<SearchBox value={f.q} onChange={(v) => set({ q: v || null })} placeholder="الاسم، المخطط، الهاتف، النطاق" label="بحث في المتاجر" />}>
            <FilterSelect
              label="التجهيز"
              value={f.status ?? ""}
              onChange={(v) => set({ status: (v || null) as (typeof STATUS_FILTERS)[number] | null })}
              options={[...PROVISIONING_STATUSES.map((s) => ({ value: s, label: PROVISIONING_LABELS[s] })), { value: "stalled", label: "متعثّر (> 30 دقيقة)" }]}
              testId="filter-status"
            />
            <FilterSelect
              label="الباقة"
              value={f.plan}
              onChange={(v) => set({ plan: v || null })}
              options={[...(plans.data ?? []).map((p) => ({ value: p.code, label: p.name })), { value: "none", label: "بلا باقة" }]}
              testId="filter-plan"
            />
            <FilterSelect
              label="النشاط"
              value={f.is_active ?? ""}
              onChange={(v) => set({ is_active: (v || null) as "true" | "false" | null })}
              options={[
                { value: "true", label: "نشط" },
                { value: "false", label: "غير نشط" },
              ]}
              testId="filter-active"
            />
          </FilterBar>
        }
      />
      {polling ? (
        <p className="text-xs text-muted-foreground" role="status">
          <StatusText tone="info">مهام قيد المعالجة — تتحدّث القائمة كل 3 ثوانٍ</StatusText>
        </p>
      ) : null}
      <ReprovisionDialog
        open={bulk === "reprovision"}
        onOpenChange={(o) => !o && setBulk(null)}
        stores={selectedRows(Object.keys(selection).filter((k) => selection[k]))}
        onDone={() => setSelection({})}
      />
      <BulkOverrideDialog
        open={bulk === "override"}
        onOpenChange={(o) => !o && setBulk(null)}
        schemas={Object.keys(selection).filter((k) => selection[k])}
        onDone={() => setSelection({})}
      />
    </div>
  );
}
