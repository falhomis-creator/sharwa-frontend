"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Route } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, FilterSelect, SearchBox, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useLocations, useSetMode } from "@/features/locations/api";
import { useLocationFilters } from "@/features/locations/hooks/use-location-filters";
import { LOCATION_FLAGS, LOCATION_FLAG_LABELS, OWNERSHIPS, OWNERSHIP_LABELS, type LocationListItem } from "@/features/locations/schemas";

/**
 * `/dashboard/locations` (M22, T121): the feature gate, then the mode gate (US-22.1 activation
 * screen while `multi_location_enabled=false`), then the dense list (US-22.2) — code Mono,
 * server `display_type` as plain text, children indented under their parent with a thin
 * line, every filter in the URL, cards on phones.
 */
export function LocationsScreen() {
  return (
    <AccessGate feature="multi_location">
      <LocationsBody />
    </AccessGate>
  );
}

function LocationsBody() {
  const router = useRouter();
  const { session } = useAccess();
  const isOwner = session.kind === "merchant";
  const table = useTableUrlState();
  const { filters, setFilters, activeCount, isFiltered, clear } = useLocationFilters();
  const params = {
    q: filters.q || undefined,
    flag: filters.flag || undefined,
    ownership: filters.ownership || undefined,
    is_active: filters.is_active || undefined,
    page: table.page,
    page_size: table.pageSize,
  };
  const query = useLocations(params);
  const data = query.data;

  const set = (patch: Parameters<typeof setFilters>[0]) => {
    void setFilters(patch);
    table.resetPage();
  };

  const columns = useMemo<ColumnDef<LocationListItem, unknown>[]>(
    () => [
      {
        id: "code",
        meta: { className: "whitespace-nowrap" },
        header: headerLabel("الكود"),
        cell: ({ row }) => (
          <span className={cn("flex items-center", row.original.parent_location !== null && "ps-5 border-s border-border ms-2")}>
            <Link href={`/dashboard/locations/${row.original.id}`} tabIndex={-1} className="hover:underline" onClick={(e) => e.stopPropagation()}>
              <Mono>{row.original.code}</Mono>
            </Link>
          </span>
        ),
      },
      { id: "name", header: headerLabel("الاسم"), cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { id: "city", header: headerLabel("المدينة"), cell: ({ row }) => <span className="text-muted-foreground">{row.original.city || "—"}</span> },
      { id: "display_type", header: headerLabel("نوع العرض"), cell: ({ row }) => <span>{row.original.display_type}</span> },
      { id: "ownership", header: headerLabel("الملكية"), cell: ({ row }) => <span className="text-muted-foreground">{OWNERSHIP_LABELS[row.original.ownership]}</span> },
      {
        id: "is_active",
        header: headerLabel("الحالة"),
        cell: ({ row }) => <ActiveDot active={row.original.is_active} />,
      },
      {
        id: "products_count",
        meta: { numeric: true },
        header: headerLabel("منتجات مخزّنة"),
        cell: ({ row }) => <Mono>{row.original.products_count}</Mono>,
      },
    ],
    [],
  );

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="المواقع" description="المستودعات والفروع ونقاط الاستلام والمركبات — كل موقع بما يستطيع فعله." />
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      </div>
    );
  }
  if (query.error && !data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="المواقع" />
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }
  if (data && !data.multi_location_enabled) return <ActivationScreen isOwner={isOwner} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="المواقع"
        description="المستودعات والفروع ونقاط الاستلام والمركبات — كل موقع بما يستطيع فعله، لا بنوع جامد."
        actions={
          <>
            <Link href="/dashboard/locations/routing" className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9" data-testid="routing-link">
              <Route className="size-4" aria-hidden /> قواعد التوجيه
            </Link>
            {isOwner ? (
              <Link href="/dashboard/locations/new" className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 lg:h-9" data-testid="new-location">
                <Plus className="size-4" aria-hidden /> موقع جديد
              </Link>
            ) : null}
          </>
        }
      />
      <DataTable<LocationListItem>
        testId="locations-table"
        caption="قائمة المواقع"
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
        isFiltered={isFiltered}
        onRowOpen={(row) => router.push(`/dashboard/locations/${row.id}`)}
        emptyState={
          <EmptyState
            title="لا مواقع بعد — أضف المستودع الرئيسي"
            description="أول موقع هو مصدر مخزونك وطلباتك؛ أضف الفروع ونقاط الاستلام بعده."
            action={isOwner ? <Link href="/dashboard/locations/new" className="inline-flex h-11 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground lg:h-9">موقع جديد</Link> : undefined}
          />
        }
        noResultsState={<EmptyState title="لا مواقع تطابق الفلاتر" action={<Button variant="outline" className="h-11 lg:h-9" onClick={clear}>مسح الفلاتر</Button>} />}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={clear} search={<SearchBox value={filters.q} onChange={(q) => set({ q: q || null })} placeholder="الاسم أو الكود أو المدينة" label="بحث في المواقع" />}>
            <FilterSelect label="القدرة" value={filters.flag} onChange={(v) => set({ flag: v || null })} options={LOCATION_FLAGS.map((f) => ({ value: f, label: LOCATION_FLAG_LABELS[f].label }))} testId="filter-flag" />
            <FilterSelect label="الملكية" value={filters.ownership} onChange={(v) => set({ ownership: v || null })} options={OWNERSHIPS.map((o) => ({ value: o, label: OWNERSHIP_LABELS[o] }))} testId="filter-ownership" />
            <FilterSelect label="الحالة" value={filters.is_active} onChange={(v) => set({ is_active: v || null })} options={[{ value: "true", label: "نشط" }, { value: "false", label: "معطّل" }]} />
          </FilterBar>
        }
        renderMobileCard={(row) => (
          <Link href={`/dashboard/locations/${row.id}`} className="flex min-h-11 flex-col gap-1 p-3" data-testid="location-card">
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium">{row.name}</span>
              <Mono className="text-xs text-muted-foreground">{row.code}</Mono>
            </span>
            <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{row.display_type}{row.city ? ` · ${row.city}` : ""}</span>
              <ActiveDot active={row.is_active} />
            </span>
          </Link>
        )}
      />
    </div>
  );
}

export function ActiveDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span aria-hidden className={cn("size-2 rounded-full", active ? "bg-success" : "bg-muted-foreground/50")} />
      {active ? "نشط" : "معطّل"}
    </span>
  );
}

/** US-22.1 — the mode is off: what will change, the read-only default location, one switch with a confirm. */
function ActivationScreen({ isOwner }: { isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const mode = useSetMode();
  return (
    <div className="flex flex-col gap-6" data-testid="locations-activation">
      <PageHeader title="المواقع" description="تعدد المواقع غير مفعّل. متجرك يعمل من موقع واحد." />
      <section className="flex max-w-2xl flex-col gap-4 rounded-lg border border-border p-6">
        <p className="text-base font-medium">ماذا يتغير عند التفعيل؟</p>
        <p className="max-w-prose text-sm text-muted-foreground">
          يظهر عمود الموقع في جدول المخزون وتُحفظ الكميات لكل موقع على حدة، وتُوجَّه الطلبات تلقائياً إلى الموقع المناسب حسب قواعد التوجيه التي تضبطها.
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-muted/40 p-3 text-sm">
          <dt className="text-muted-foreground">الموقع الحالي</dt>
          <dd className="flex items-center gap-2">
            <Mono>WH-01</Mono> المستودع الرئيسي <span className="text-xs text-muted-foreground">(للقراءة)</span>
          </dd>
        </dl>
        <div>
          <Button className="h-11 lg:h-9" onClick={() => setOpen(true)} disabled={!isOwner} title={isOwner ? undefined : "التفعيل مقصور على مالك المتجر"} data-testid="activate-mode">
            تفعيل المواقع المتعددة
          </Button>
        </div>
      </section>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>تفعيل المواقع المتعددة؟</DialogTitle>
          <DialogDescription>سيُحفظ المخزون لكل موقع على حدة من الآن، وتظهر قائمة المواقع فارغة لتضيف إليها.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" className="h-11 lg:h-9" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              className="h-11 lg:h-9"
              disabled={mode.isPending}
              onClick={() =>
                mode.mutate(
                  { enabled: true },
                  {
                    onSuccess: () => {
                      setOpen(false);
                      toast.success("فُعِّلت المواقع المتعددة");
                    },
                    onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر التفعيل"),
                  },
                )
              }
              data-testid="confirm-activate"
            >
              تفعيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
