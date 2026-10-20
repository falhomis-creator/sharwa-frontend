"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, MoreHorizontal, Pencil } from "lucide-react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import {
  BulkActionDialog,
  DataTable,
  FilterBar,
  FilterSelect,
  SearchBox,
  StatStrip,
  headerLabel,
  useTableUrlState,
  type BulkReport,
} from "@/components/shared/data-table";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { isDecimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";
import { categoryPath } from "@/features/organization/schemas";
import { useBrands, useCategories, useCollections, useTags } from "@/features/organization/api";
import {
  PRODUCT_FLAGS,
  PRODUCT_FLAG_LABELS,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  STOCK_FILTERS,
  STOCK_FILTER_LABELS,
  UNIT_LABELS,
  type ProductBulkAction,
  type ProductListItem,
} from "@/features/products/schemas";
import { bulkProducts, useInvalidateProducts, useProducts, useSetPrice, useSetStock } from "@/features/products/api/products";
import { useProductFilters } from "@/features/products/hooks/use-product-filters";
import { useCatalogAccess } from "@/features/products/hooks/use-catalog-access";
import { InlineEditCell } from "@/features/products/components/inline-edit-cell";
import { ProductStatusText } from "@/features/products/components/status-text";
import { ProductThumb } from "@/features/products/components/product-thumb";
import { duplicateProductHref } from "@/features/products/components/editor/prefill";
import { isApiError } from "@/lib/api-error";

/**
 * «جميع المنتجات» as a work table (M04 US-04.1, T071): dense rows, the text number strip as
 * filters (no KPI cards), every filter in the URL, server pagination/ordering, in-place
 * stock and price editing, bulk actions with a preview by count and a per-row report.
 */
const STOCK_DECIMAL = /^\d+(\.\d{1,3})?$/;

function stockTone(row: ProductListItem): string {
  if (Number(row.stock) <= 0) return "text-destructive";
  if (row.is_low_stock) return "text-warning";
  return "";
}

export function ProductsTable({ onQuickAdd }: { onQuickAdd: () => void }) {
  const router = useRouter();
  const table = useTableUrlState();
  const { filters, setFilters, activeCount, isFiltered, clear } = useProductFilters();
  const access = useCatalogAccess();
  const categories = useCategories().data;
  const brands = useBrands().data;
  const tags = useTags().data;
  const collections = useCollections().data;
  const setStock = useSetStock();
  const setPrice = useSetPrice();
  const invalidate = useInvalidateProducts();
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [bulk, setBulk] = useState<ProductBulkAction | null>(null);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkTag, setBulkTag] = useState("");

  const params = {
    q: filters.q || undefined,
    status: filters.status ?? undefined,
    stock: filters.stock ?? undefined,
    category: filters.category || undefined,
    brand: filters.brand || undefined,
    tag: filters.tag || undefined,
    collection: filters.collection || undefined,
    product_type: filters.product_type ?? undefined,
    flags: filters.flags || undefined,
    ordering: table.ordering || undefined,
    page: table.page,
    page_size: table.pageSize,
  };
  const query = useProducts(params, { enabled: access.canView });
  const data = query.data;

  const byCategory = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);
  const categoryOptions = useMemo(
    () =>
      (categories ?? [])
        .map((c) => ({ value: String(c.id), label: categoryPath(c.id, byCategory) }))
        .sort((a, b) => a.label.localeCompare(b.label, "ar")),
    [categories, byCategory],
  );

  const set = (patch: Parameters<typeof setFilters>[0]) => {
    void setFilters(patch);
    table.resetPage();
    setSelection({});
  };

  const columns = useMemo<ColumnDef<ProductListItem, unknown>[]>(
    () => [
      {
        id: "name",
        meta: { sortKey: "name" },
        header: headerLabel("المنتج"),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <Link href={`/dashboard/products/${p.id}`} className="flex min-w-48 items-center gap-2.5 py-1" tabIndex={-1}>
              <ProductThumb src={p.image} name={p.name} />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-medium">{p.name}</span>
                {p.has_variants ? <span className="text-[11px] text-muted-foreground">بمتغيرات</span> : null}
              </span>
            </Link>
          );
        },
      },
      {
        id: "sku",
        meta: { sortKey: "sku" },
        header: headerLabel("SKU"),
        cell: ({ row }) => <Mono className="text-xs text-muted-foreground">{row.original.sku}</Mono>,
      },
      {
        id: "price",
        meta: { numeric: true, sortKey: "price" },
        header: headerLabel("السعر"),
        cell: ({ row }) => {
          const p = row.original;
          const display = (
            <span className="flex flex-col items-end leading-tight">
              <Money value={p.display_price} />
              {p.display_old_price ? <Money value={p.display_old_price} muted className="text-[11px] line-through" /> : null}
            </span>
          );
          if (!p.price) return display;
          return (
            <InlineEditCell
              value={p.price}
              display={display}
              label={`سعر ${p.name}`}
              testId={`price-cell-${p.id}`}
              blockedReason={
                !access.canManage
                  ? "تعديل السعر مقصور على المالك ومدير المتجر."
                  : p.is_auction_active
                    ? "تحرير السعر محجوب أثناء مزاد نشط."
                    : null
              }
              validate={(v) => (isDecimal(v) ? null : "رقم غير صالح")}
              onSave={(v) =>
                setPrice.mutateAsync({ id: p.id, price: v }).then(
                  () => toast.success(`حُفظ سعر «${p.name}»`),
                  (err: unknown) => toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ"),
                )
              }
            />
          );
        },
      },
      {
        id: "stock",
        meta: { numeric: true, sortKey: "stock" },
        header: headerLabel("المخزون"),
        cell: ({ row }) => {
          const p = row.original;
          const display = (
            <span className={cn("flex items-baseline justify-end gap-1", stockTone(p))}>
              <Mono>{formatNumber(Number(p.stock), 3)}</Mono>
              <span className="font-sans text-[11px] text-muted-foreground">{UNIT_LABELS[p.unit]}</span>
            </span>
          );
          return (
            <InlineEditCell
              value={String(Number(p.stock))}
              display={display}
              label={`مخزون ${p.name}`}
              testId={`stock-cell-${p.id}`}
              blockedReason={
                !access.canAdjustStock
                  ? "ليست لديك صلاحية تعديل المخزون."
                  : p.is_auction_active
                    ? "المخزون محجوب أثناء مزاد نشط."
                    : p.has_variants
                      ? "المخزون يُدار على المتغيرات — هذا مجموعها."
                      : p.is_serialized
                        ? "مخزون هذا المنتج من الأرقام التسلسلية (المخزون)."
                        : null
              }
              validate={(v) => (STOCK_DECIMAL.test(v) ? null : "حتى 3 خانات عشرية")}
              onSave={(v) =>
                setStock.mutateAsync({ id: p.id, stock: v }).then(
                  () => toast.success(`حُفظ مخزون «${p.name}»`),
                  (err: unknown) => toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ"),
                )
              }
            />
          );
        },
      },
      {
        id: "category",
        header: headerLabel("التصنيف"),
        cell: ({ row }) => {
          const c = row.original.category;
          if (!c) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="block max-w-40 truncate" title={categoryPath(c.id, byCategory) || c.name}>
              {c.name}
            </span>
          );
        },
      },
      {
        id: "status",
        header: headerLabel("الحالة"),
        cell: ({ row }) => <ProductStatusText status={row.original.status} />,
      },
      {
        id: "updated_at",
        meta: { sortKey: "updated_at", className: "whitespace-nowrap" },
        header: headerLabel("آخر تعديل"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground" title={formatDateTime(row.original.updated_at)}>
            {formatRelative(row.original.updated_at)}
          </span>
        ),
      },
      {
        // Row actions (Shopify/BigCommerce «…» menu): edit, and «نسخ» → a pre-filled copy.
        id: "actions",
        meta: { srOnlyHeader: true, className: "w-12" },
        header: "إجراءات",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`إجراءات ${row.original.name}`}
              data-testid="product-row-actions"
              onKeyDown={(e) => e.stopPropagation()}
              className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:size-8"
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/products/${row.original.id}`)}>
                <Pencil aria-hidden /> تحرير
              </DropdownMenuItem>
              {access.canManage ? (
                <DropdownMenuItem onClick={() => router.push(duplicateProductHref(row.original.id))} data-testid="duplicate-row">
                  <Copy aria-hidden /> نسخ
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [access.canAdjustStock, access.canManage, byCategory, router, setPrice, setStock],
  );

  const summary = data?.summary;

  async function runBulk(ids: string[]): Promise<BulkReport> {
    if (!bulk) return { succeeded: 0, failed: [] };
    const payload =
      bulk === "set_category"
        ? { category_id: bulkCategory ? Number(bulkCategory) : null }
        : bulk === "add_tag" || bulk === "remove_tag"
          ? { tag_id: Number(bulkTag) }
          : undefined;
    const result = await bulkProducts(ids.map(Number), bulk, payload);
    const names = new Map((data?.results ?? []).map((r) => [r.id, r.name]));
    void invalidate();
    setSelection({});
    return {
      succeeded: result.succeeded.length,
      failed: result.failed.map((f) => ({ id: f.id, label: names.get(f.id), reason: f.reason })),
    };
  }

  const BULK_LABELS: Record<ProductBulkAction, string> = {
    publish: "نشر",
    archive: "أرشفة",
    unarchive: "إلغاء الأرشفة",
    delete: "حذف",
    set_category: "تغيير التصنيف",
    add_tag: "إضافة وسم",
    remove_tag: "إزالة وسم",
  };

  return (
    <div className="flex flex-col gap-4">
      <StatStrip
        label="ملخص المنتجات"
        items={[
          {
            key: "published",
            label: "منشور",
            count: summary?.published,
            active: filters.status === "published",
            onSelect: () => set({ status: filters.status === "published" ? null : "published", stock: null }),
          },
          {
            key: "draft",
            label: "مسودة",
            count: summary?.draft,
            active: filters.status === "draft",
            onSelect: () => set({ status: filters.status === "draft" ? null : "draft", stock: null }),
          },
          {
            key: "low",
            label: "منخفض المخزون",
            count: summary?.low_stock,
            tone: "warning",
            active: filters.stock === "low",
            onSelect: () => set({ stock: filters.stock === "low" ? null : "low", status: null }),
          },
          {
            key: "out",
            label: "نفد",
            count: summary?.out_of_stock,
            tone: "destructive",
            active: filters.stock === "out",
            onSelect: () => set({ stock: filters.stock === "out" ? null : "out", status: null }),
          },
        ]}
      />

      <DataTable<ProductListItem>
        testId="products-table"
        caption="قائمة المنتجات"
        columns={columns}
        data={data?.results}
        getRowId={(r) => String(r.id)}
        total={data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        ordering={table.ordering}
        onOrderingChange={table.setOrdering}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        forbidden={!access.canView}
        isFiltered={isFiltered}
        selectable={access.canManage}
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        onRowOpen={(row) => router.push(`/dashboard/products/${row.id}`)}
        toolbar={
          <FilterBar
            activeCount={activeCount}
            onClear={clear}
            search={
              <SearchBox
                value={filters.q}
                onChange={(q) => set({ q: q || null })}
                placeholder="ابحث بالاسم أو SKU أو الباركود"
                label="بحث في المنتجات"
              />
            }
          >
            <FilterSelect
              label="الحالة"
              value={filters.status ?? ""}
              onChange={(v) => set({ status: (v || null) as typeof filters.status })}
              options={PRODUCT_STATUSES.map((s) => ({ value: s, label: PRODUCT_STATUS_LABELS[s] }))}
              testId="filter-status"
            />
            <FilterSelect
              label="المخزون"
              value={filters.stock ?? ""}
              onChange={(v) => set({ stock: (v || null) as typeof filters.stock })}
              options={STOCK_FILTERS.map((s) => ({ value: s, label: STOCK_FILTER_LABELS[s] }))}
              testId="filter-stock"
            />
            <FilterSelect
              label="التصنيف"
              value={filters.category}
              onChange={(v) => set({ category: v || null })}
              options={categoryOptions}
              testId="filter-category"
            />
            <FilterSelect
              label="الماركة"
              value={filters.brand}
              onChange={(v) => set({ brand: v || null })}
              options={(brands ?? []).map((b) => ({ value: String(b.id), label: b.name }))}
            />
            <FilterSelect
              label="الوسم"
              value={filters.tag}
              onChange={(v) => set({ tag: v || null })}
              options={(tags ?? []).map((t) => ({ value: String(t.id), label: t.name }))}
            />
            <FilterSelect
              label="المجموعة"
              value={filters.collection}
              onChange={(v) => set({ collection: v || null })}
              options={(collections ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
            />
            <FilterSelect
              label="النوع"
              value={filters.product_type ?? ""}
              onChange={(v) => set({ product_type: (v || null) as typeof filters.product_type })}
              options={PRODUCT_TYPES.map((t) => ({ value: t, label: PRODUCT_TYPE_LABELS[t] }))}
            />
            <FilterSelect
              label="الأعلام"
              value={filters.flags}
              onChange={(v) => set({ flags: v || null })}
              options={PRODUCT_FLAGS.map((f) => ({ value: f, label: PRODUCT_FLAG_LABELS[f] }))}
            />
          </FilterBar>
        }
        bulkActions={() => (
          <>
            {(["publish", "archive", "set_category", "add_tag", "delete"] as const).map((action) => (
              <Button
                key={action}
                variant={action === "delete" ? "destructive" : "outline"}
                size="sm"
                className="h-11 lg:h-7"
                onClick={() => setBulk(action)}
                data-testid={`bulk-${action}`}
              >
                {BULK_LABELS[action]}
              </Button>
            ))}
          </>
        )}
        renderMobileCard={(p) => (
          <Link href={`/dashboard/products/${p.id}`} className="flex min-h-16 items-center gap-3 p-3">
            <ProductThumb src={p.image} name={p.name} size={40} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{p.name}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <ProductStatusText status={p.status} />
                <span aria-hidden>·</span>
                <span className={stockTone(p)}>
                  <Mono>{formatNumber(Number(p.stock), 3)}</Mono> {UNIT_LABELS[p.unit]}
                </span>
              </span>
            </span>
            <Money value={p.display_price} className="text-sm" />
          </Link>
        )}
        emptyState={
          <EmptyState
            title="لا منتجات بعد"
            description="أضف منتجك الأول بالاسم والسعر والصورة فقط، وأكمل التفاصيل لاحقاً."
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="lg" className="h-11" onClick={onQuickAdd} data-testid="empty-quick-add">
                  أضف منتجك الأول
                </Button>
                <Link
                  href="/dashboard/products/import"
                  className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
                >
                  استيراد CSV
                </Link>
              </div>
            }
          />
        }
        noResultsState={
          <EmptyState
            title="لا منتجات تطابق الفلاتر"
            description="جرّب كلمة بحث أخرى أو امسح الفلاتر."
            action={
              <Button variant="outline" size="lg" className="h-11" onClick={clear} data-testid="clear-filters">
                مسح الفلاتر
              </Button>
            }
          />
        }
      />

      <BulkActionDialog
        open={bulk !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBulk(null);
            setBulkCategory("");
            setBulkTag("");
          }
        }}
        title={bulk ? `${BULK_LABELS[bulk]} — منتجات محددة` : ""}
        count={Object.values(selection).filter(Boolean).length}
        confirmLabel={bulk ? BULK_LABELS[bulk] : ""}
        destructive={bulk === "delete"}
        description={
          bulk === "delete"
            ? "المنتجات التي لها طلبات تُؤرشف بدل الحذف وتبقى في الطلبات السابقة."
            : bulk === "archive"
              ? "المنتجات المؤرشفة تختفي من المتجر."
              : undefined
        }
        run={() => runBulk(Object.keys(selection).filter((k) => selection[k]))}
      >
        {bulk === "set_category" ? (
          <label className="flex flex-col gap-1.5 text-sm">
            التصنيف الجديد
            <NativeSelect value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} className="h-11 lg:h-8">
              <option value="">بلا تصنيف</option>
              {categoryOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </label>
        ) : bulk === "add_tag" ? (
          <label className="flex flex-col gap-1.5 text-sm">
            الوسم
            <NativeSelect value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} className="h-11 lg:h-8">
              <option value="">اختر وسماً</option>
              {(tags ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </label>
        ) : null}
      </BulkActionDialog>
    </div>
  );
}
