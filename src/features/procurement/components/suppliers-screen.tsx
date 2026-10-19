"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, SearchBox, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSuppliers } from "@/features/procurement/api";
import type { Supplier } from "@/features/procurement/schemas";
import { ProcurementGate, useProcurementAccess } from "@/features/procurement/components/bits";
import { SupplierSheet } from "@/features/procurement/components/supplier-form";

/** `/dashboard/suppliers` (M23 US-23.1, FR-23.02): table + side sheet, `q` in the URL. */
export function SuppliersScreen() {
  return (
    <ProcurementGate>
      <SuppliersInner />
    </ProcurementGate>
  );
}

const PAGE_SIZE = 20;

function SuppliersInner() {
  const router = useRouter();
  const table = useTableUrlState();
  const [{ q }, setParams] = useQueryStates({ q: parseAsString.withDefault("") }, { history: "replace" });
  const { canManage } = useProcurementAccess();
  const [sheet, setSheet] = useState<{ open: boolean; supplier: Supplier | null }>({ open: false, supplier: null });
  const query = useSuppliers({ q: q || undefined, page: table.page > 1 ? table.page : undefined });

  const columns = useMemo<ColumnDef<Supplier, unknown>[]>(
    () => [
      {
        id: "name",
        header: headerLabel("المورد"),
        cell: ({ row }) => (
          <Link href={`/dashboard/suppliers/${row.original.id}`} className="flex min-w-40 flex-col leading-tight hover:underline" onClick={(e) => e.stopPropagation()} data-testid="supplier-link">
            <span className="truncate font-medium">{row.original.name}</span>
            {row.original.contact_name ? <span className="text-xs text-muted-foreground">{row.original.contact_name}</span> : null}
          </Link>
        ),
      },
      {
        id: "phone",
        header: headerLabel("الهاتف"),
        cell: ({ row }) => (row.original.phone ? <Mono className="text-muted-foreground">{prettyPhone(row.original.phone)}</Mono> : <span className="text-muted-foreground">—</span>),
      },
      {
        id: "orders",
        meta: { numeric: true },
        header: headerLabel("أوامر الشراء"),
        cell: ({ row }) => <Mono>{row.original.orders_count}</Mono>,
      },
      {
        id: "active",
        header: headerLabel("الحالة"),
        cell: ({ row }) => <span className={row.original.is_active ? "text-foreground" : "text-muted-foreground"}>{row.original.is_active ? "نشط" : "غير نشط"}</span>,
      },
      {
        id: "edit",
        header: () => <span className="sr-only">إجراءات</span>,
        cell: ({ row }) =>
          canManage ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-11 lg:h-7"
              onClick={(e) => {
                e.stopPropagation();
                setSheet({ open: true, supplier: row.original });
              }}
            >
              تعديل
            </Button>
          ) : null,
      },
    ],
    [canManage],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="الموردون"
        description="من تشتري منهم البضاعة. أوامر الشراء تمر بالموافقة ثم تُستلم فيُحدَّث المخزون تلقائياً."
        actions={
          <>
            <Link href="/dashboard/purchase-orders" className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-1.5 lg:h-9")} data-testid="to-purchase-orders">
              <ClipboardList className="size-4" aria-hidden /> أوامر الشراء
            </Link>
            {canManage ? (
              <Button className="h-11 gap-1.5 lg:h-9" onClick={() => setSheet({ open: true, supplier: null })} data-testid="new-supplier">
                <Plus className="size-4" aria-hidden /> مورد جديد
              </Button>
            ) : null}
          </>
        }
      />
      <DataTable<Supplier>
        testId="suppliers-table"
        caption="الموردون"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={PAGE_SIZE}
        onPageChange={table.setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={Boolean(q)}
        onRowOpen={(r) => router.push(`/dashboard/suppliers/${r.id}`)}
        emptyState={
          <EmptyState
            title="لا موردين بعد"
            description="أضف أول مورد لتبدأ أوامر الشراء."
            action={canManage ? <Button onClick={() => setSheet({ open: true, supplier: null })} className="h-11 lg:h-9">مورد جديد</Button> : undefined}
          />
        }
        renderMobileCard={(s) => (
          <Link href={`/dashboard/suppliers/${s.id}`} className="flex flex-col gap-1 p-3">
            <span className="font-medium">{s.name}</span>
            <span className="flex gap-3 text-xs text-muted-foreground">
              {s.phone ? <Mono>{prettyPhone(s.phone)}</Mono> : null}
              <span>
                <Mono>{s.orders_count}</Mono> أمر
              </span>
              {!s.is_active ? <span>غير نشط</span> : null}
            </span>
          </Link>
        )}
        toolbar={
          <FilterBar activeCount={0} search={<SearchBox value={q} onChange={(v) => { void setParams({ q: v || null }); table.resetPage(); }} placeholder="اسم المورد أو الهاتف" label="بحث في الموردين" />}>
            {null}
          </FilterBar>
        }
      />
      <SupplierSheet open={sheet.open} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))} supplier={sheet.supplier} />
    </div>
  );
}
