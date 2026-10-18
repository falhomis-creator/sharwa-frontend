"use client";

import { useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Field, inputClass } from "@/components/shared/field";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import {
  CATEGORY_NAME_MAX,
  IMAGE_EXTENSIONS_MESSAGE,
  SEO_LIMITS,
  categoryInputSchema,
  categoryPath,
  hasImageExtension,
  type Category,
  type CategoryInput,
} from "@/features/organization/schemas";
import { orgApi, useCategories, useInvalidateOrganization } from "@/features/organization/api";

/**
 * Category side panel (US-05.2, FR-05.03): `name` (100), `parent`, `image` and a foldable SEO
 * section with Mono character counters (70/160/255). Also opened from inside the product
 * editor, where the new category is selected automatically after saving (US-05.2.3).
 *
 * Images > 5MB are downscaled in the browser before upload, and the final size is reported
 * (M05 §8). Only jpg/jpeg/png/webp/gif are accepted (FR-05.10).
 */
const MAX_BYTES = 5 * 1024 * 1024;

async function fileToDataUrl(file: File): Promise<{ url: string; note?: string }> {
  const read = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  if (file.size <= MAX_BYTES) return { url: await read(file) };
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) return { url: await read(file) };
  return { url: await read(blob), note: `ضُغطت الصورة إلى ${(blob.size / 1024 / 1024).toFixed(1)}MB قبل الرفع.` };
}

const EMPTY: CategoryInput = {
  name: "",
  parent_id: null,
  image: null,
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  og_image: null,
};

export function CategoryEditorSheet({
  open,
  onOpenChange,
  category,
  defaultParentId = null,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  defaultParentId?: number | null;
  onSaved?: (c: Category) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 shadow-none sm:max-w-md" data-testid="category-sheet">
        {open ? (
          <CategoryForm
            key={category?.id ?? `new-${defaultParentId ?? "root"}`}
            category={category}
            defaultParentId={defaultParentId}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function CategoryForm({
  category,
  defaultParentId,
  onSaved,
  onClose,
}: {
  category: Category | null;
  defaultParentId: number | null;
  onSaved?: (c: Category) => void;
  onClose: () => void;
}) {
  const query = useCategories();
  const categories = useMemo(() => query.data ?? [], [query.data]);
  const invalidate = useInvalidateOrganization();
  const [seoOpen, setSeoOpen] = useState(Boolean(category?.meta_title || category?.meta_description));
  const [imageNote, setImageNote] = useState("");
  const [formError, setFormError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: category
      ? {
          name: category.name,
          parent_id: category.parent_id,
          image: category.image,
          meta_title: category.meta_title,
          meta_description: category.meta_description,
          meta_keywords: category.meta_keywords,
          og_image: category.og_image,
        }
      : { ...EMPTY, parent_id: defaultParentId },
  });
  const { register, handleSubmit, setValue, setError, formState } = form;
  const values = { ...form.formState.defaultValues, ...useWatch({ control: form.control }) } as CategoryInput;
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  // A category can never be moved under itself or one of its descendants.
  const blocked = useMemo(() => {
    const out = new Set<number>();
    if (!category) return out;
    out.add(category.id);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of categories) if (c.parent_id !== null && out.has(c.parent_id) && !out.has(c.id)) {
        out.add(c.id);
        grew = true;
      }
    }
    return out;
  }, [category, categories]);

  async function pick(file: File | undefined, field: "image" | "og_image") {
    setImageNote("");
    if (!file) return;
    if (!hasImageExtension(file.name)) {
      setImageNote(IMAGE_EXTENSIONS_MESSAGE);
      return;
    }
    const { url, note } = await fileToDataUrl(file);
    setValue(field, url, { shouldDirty: true });
    if (note) setImageNote(note);
  }

  const onSubmit = handleSubmit(async (v) => {
    setFormError("");
    try {
      const saved = category ? await orgApi.updateCategory(category.id, v) : await orgApi.createCategory(v);
      await invalidate();
      toast.success(category ? "حُفظ التصنيف" : `أُنشئ تصنيف «${saved.name}»`);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.fields) {
        for (const [k, msgs] of Object.entries(err.fields)) {
          if (k in EMPTY) setError(k as keyof CategoryInput, { message: msgs[0] });
        }
      }
      setFormError(isApiError(err) ? (err.detail ?? "") : "تعذّر الحفظ.");
    }
  });

  return (
    <>
        <SheetHeader className="border-b border-border">
          <SheetTitle>{category ? `تحرير «${category.name}»` : "تصنيف جديد"}</SheetTitle>
          <SheetDescription>{category ? categoryPath(category.id, byId) : "يظهر في قائمة تصنيفات المتجر."}</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 p-4" noValidate>
          <Field
            label="الاسم"
            htmlFor="cat-name"
            required
            error={formState.errors.name?.message}
            counter={{ value: values.name.length, max: CATEGORY_NAME_MAX }}
          >
            <input id="cat-name" autoFocus className={inputClass} aria-invalid={Boolean(formState.errors.name)} {...register("name")} />
          </Field>
          <Field label="التصنيف الأب" htmlFor="cat-parent" error={formState.errors.parent_id?.message}>
            <NativeSelect
              id="cat-parent"
              className="h-11 md:h-8"
              value={values.parent_id === null ? "" : String(values.parent_id)}
              onChange={(e) => setValue("parent_id", e.target.value ? Number(e.target.value) : null, { shouldDirty: true })}
            >
              <option value="">— جذر الشجرة —</option>
              {categories
                .filter((c) => !blocked.has(c.id))
                .map((c) => ({ id: c.id, label: categoryPath(c.id, byId) }))
                .sort((a, b) => a.label.localeCompare(b.label, "ar"))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <Field label="الصورة" htmlFor="cat-image" error={imageNote.startsWith("الصيغ") ? imageNote : undefined} hint={imageNote && !imageNote.startsWith("الصيغ") ? imageNote : "jpg, jpeg, png, webp, gif"}>
            {values.image ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                <img src={values.image} alt="" className="size-16 rounded-md border border-border object-cover" />
                <button type="button" onClick={() => setValue("image", null, { shouldDirty: true })} className="inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted md:h-8">
                  <X className="size-4" aria-hidden /> إزالة
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="flex h-16 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted">
                <ImagePlus className="size-4" strokeWidth={1.75} aria-hidden /> اختر صورة
              </button>
            )}
            <input ref={fileRef} id="cat-image" type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="sr-only" onChange={(e) => void pick(e.target.files?.[0], "image")} data-testid="category-image-input" />
          </Field>

          <div className="border-t border-border pt-2">
            <button
              type="button"
              aria-expanded={seoOpen}
              onClick={() => setSeoOpen((o) => !o)}
              className="flex min-h-11 w-full items-center justify-between text-sm font-medium"
            >
              تحسين محركات البحث (SEO)
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", seoOpen && "rotate-180")} aria-hidden />
            </button>
            {seoOpen ? (
              <div className="flex flex-col gap-4 pt-2">
                <Field label="عنوان الصفحة" htmlFor="cat-mt" error={formState.errors.meta_title?.message} counter={{ value: values.meta_title.length, max: SEO_LIMITS.meta_title }}>
                  <input id="cat-mt" className={inputClass} {...register("meta_title")} />
                </Field>
                <Field label="الوصف" htmlFor="cat-md" error={formState.errors.meta_description?.message} counter={{ value: values.meta_description.length, max: SEO_LIMITS.meta_description }}>
                  <Textarea id="cat-md" rows={3} {...register("meta_description")} />
                </Field>
                <Field label="الكلمات المفتاحية" htmlFor="cat-mk" error={formState.errors.meta_keywords?.message} counter={{ value: values.meta_keywords.length, max: SEO_LIMITS.meta_keywords }} hint="افصل بينها بفاصلة.">
                  <input id="cat-mk" className={inputClass} {...register("meta_keywords")} />
                </Field>
                <Field label="صورة المشاركة (og:image)" htmlFor="cat-og">
                  <input id="cat-og" type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="text-sm" onChange={(e) => void pick(e.target.files?.[0], "og_image")} />
                </Field>
              </div>
            ) : null}
          </div>

          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          <div className="sticky bottom-0 -mx-4 mt-auto flex gap-2 border-t border-border bg-popover p-4">
            <Button type="submit" size="lg" className="h-11 flex-1" disabled={formState.isSubmitting} data-testid="category-save">
              {formState.isSubmitting ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
            <Button type="button" variant="outline" size="lg" className="h-11" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </form>
    </>
  );
}
