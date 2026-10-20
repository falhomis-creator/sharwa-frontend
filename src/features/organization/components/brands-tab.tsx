"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { IMAGE_EXTENSIONS_MESSAGE, hasImageExtension, slugify, type Brand } from "@/features/organization/schemas";
import { orgApi, orgKeys, useBrands, useInvalidateOrganization } from "@/features/organization/api";
import { ProductThumb } from "@/features/products/components/product-thumb";
import { deleteWithUndo, readAsDataUrl } from "@/features/organization/components/undo-delete";

/**
 * Brands (US-05.3, FR-05.05): a table — 32px logo, name, `slug` Mono, product count — with
 * an add row at the top saved by Enter. `slug` is suggested from the name and stays
 * editable; uniqueness is the server's call and its message shows under the field.
 */
/** 32px logo through `next/image` (FR-05.10), or the neutral initial tile. */
function Logo({ src, name }: { src: string | null; name: string }) {
  return <ProductThumb src={src} name={name} size={32} />;
}

function BrandForm({
  brand,
  onDone,
  autoFocus = false,
}: {
  brand: Brand | null;
  onDone?: () => void;
  autoFocus?: boolean;
}) {
  const invalidate = useInvalidateOrganization();
  const [name, setName] = useState(brand?.name ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(brand));
  const [logo, setLogo] = useState<string | null>(brand?.logo ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!hasImageExtension(file.name)) {
      setErrors({ logo: IMAGE_EXTENSIONS_MESSAGE });
      return;
    }
    setLogo(await readAsDataUrl(file));
    setErrors({});
  }

  async function submit() {
    if (!name.trim()) {
      setErrors({ name: "أدخل اسم الماركة." });
      return;
    }
    setBusy(true);
    try {
      await orgApi.saveBrand(brand?.id ?? null, { name: name.trim(), slug: slug.trim() || undefined, logo });
      await invalidate();
      toast.success(brand ? "حُفظت الماركة" : "أُضيفت الماركة");
      if (!brand) {
        setName("");
        setSlug("");
        setSlugTouched(false);
        setLogo(null);
      }
      setErrors({});
      onDone?.();
    } catch (err) {
      if (isApiError(err) && err.fields) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
      } else toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
    } finally {
      setBusy(false);
    }
  }

  const id = brand ? `brand-${brand.id}` : "brand-new";
  return (
    <form
      className="flex flex-col gap-2 md:flex-row md:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && onDone) onDone();
      }}
      data-testid={brand ? "brand-edit-row" : "brand-add-row"}
    >
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        aria-label="شعار الماركة"
        className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:bg-muted md:size-8"
      >
        {logo ? <Logo src={logo} name={name} /> : <ImagePlus className="size-4" aria-hidden />}
      </button>
      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          id={`${id}-name`}
          value={name}
          autoFocus={autoFocus}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder={brand ? "اسم الماركة" : "ماركة جديدة… ثم Enter"}
          aria-label="اسم الماركة"
          aria-invalid={Boolean(errors.name)}
          className={inputClass}
        />
        {errors.name ? <p role="alert" className="text-xs text-destructive">{errors.name}</p> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          value={slug}
          dir="ltr"
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          placeholder="slug"
          aria-label="الرابط المختصر (slug)"
          aria-invalid={Boolean(errors.slug)}
          className={`${inputClass} font-mono`}
        />
        {errors.slug ? <p role="alert" className="text-xs text-destructive">{errors.slug}</p> : null}
        {errors.logo ? <p role="alert" className="text-xs text-destructive">{errors.logo}</p> : null}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="lg" className="h-11 lg:h-8" disabled={busy}>
          {brand ? "حفظ" : "إضافة"}
        </Button>
        {onDone ? (
          <Button type="button" variant="ghost" size="lg" className="h-11 lg:h-8" onClick={onDone}>
            إلغاء
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function BrandsTab({ canManage }: { canManage: boolean }) {
  const store = useStore();
  const qc = useQueryClient();
  const query = useBrands();
  const invalidate = useInvalidateOrganization();
  const [editing, setEditing] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);

  function remove(brand: Brand) {
    if (brand.products_count === 0) {
      deleteWithUndo({ qc, queryKey: orgKeys(store).brands, item: brand, label: brand.name, request: () => orgApi.deleteBrand(brand.id), onSettled: () => void invalidate() });
    } else setDeleting(brand);
  }

  if (query.isLoading) return <div className="flex flex-col gap-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const brands = query.data ?? [];

  return (
    <div className="flex flex-col gap-3" data-testid="brands-tab">
      {canManage ? <BrandForm brand={null} /> : null}
      {brands.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">لا ماركات بعد — اكتب اسم أول ماركة واضغط Enter.</p>
      ) : (
        <ul className="surface-card">
          <li aria-hidden className="hidden items-center gap-3 border-b border-border px-3 py-2 text-xs text-muted-foreground md:flex">
            <span className="w-8">الشعار</span>
            <span className="flex-1">الاسم</span>
            <span className="flex-1">slug</span>
            <span className="w-16 text-end">المنتجات</span>
            {canManage ? <span className="w-20" /> : null}
          </li>
          {brands.map((b) =>
            editing === b.id ? (
              <li key={b.id} className="border-b border-border p-3 last:border-0">
                <BrandForm brand={b} onDone={() => setEditing(null)} autoFocus />
              </li>
            ) : (
              <li key={b.id} className="flex min-h-11 items-center gap-3 border-b border-border px-3 py-1.5 last:border-0" data-testid="brand-row">
                <Logo src={b.logo} name={b.name} />
                <span className="min-w-0 flex-1 truncate text-sm">{b.name}</span>
                <Mono className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground md:block">{b.slug}</Mono>
                <Mono className="w-16 text-end text-sm">{b.products_count}</Mono>
                {canManage ? (
                  <span className="flex w-20 justify-end">
                    <button type="button" onClick={() => setEditing(b.id)} aria-label={`تحرير «${b.name}»`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8">
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => remove(b)} aria-label={`حذف «${b.name}»`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive lg:size-8">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </span>
                ) : null}
              </li>
            ),
          )}
        </ul>
      )}
      {deleting ? (
        <ConfirmDelete
          title={`حذف «${deleting.name}»`}
          description={`مرتبطة بـ ${deleting.products_count} منتجاً؛ ستبقى المنتجات بلا ماركة.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const res = await orgApi.deleteBrand(deleting.id);
            toast.success(`حُذفت الماركة وأُزيلت من ${res.cleared} منتجاً`);
            await invalidate();
          }}
        />
      ) : null}
    </div>
  );
}

/** Shared confirmation for deleting an entity that still has products (FR-05.09). */
export function ConfirmDelete({
  title,
  description,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <DialogFooter>
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="h-11 lg:h-9"
            disabled={busy}
            data-testid="confirm-delete"
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onClose();
              } catch (err) {
                toast.error(isApiError(err) ? err.userMessage : "تعذّر الحذف.");
              } finally {
                setBusy(false);
              }
            }}
          >
            حذف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
