"use client";

import { useState } from "react";
import Link from "next/link";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Copy, GripVertical, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBox } from "@/components/shared/data-table/filter-bar";
import { isApiError } from "@/lib/api-error";
import { translateToString } from "@/lib/dnd";
import { useStore, useStoreOrigin } from "@/features/dashboard-shell/components/store-context";
import type { CollectionDetail, CollectionProduct } from "@/features/organization/schemas";
import { orgApi, orgKeys, useCollection, useInvalidateOrganization } from "@/features/organization/api";
import { CollectionForm } from "@/features/organization/components/collections-tab";
import { useProducts } from "@/features/products/api/products";
import { ProductThumb } from "@/features/products/components/product-thumb";
import { useCatalogAccess } from "@/features/products/hooks/use-catalog-access";

/**
 * `/dashboard/products/organization/collections/[id]` (US-05.5): the collection's details,
 * its storefront link `?collection=<slug>` (copyable), a product search (name/SKU, Ready
 * endpoint) whose results say «في المجموعة» once added, and the drag-ordered list. Every
 * change is one request; the order is saved optimistically and rolled back on failure.
 * Below md, the search lives in a bottom drawer (M05 §6).
 */
function SortableProduct({ product, canManage, onRemove }: { product: CollectionProduct; canManage: boolean; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: product.id, disabled: !canManage });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: translateToString(transform), transition }}
      className={`flex min-h-12 items-center gap-2 border-b border-border bg-background px-2 last:border-0 ${isDragging ? "relative z-10 border border-primary ring-1 ring-primary/20" : ""}`}
      data-testid="collection-product"
    >
      {canManage ? (
        <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`اسحب «${product.name}»`} className="flex size-11 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8">
          <GripVertical className="size-4" aria-hidden />
        </button>
      ) : null}
      <ProductThumb src={product.image} name={product.name} size={32} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{product.name}</span>
        <Mono className="text-xs text-muted-foreground">{product.sku}</Mono>
      </span>
      {product.is_archived ? (
        <span className="rounded border border-border px-1.5 text-xs text-muted-foreground" title="مستثنى من المتجر تلقائياً؛ يُقترح إزالته">
          مؤرشف
        </span>
      ) : null}
      <Mono className="text-sm">{product.display_price}</Mono>
      {canManage ? (
        <button type="button" onClick={onRemove} aria-label={`إزالة «${product.name}» من المجموعة`} className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive lg:size-8">
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

function ProductSearch({ inCollection, onAdd }: { inCollection: Set<number>; onAdd: (id: number) => void }) {
  const [q, setQ] = useState("");
  const results = useProducts({ q, page_size: 8 }, { enabled: q.trim().length > 0 });
  return (
    <div className="flex flex-col gap-2">
      <SearchBox value={q} onChange={setQ} placeholder="ابحث بالاسم أو SKU" label="بحث عن منتج لإضافته" delay={250} />
      {q.trim() === "" ? (
        <p className="text-xs text-muted-foreground">اكتب اسماً أو SKU لعرض المنتجات.</p>
      ) : results.isLoading ? (
        <div className="flex flex-col gap-1.5">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : (results.data?.results.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">لا منتج يطابق</p>
      ) : (
        <ul className="flex flex-col" data-testid="collection-search-results">
          {results.data!.results.map((p) => {
            const added = inCollection.has(p.id);
            return (
              <li key={p.id} className="flex min-h-12 items-center gap-2 border-b border-border last:border-0">
                <ProductThumb src={p.image} name={p.name} size={32} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{p.name}</span>
                  <Mono className="text-xs text-muted-foreground">{p.sku}</Mono>
                </span>
                <Mono className="text-sm">{p.display_price}</Mono>
                {added ? (
                  <span className="flex h-11 items-center gap-1 px-2 text-xs text-muted-foreground lg:h-8">
                    <Check className="size-3.5" aria-hidden /> في المجموعة
                  </span>
                ) : (
                  <Button variant="outline" size="sm" className="h-11 gap-1 lg:h-8" onClick={() => onAdd(p.id)}>
                    <Plus className="size-3.5" aria-hidden /> إضافة
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function CollectionEditor({ collectionId }: { collectionId: number }) {
  const store = useStore();
  const origin = useStoreOrigin();
  const qc = useQueryClient();
  const access = useCatalogAccess();
  const query = useCollection(collectionId);
  const invalidate = useInvalidateOrganization();
  const [searchOpen, setSearchOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const key = orgKeys(store).collection(collectionId);

  async function apply(request: () => Promise<CollectionDetail>, optimistic?: (old: CollectionDetail) => CollectionDetail) {
    const previous = qc.getQueryData<CollectionDetail>(key);
    if (optimistic && previous) qc.setQueryData(key, optimistic(previous));
    try {
      qc.setQueryData(key, await request());
      void qc.invalidateQueries({ queryKey: orgKeys(store).collections });
    } catch (err) {
      qc.setQueryData(key, previous);
      toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ؛ أُعيدت المجموعة كما كانت.");
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const data = query.data;
    if (!data || !e.over || e.active.id === e.over.id) return;
    const ids = data.products.map((p) => p.id);
    const next = arrayMove(ids, ids.indexOf(Number(e.active.id)), ids.indexOf(Number(e.over.id)));
    void apply(
      () => orgApi.reorderCollection(collectionId, next),
      (old) => ({ ...old, products: next.map((id) => old.products.find((p) => p.id === id)!) }),
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const c = query.data;
  const link = `${origin}/?collection=${c.slug}`;
  const inCollection = new Set(c.products.map((p) => p.id));
  const add = (id: number) => void apply(() => orgApi.addToCollection(collectionId, [id]));
  const archived = c.products.filter((p) => p.is_archived).length;

  return (
    <div className="flex flex-col gap-6" data-testid="collection-editor">
      <Link href="/dashboard/products/organization?tab=collections" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> المجموعات
      </Link>
      <PageHeader
        title={c.name}
        description={c.description || "مجموعة يدوية: المنتجات وترتيبها كما تختارها."}
        actions={
          <div className="flex items-center gap-1 surface-card ps-2.5">
            <Mono className="max-w-64 truncate text-xs text-muted-foreground" data-testid="collection-link">
              {link}
            </Mono>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  toast("نُسخ رابط المجموعة");
                } catch {
                  toast("تعذّر النسخ — انسخ الرابط يدوياً");
                }
              }}
              aria-label="نسخ رابط المجموعة في المتجر"
              className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8"
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-3" aria-labelledby="collection-products">
          <div className="flex items-center justify-between gap-2">
            <h2 id="collection-products" className="text-sm font-medium">
              المنتجات <Mono className="text-muted-foreground">({c.products.length})</Mono>
            </h2>
            {access.canManage ? (
              <Button size="lg" variant="outline" className="h-11 gap-1.5 lg:hidden" onClick={() => setSearchOpen(true)}>
                <Plus className="size-4" aria-hidden /> إضافة منتجات
              </Button>
            ) : null}
          </div>
          {archived > 0 ? (
            <p role="note" className="text-xs text-muted-foreground">
              <Mono>{archived}</Mono> منتجات مؤرشفة لا تظهر في المتجر — يُقترح إزالتها.
            </p>
          ) : null}
          {c.products.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">المجموعة فارغة — ابحث عن منتج وأضفه.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={c.products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <ul className="surface-card">
                  {c.products.map((p) => (
                    <SortableProduct
                      key={p.id}
                      product={p}
                      canManage={access.canManage}
                      onRemove={() =>
                        void apply(
                          () => orgApi.removeFromCollection(collectionId, p.id),
                          (old) => ({ ...old, products: old.products.filter((x) => x.id !== p.id), products_count: old.products_count - 1 }),
                        )
                      }
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>

        {access.canManage ? (
          <aside className="hidden flex-col gap-6 lg:flex">
            <section className="flex flex-col gap-3" aria-label="إضافة منتجات">
              <h2 className="text-sm font-medium">إضافة منتجات</h2>
              <ProductSearch inCollection={inCollection} onAdd={add} />
            </section>
            <section className="flex flex-col gap-3 border-t border-border pt-6" aria-label="بيانات المجموعة">
              <h2 className="text-sm font-medium">بيانات المجموعة</h2>
              <CollectionForm
                key={`${c.id}-${c.slug}`}
                formId="collection-details"
                collection={c}
                onSaved={async () => {
                  await qc.invalidateQueries({ queryKey: key });
                  await invalidate();
                  toast.success("حُفظت المجموعة");
                }}
              />
              <Button type="submit" form="collection-details" size="lg" className="h-11 self-start lg:h-9">
                حفظ البيانات
              </Button>
            </section>
          </aside>
        ) : null}
      </div>

      <Drawer open={searchOpen} onOpenChange={setSearchOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>إضافة منتجات</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[70dvh] overflow-y-auto p-4">
            <ProductSearch inCollection={inCollection} onAdd={add} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
