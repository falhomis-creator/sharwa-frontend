"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { useRouter } from "next/navigation";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { slugify, type Collection } from "@/features/organization/schemas";
import { orgApi, orgKeys, useCollections, useInvalidateOrganization } from "@/features/organization/api";
import { ConfirmDelete } from "@/features/organization/components/brands-tab";
import { deleteWithUndo } from "@/features/organization/components/undo-delete";

/**
 * Manual collections (US-05.5, FR-05.07): `name`, `slug`, `description` and a hand-picked,
 * hand-ordered product list. There are NO automatic rules — the backend has none, so the UI
 * never suggests them.
 */
export function CollectionForm({
  collection,
  onSaved,
  formId,
}: {
  collection: Collection | null;
  onSaved: (saved: Collection) => void;
  formId: string;
}) {
  const [name, setName] = useState(collection?.name ?? "");
  const [slug, setSlug] = useState(collection?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(collection));
  const [description, setDescription] = useState(collection?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <form
      id={formId}
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const saved = await orgApi.saveCollection(collection?.id ?? null, { name: name.trim(), slug: slug.trim() || undefined, description });
          setErrors({});
          onSaved(saved);
        } catch (err) {
          if (isApiError(err) && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
          else toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
        }
      }}
    >
      <Field label="الاسم" htmlFor={`${formId}-name`} required error={errors.name}>
        <input
          id={`${formId}-name`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className={inputClass}
          aria-invalid={Boolean(errors.name)}
        />
      </Field>
      <Field label="الرابط المختصر (slug)" htmlFor={`${formId}-slug`} error={errors.slug} hint="يُقترح من الاسم ويبقى قابلاً للتعديل.">
        <input
          id={`${formId}-slug`}
          value={slug}
          dir="ltr"
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          className={`${inputClass} font-mono`}
          aria-invalid={Boolean(errors.slug)}
        />
      </Field>
      <Field label="الوصف" htmlFor={`${formId}-desc`}>
        <textarea
          id={`${formId}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="min-h-20 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        />
      </Field>
    </form>
  );
}

export function CollectionsTab({ canManage }: { canManage: boolean }) {
  const store = useStore();
  const qc = useQueryClient();
  const router = useRouter();
  const query = useCollections();
  const invalidate = useInvalidateOrganization();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Collection | null>(null);

  function remove(c: Collection) {
    if (c.products_count === 0) {
      deleteWithUndo({ qc, queryKey: orgKeys(store).collections, item: c, label: c.name, request: () => orgApi.deleteCollection(c.id), onSettled: () => void invalidate() });
    } else setDeleting(c);
  }

  if (query.isLoading) return <div className="flex flex-col gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const collections = query.data ?? [];

  return (
    <div className="flex flex-col gap-3" data-testid="collections-tab">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">مجموعات يدوية: تختار منتجاتها وترتيبها بنفسك.</p>
        {canManage ? (
          <Button size="lg" className="h-11 gap-1.5 lg:h-9" onClick={() => setCreating(true)} data-testid="new-collection">
            <Plus className="size-4" aria-hidden /> مجموعة جديدة
          </Button>
        ) : null}
      </div>
      {collections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">لا مجموعات بعد — مثلاً «عروض رمضان» أو «اختيارات المحرّر».</p>
      ) : (
        <ul className="rounded-lg border border-border">
          {collections.map((c) => (
            <li key={c.id} className="flex min-h-12 items-center gap-3 border-b border-border px-3 last:border-0" data-testid="collection-row">
              <Link href={`/dashboard/products/organization/collections/${c.id}`} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center py-1.5 hover:underline">
                <span className="truncate text-sm font-medium">{c.name}</span>
                {c.description ? <span className="truncate text-xs text-muted-foreground">{c.description}</span> : null}
              </Link>
              <Mono className="hidden w-40 truncate text-xs text-muted-foreground md:block">{c.slug}</Mono>
              <span className="w-20 text-end text-sm text-muted-foreground">
                <Mono className="text-foreground">{c.products_count}</Mono> منتجات
              </span>
              {canManage ? (
                <button type="button" onClick={() => remove(c)} aria-label={`حذف «${c.name}»`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive lg:size-8">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {creating ? (
        <Dialog open onOpenChange={(o) => !o && setCreating(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>مجموعة جديدة</DialogTitle>
            <DialogDescription>بعد الإنشاء تضيف منتجاتها وترتّبها.</DialogDescription>
            <CollectionForm
              formId="new-collection"
              collection={null}
              onSaved={async (saved) => {
                await invalidate();
                setCreating(false);
                router.push(`/dashboard/products/organization/collections/${saved.id}`);
              }}
            />
            <DialogFooter>
              <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => setCreating(false)}>
                إلغاء
              </Button>
              <Button type="submit" form="new-collection" size="lg" className="h-11 lg:h-9">
                إنشاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
      {deleting ? (
        <ConfirmDelete
          title={`حذف «${deleting.name}»`}
          description={`تضم ${deleting.products_count} منتجاً؛ تبقى المنتجات نفسها، وتُحذف المجموعة فقط.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await orgApi.deleteCollection(deleting.id);
            toast.success("حُذفت المجموعة");
            await invalidate();
          }}
        />
      ) : null}
    </div>
  );
}
