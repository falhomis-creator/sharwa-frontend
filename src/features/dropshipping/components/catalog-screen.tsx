"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, FilterSelect, SearchBox, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { useConnection, useImportProducts, useSupplierCatalog } from "@/features/dropshipping/api";
import { IMPORT_STATUSES, IMPORT_STATUS_LABELS, SUPPLIER_LABELS, type CatalogItem, type ImportStatus, type SupplierCode } from "@/features/dropshipping/schemas";
import { DropshippingGate, DropshippingNav, StatusText } from "@/features/dropshipping/components/bits";

/**
 * `/dashboard/channels/dropshipping/catalog/[code]` (US-29.3, FR-29.05): the supplier's
 * products with the server's cost and suggested price, search / category / status in the
 * URL, bulk import with a count preview; `importing` rows are polled until they settle.
 */
const parsers = { q: parseAsString.withDefault(""), category: parseAsString.withDefault(""), import_status: parseAsStringLiteral(IMPORT_STATUSES) };
const PAGE_SIZE = 24;
const TONE: Record<ImportStatus, "muted" | "info" | "success" | "destructive"> = { not_imported: "muted", importing: "info", imported: "success", failed: "destructive" };

export function SupplierCatalogScreen({ code }: { code: SupplierCode }) {
  return (
    <DropshippingGate>
      <Inner code={code} />
    </DropshippingGate>
  );
}

function Inner({ code }: { code: SupplierCode }) {
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [pending, setPending] = useState<Array<number | string> | null>(null);
  const conn = useConnection(code);
  const query = useSupplierCatalog(code, { q: f.q || undefined, category: f.category || undefined, import_status: f.import_status ?? undefined, page: table.page > 1 ? table.page : undefined });
  const imp = useImportProducts(code);
  const set = (p: Parameters<typeof setF>[0]) => {
    void setF(p);
    table.resetPage();
    setSelection({});
  };

  const columns = useMemo<ColumnDef<CatalogItem, unknown>[]>(
    () => [
      {
        id: "name",
        header: headerLabel("المنتج"),
        cell: ({ row }) => (
          <span className="flex min-w-48 flex-col leading-tight">
            <span className="truncate">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.category}</span>
          </span>
        ),
      },
      { id: "cost", meta: { numeric: true }, header: headerLabel("تكلفة المورد"), cell: ({ row }) => <Money value={row.original.display_cost} /> },
      { id: "suggested", meta: { numeric: true }, header: headerLabel("السعر المقترح"), cell: ({ row }) => <Money value={row.original.display_suggested_price} /> },
      { id: "variants", meta: { numeric: true }, header: headerLabel("المتغيرات"), cell: ({ row }) => <Mono>{row.original.variants_count}</Mono> },
      {
        id: "status",
        header: headerLabel("الحالة"),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <span className="flex flex-col gap-0.5">
              <StatusText tone={TONE[r.import_status]} label={IMPORT_STATUS_LABELS[r.import_status]} pulse={r.import_status === "importing"} testId="import-status" value={r.import_status} />
              {r.import_status === "imported" && r.product_id ? (
                <Link href={`/dashboard/products/${r.product_id}`} className="text-xs underline underline-offset-4" data-testid="open-product">
                  افتح في المنتجات
                </Link>
              ) : null}
              {r.import_error ? (
                <span className="max-w-56 text-xs text-muted-foreground" dir="ltr">
                  {r.import_error}
                </span>
              ) : null}
            </span>
          );
        },
      },
    ],
    [],
  );

  const categories = conn.data?.categories ?? [];
  const activeCount = [f.category, f.import_status].filter(Boolean).length;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`كتالوج ${SUPPLIER_LABELS[code]}`} description="الأسعار المقترحة بعد قواعد التسعير كما يحسبها الخادم." />
      <DropshippingNav active={null} />
      <DataTable<CatalogItem>
        testId="catalog-table"
        caption="كتالوج المورد"
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
        isFiltered={Boolean(activeCount || f.q)}
        selectable
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        bulkActions={(ids) => (
          <Button size="sm" className="h-11 lg:h-8" onClick={() => setPending(ids.map((id) => (id.startsWith("ext:") ? id : Number(id))))} data-testid="bulk-import">
            استيراد <Mono>{ids.length}</Mono>
          </Button>
        )}
        emptyState={<EmptyState title="لا منتجات لدى المورد بعد" description="شغّل مزامنة المنتجات من صفحة الموردين." />}
        renderMobileCard={(r) => (
          <div className="flex flex-col gap-1 p-3 text-sm">
            <span className="truncate">{r.name}</span>
            <span className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <Money value={r.display_suggested_price} />
              <StatusText tone={TONE[r.import_status]} label={IMPORT_STATUS_LABELS[r.import_status]} />
            </span>
          </div>
        )}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={() => set({ category: null, import_status: null, q: null })} search={<SearchBox value={f.q} onChange={(v) => set({ q: v || null })} placeholder="اسم المنتج" label="بحث في كتالوج المورد" />}>
            <FilterSelect label="الفئة" value={f.category} onChange={(v) => set({ category: v || null })} options={categories.map((c) => ({ value: c, label: c }))} />
            <FilterSelect label="الحالة" value={f.import_status ?? ""} onChange={(v) => set({ import_status: (v || null) as ImportStatus | null })} options={IMPORT_STATUSES.map((s) => ({ value: s, label: IMPORT_STATUS_LABELS[s] }))} testId="filter-import" />
          </FilterBar>
        }
      />
      <Dialog open={pending !== null} onOpenChange={(v) => !v && setPending(null)}>
        <DialogContent>
          <DialogTitle>استيراد المنتجات</DialogTitle>
          <DialogDescription>
            سيُستورد <Mono>{pending?.length ?? 0}</Mono> منتجاً إلى متجرك بالسعر المقترح. المستورد مسبقاً يُتخطّى.
          </DialogDescription>
          <DialogFooter>
            <Button variant="ghost" className="h-11 lg:h-9" onClick={() => setPending(null)}>
              تراجع
            </Button>
            <Button
              className="h-11 lg:h-9"
              disabled={imp.isPending}
              data-testid="import-confirm"
              onClick={async () => {
                if (!pending) return;
                try {
                  const r = await imp.mutateAsync(pending);
                  toast.success(`بدأ استيراد ${r.count} منتجاً — المهمة #${r.job_id}`);
                  setSelection({});
                } catch (e) {
                  toast.error(isApiError(e) ? e.userMessage : "تعذّر الاستيراد");
                }
                setPending(null);
              }}
            >
              استيراد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
