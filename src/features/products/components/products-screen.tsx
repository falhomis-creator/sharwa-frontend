"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import { Download, MoreHorizontal, Plus, Upload, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/page-header";
import { Mono } from "@/components/shared/mono";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { downloadProductsCsv } from "@/features/products/api/products";
import { useProductFilters } from "@/features/products/hooks/use-product-filters";
import { useCatalogAccess } from "@/features/products/hooks/use-catalog-access";
import { ProductsTable } from "@/features/products/components/products-table";
import { QuickAddDialog } from "@/features/products/components/quick-add-dialog";

/**
 * `/dashboard/products` (M04 US-04.1/04.2/04.7). Shortcuts (M04 §6): `N` new product,
 * `Q` quick add. The quick-add panel's open state lives in the URL (`?quick=1`) rather than
 * component state, so Next 16's preserved routes (`<Activity>`) never reopen a stale panel.
 */
function isTyping(t: EventTarget | null) {
  return t instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable);
}

export function ProductsScreen() {
  const router = useRouter();
  const access = useCatalogAccess();
  const { canFeature } = useAccess();
  const { filters } = useProductFilters();
  const [quick, setQuick] = useQueryState("quick", parseAsBoolean.withDefault(false).withOptions({ history: "replace" }));

  useEffect(() => {
    if (!access.canManage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || document.querySelector("[role=dialog]")) return;
      const k = e.key.toLowerCase();
      if (k === "n") {
        e.preventDefault();
        router.push("/dashboard/products/new");
      } else if (k === "q") {
        e.preventDefault();
        void setQuick(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [access.canManage, router, setQuick]);

  async function exportCsv() {
    try {
      await downloadProductsCsv({
        q: filters.q || undefined,
        status: filters.status ?? undefined,
        stock: filters.stock ?? undefined,
        category: filters.category || undefined,
        brand: filters.brand || undefined,
        tag: filters.tag || undefined,
        collection: filters.collection || undefined,
        product_type: filters.product_type ?? undefined,
        flags: filters.flags || undefined,
      });
    } catch {
      toast.error("تعذّر تصدير الملف.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="المنتجات"
        description="كل منتجات المتجر: ابحث وفلتر وعدّل السعر والمخزون في مكانهما."
        actions={
          access.canManage ? (
            <>
              <Button size="lg" className="h-11 gap-1.5 lg:h-9" onClick={() => void setQuick(true)} data-testid="open-quick-add">
                <Zap className="size-4" aria-hidden />
                إضافة سريعة <Mono className="hidden text-[11px] opacity-70 lg:inline">Q</Mono>
              </Button>
              <Link
                href="/dashboard/products/new"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted lg:h-9"
              >
                <Plus className="size-4" aria-hidden />
                منتج جديد <Mono className="hidden text-[11px] text-muted-foreground lg:inline">N</Mono>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="المزيد"
                  className="inline-flex size-11 items-center justify-center rounded-lg border border-border hover:bg-muted lg:size-9"
                >
                  <MoreHorizontal className="size-4" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push("/dashboard/products/import")}>
                    <Upload aria-hidden /> استيراد CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void exportCsv()}>
                    <Download aria-hidden /> تصدير CSV بالفلاتر الحالية
                  </DropdownMenuItem>
                  {canFeature("bulk_upload") ? (
                    <DropdownMenuItem onClick={() => router.push("/dashboard/products/bulk-upload")}>
                      <Upload aria-hidden /> الرفع السريع (صور → مسودات)
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null
        }
      />
      <ProductsTable onQuickAdd={() => void setQuick(true)} />
      {access.canManage ? <QuickAddDialog open={quick} onOpenChange={(o) => void setQuick(o ? true : null)} /> : null}
    </div>
  );
}
