"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GitMerge, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { TAG_NAME_MAX, type Tag } from "@/features/organization/schemas";
import { orgApi, orgKeys, useInvalidateOrganization, useTags } from "@/features/organization/api";
import { ConfirmDelete } from "@/features/organization/components/brands-tab";
import { deleteWithUndo } from "@/features/organization/components/undo-delete";

const UNUSED_DAYS = 30;

/** US-05.4.2: no products for 30 days → «غير مستخدم». `now` comes from the caller (purity). */
export function isUnused(tag: Tag, now: number): boolean {
  if (tag.products_count > 0) return false;
  if (!tag.last_used_at) return true;
  return now - new Date(tag.last_used_at).getTime() > UNUSED_DAYS * 86_400_000;
}

/**
 * Tags (US-05.4, FR-05.06): a dense list, created by typing + Enter, renamed in place
 * (click the name, Enter saves, Esc cancels), and merged (products move, then the source is
 * deleted).
 */
export function TagsTab({ canManage }: { canManage: boolean }) {
  const store = useStore();
  const qc = useQueryClient();
  const query = useTags();
  const invalidate = useInvalidateOrganization();
  const [draft, setDraft] = useState("");
  const [createError, setCreateError] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string; error: string } | null>(null);
  const [merging, setMerging] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);
  const [now] = useState(() => Date.now());

  async function create() {
    const name = draft.trim();
    if (!name) return;
    try {
      await orgApi.saveTag(null, { name });
      setDraft("");
      setCreateError("");
      await invalidate();
    } catch (err) {
      setCreateError(isApiError(err) ? err.userMessage : "تعذّر الإنشاء.");
    }
  }

  async function rename() {
    if (!editing) return;
    try {
      await orgApi.saveTag(editing.id, { name: editing.name.trim() });
      setEditing(null);
      await invalidate();
    } catch (err) {
      setEditing({ ...editing, error: isApiError(err) ? err.userMessage : "تعذّر الحفظ." });
    }
  }

  function remove(tag: Tag) {
    if (tag.products_count === 0) {
      deleteWithUndo({ qc, queryKey: orgKeys(store).tags, item: tag, label: tag.name, request: () => orgApi.deleteTag(tag.id), onSettled: () => void invalidate() });
    } else setDeleting(tag);
  }

  if (query.isLoading) return <div className="flex flex-col gap-1">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-8" />)}</div>;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const tags = query.data ?? [];
  const unused = tags.filter((t) => isUnused(t, now)).length;

  return (
    <div className="flex flex-col gap-3" data-testid="tags-tab">
      {canManage ? (
        <form
          className="flex max-w-md flex-col gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <div className="flex items-baseline justify-between">
            <label htmlFor="tag-new" className="text-sm font-medium">
              وسم جديد
            </label>
            <Mono className={cn("text-[11px] text-muted-foreground", draft.length > TAG_NAME_MAX && "text-destructive")}>
              {draft.length}/{TAG_NAME_MAX}
            </Mono>
          </div>
          <input id="tag-new" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="اكتب ثم Enter" aria-invalid={Boolean(createError)} className={inputClass} data-testid="tag-new" />
          {createError ? <p role="alert" className="text-xs text-destructive">{createError}</p> : null}
        </form>
      ) : null}
      {unused > 0 ? (
        <p className="text-xs text-muted-foreground">
          <Mono>{unused}</Mono> وسوم غير مستخدمة منذ {UNUSED_DAYS} يوماً — يُقترح حذفها.
        </p>
      ) : null}
      {tags.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">لا وسوم بعد.</p>
      ) : (
        <ul className="surface-card">
          {tags.map((t) => (
            <li key={t.id} className="flex min-h-11 items-center gap-3 border-b border-border px-3 last:border-0 lg:min-h-9" data-testid="tag-row">
              {editing?.id === t.id ? (
                <form
                  className="flex min-w-0 flex-1 flex-col gap-1 py-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void rename();
                  }}
                >
                  <input
                    autoFocus
                    value={editing.name}
                    maxLength={TAG_NAME_MAX + 10}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value, error: "" })}
                    onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                    onBlur={() => setEditing(null)}
                    aria-label={`اسم الوسم «${t.name}»`}
                    className={inputClass}
                  />
                  {editing.error ? <p role="alert" className="text-xs text-destructive">{editing.error}</p> : null}
                </form>
              ) : (
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => setEditing({ id: t.id, name: t.name, error: "" })}
                  className="min-h-11 min-w-0 flex-1 truncate text-start text-sm disabled:cursor-default lg:min-h-9"
                  title={canManage ? "انقر للتحرير" : undefined}
                >
                  {t.name}
                </button>
              )}
              {isUnused(t, now) ? <span className="text-xs text-muted-foreground">غير مستخدم</span> : null}
              <Mono className="hidden w-40 truncate text-xs text-muted-foreground md:block">{t.slug}</Mono>
              <Mono className="w-10 text-end text-sm">{t.products_count}</Mono>
              {canManage ? (
                <span className="flex">
                  <button type="button" onClick={() => setMerging(t)} aria-label={`دمج «${t.name}» في وسم آخر`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8">
                    <GitMerge className="size-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => remove(t)} aria-label={`حذف «${t.name}»`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive lg:size-8">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {merging ? <MergeDialog from={merging} tags={tags} onClose={() => setMerging(null)} /> : null}
      {deleting ? (
        <ConfirmDelete
          title={`حذف «${deleting.name}»`}
          description={`مرتبط بـ ${deleting.products_count} منتجاً؛ سيُزال منها.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const res = await orgApi.deleteTag(deleting.id);
            toast.success(`حُذف الوسم وأُزيل من ${res.cleared} منتجاً`);
            await invalidate();
          }}
        />
      ) : null}
    </div>
  );
}

function MergeDialog({ from, tags, onClose }: { from: Tag; tags: Tag[]; onClose: () => void }) {
  const invalidate = useInvalidateOrganization();
  const options = tags.filter((t) => t.id !== from.id);
  const [into, setInto] = useState(String(options[0]?.id ?? ""));
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm" data-testid="merge-tags">
        <DialogTitle>دمج «{from.name}»</DialogTitle>
        <DialogDescription>تنتقل منتجاته (<Mono>{from.products_count}</Mono>) إلى الوسم المختار ثم يُحذف.</DialogDescription>
        <NativeSelect value={into} onChange={(e) => setInto(e.target.value)} aria-label="الدمج في" className="h-11 lg:h-8">
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
        <DialogFooter>
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            size="lg"
            className="h-11 lg:h-9"
            disabled={busy || !into}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await orgApi.mergeTags(from.id, Number(into));
                toast.success(`دُمج الوسم ونُقل ${res.moved} منتجاً`);
                await invalidate();
                onClose();
              } catch (err) {
                toast.error(isApiError(err) ? err.userMessage : "تعذّر الدمج.");
              } finally {
                setBusy(false);
              }
            }}
          >
            دمج
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
