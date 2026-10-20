"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import { ChevronDown, Download, LayoutTemplate, MoreHorizontal, Plus, Upload, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/page-header";
import { Mono } from "@/components/shared/mono";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { downloadProductsCsv, useTemplates } from "@/features/products/api/products";
import { productFromTemplateHref } from "@/features/products/components/editor/prefill";
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
  const templates = useTemplates({ enabled: access.canManage }).data ?? [];

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
              {/* «منتج جديد» + a template picker: start from a preset instead of a blank form. */}
              <div className="inline-flex rounded-lg border border-border bg-card shadow-xs">
                <Link
                  href="/dashboard/products/new"
                  className="inline-flex h-11 items-center gap-1.5 rounded-s-lg px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground lg:h-9"
                >
                  <Plus className="size-4" aria-hidden />
                  منتج جديد <Mono className="hidden text-[11px] text-muted-foreground lg:inline">N</Mono>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="إنشاء منتج من قالب"
                    data-testid="new-from-template"
                    className="inline-flex h-11 w-10 items-center justify-center rounded-e-lg border-s border-border hover:bg-accent hover:text-accent-foreground lg:h-9 lg:w-8"
                  >
                    <ChevronDown className="size-4" aria-hidden />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-60">
                    <DropdownMenuGroup>
                    <DropdownMenuLabel>ابدأ من قالب</DropdownMenuLabel>
                    {templates.length === 0 ? (
                      <DropdownMenuItem onClick={() => router.push("/dashboard/products/templates")}>
                        <LayoutTemplate aria-hidden /> لا قوالب بعد — أنشئ قالباً
                      </DropdownMenuItem>
                    ) : (
                      templates.map((t) => (
                        <DropdownMenuItem key={t.id} onClick={() => router.push(productFromTemplateHref(t.id))}>
                          <LayoutTemplate aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{t.name}</span>
                          <Mono className="text-[11px] text-muted-foreground">{Object.keys(t.fields).length}</Mono>
                        </DropdownMenuItem>
                      ))
                    )}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
