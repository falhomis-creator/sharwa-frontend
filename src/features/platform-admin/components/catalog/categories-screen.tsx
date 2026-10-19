"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { useCategories, useCategoryMutations } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { ConfirmDialog, ReadOnlyNote, toastError } from "@/features/platform-admin/components/bits";
import { BTN, INPUT, SkeletonRows, Table, Td, Th } from "@/features/platform-admin/components/billing/ui";
import type { MarketCategory } from "@/features/platform-admin/schemas";

/**
 * `/market-categories` (M20 US-20.6 a3): the sectors the M02 wizard offers, in order.
 * Reordering sends the full id list (↑/↓ buttons — keyboard and touch friendly); the
 * wizard reads the same rows, so a change shows there at once.
 */
export function CategoriesScreen() {
  const cats = useCategories();
  const m = useCategoryMutations();
  const canWrite = useCanWrite("catalog");
  const [name, setName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<MarketCategory | null>(null);
  const rows = cats.data ?? [];

  function move(i: number, dir: -1 | 1) {
    const ids = rows.map((r) => r.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    m.reorder.mutate(ids, { onError: (err) => toastError(err) });
  }

  async function add() {
    setAddError(null);
    if (!name.trim()) return setAddError("أدخل اسم الفئة.");
    try {
      await m.create.mutateAsync({ name: name.trim(), is_active: true });
      toast.success(`أُضيفت «${name.trim()}».`);
      setName("");
    } catch (err) {
      setAddError(isApiError(err) ? err.userMessage : "تعذّر الإضافة.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="فئات السوق" description="القطاعات التي يختار منها التاجر عند التسجيل، بترتيب العرض." />
      {!canWrite ? <ReadOnlyNote /> : null}
      {cats.error ? <ErrorState error={cats.error} onRetry={() => void cats.refetch()} /> : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
        className="flex flex-col gap-1.5 md:max-w-md"
      >
        <label htmlFor="cat-new" className="text-sm font-medium">
          فئة جديدة
        </label>
        <div className="flex gap-2">
          <Input id="cat-new" className={INPUT} value={name} onChange={(e) => setName(e.target.value)} disabled={!canWrite} data-testid="cat-new" />
          <Button type="submit" className={BTN} disabled={!canWrite || m.create.isPending} data-testid="cat-add">
            إضافة
          </Button>
        </div>
        {addError ? <p className="text-xs text-destructive">{addError}</p> : null}
      </form>
      {cats.data && rows.length === 0 ? (
        <EmptyState title="لا فئات" description="يُخفى الحقل في معالج التسجيل حتى تُضاف فئة نشطة." />
      ) : (
        <Table caption="فئات السوق" testId="categories-table">
          <thead>
            <tr>
              <Th numeric>#</Th>
              <Th>الاسم</Th>
              <Th>نشطة</Th>
              <Th numeric>متاجر اختارتها</Th>
              <Th>الترتيب</Th>
              <Th>
                <span className="sr-only">إجراءات</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {cats.isLoading ? <SkeletonRows cols={6} /> : null}
            {rows.map((c, i) => (
              <tr key={c.id} data-testid="category-row" data-id={c.id} className={c.is_active ? "" : "text-muted-foreground"}>
                <Td numeric>
                  <Mono>{c.display_order}</Mono>
                </Td>
                <Td>
                  <Input
                    key={`${c.id}:${c.name}`}
                    aria-label={`اسم الفئة ${c.name}`}
                    defaultValue={c.name}
                    disabled={!canWrite}
                    className={`${INPUT} max-w-64`}
                    data-testid="category-name"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== c.name) m.patch.mutate({ id: c.id, name: v }, { onSuccess: () => toast.success("حُفظ الاسم."), onError: (err) => toastError(err) });
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  />
                </Td>
                <Td>
                  <span className="inline-flex size-11 items-center justify-center lg:size-8">
                    <Switch checked={c.is_active} disabled={!canWrite} aria-label={`${c.name} نشطة`} data-testid="category-active" onCheckedChange={(v) => m.patch.mutate({ id: c.id, is_active: v }, { onError: (err) => toastError(err) })} />
                  </span>
                </Td>
                <Td numeric>
                  <Mono>{c.stores_count}</Mono>
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-11 lg:size-8" disabled={!canWrite || i === 0 || m.reorder.isPending} onClick={() => move(i, -1)} aria-label={`رفع ${c.name}`} data-testid="category-up">
                      <ArrowUp className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-11 lg:size-8" disabled={!canWrite || i === rows.length - 1 || m.reorder.isPending} onClick={() => move(i, 1)} aria-label={`إنزال ${c.name}`} data-testid="category-down">
                      <ArrowDown className="size-4" aria-hidden />
                    </Button>
                  </div>
                </Td>
                <Td>
                  <Button variant="ghost" className={`${BTN} text-destructive`} disabled={!canWrite} onClick={() => setDeleting(c)} data-testid="category-delete">
                    حذف
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`حذف «${deleting?.name ?? ""}»`}
        impact="تختفي الفئة من معالج التسجيل. الفئة التي اختارها متجر لا تُحذف — عطّلها."
        confirmLabel="حذف"
        destructive
        pending={m.remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await m.remove.mutateAsync(deleting.id);
            toast.success("حُذفت الفئة.");
          } catch (err) {
            toastError(err);
          }
          setDeleting(null);
        }}
      />
    </div>
  );
}
