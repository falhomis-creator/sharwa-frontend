"use client";

import { useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Archive, Copy, ExternalLink, LayoutTemplate, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { ToggleRow } from "@/components/shared/toggle-row";
import { isApiError } from "@/lib/api-error";
import { addDecimal, groupDecimal, isDecimal, percentOf } from "@/lib/decimal";
import { formatDateTime, formatNumber } from "@/lib/format";
import { CURRENCY_LABELS } from "@/lib/schemas/money";
import { cn } from "@/lib/utils";
import { useStore, useStoreOrigin } from "@/features/dashboard-shell/components/store-context";
import {
  CURRENCY_CODES,
  HAZARD_CLASSES,
  HAZARD_CLASS_LABELS,
  PAYMENT_POLICIES,
  PAYMENT_POLICY_LABELS,
  PRODUCT_TEMPLATES,
  PRODUCT_TEMPLATE_LABELS,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  UNITS,
  UNIT_LABELS,
  VARIANT_DISPLAY_STYLES,
  VARIANT_DISPLAY_STYLE_LABELS,
  productFormSchema,
  type ProductDetail,
  type ProductFormValues,
} from "@/features/products/schemas";
import { useQueryClient } from "@tanstack/react-query";
import {
  generateVariants,
  productKeys,
  saveVariants,
  useDeleteProduct,
  useProduct,
  useSaveProduct,
  useTemplates,
  useVariantAttributes,
} from "@/features/products/api/products";
import { useCatalogAccess } from "@/features/products/hooks/use-catalog-access";
import { ProductStatusText } from "@/features/products/components/status-text";
import { EMPTY_PRODUCT_FORM, detailToForm, formToPayload } from "@/features/products/components/editor/form-mapping";
import {
  DUPLICATE_CARRIED,
  DUPLICATE_RESET,
  duplicateForm,
  duplicateProductHref,
  seedBlueprintId,
  templateForm,
  variantCopyPlan,
  variantPriceRows,
  type EditorSeed,
} from "@/features/products/components/editor/prefill";
import { MediaGallery } from "@/features/products/components/editor/media-gallery";
import { VariantMatrix } from "@/features/products/components/editor/variant-matrix";
import { ChangeLog } from "@/features/products/components/editor/change-log";
import { AdvancedPanels } from "@/features/products/components/editor/advanced-panels";
import { FormulaPreview } from "@/features/products/components/editor/formula-preview";
import {
  BadgesPicker,
  BrandPicker,
  CategoryPicker,
  CollectionsPicker,
  TagPicker,
} from "@/features/products/components/editor/taxonomy-pickers";

/**
 * Full product editor (US-04.3, T072) — `/dashboard/products/new` and `/[id]`.
 *
 * Main column: الأساسي · الوسائط · التسعير · المخزون · المتغيرات · المحتوى · الشحن · SEO.
 * Side column: الحالة والنشر · التنظيم · الأعلام. Sections are separated by 1px rules, not
 * cards (M04 §11 I). Conditional fields are HIDDEN, never disabled (FR-04.04); digital and
 * service products drop the shipping group for «لا يتطلب شحناً» (FR-04.05).
 *
 * Saving is explicit (FR-04.11): a sticky bar appears with «تغييرات غير محفوظة» whenever
 * the form is dirty, `⌘S`/`Ctrl+S` saves, and leaving through an in-app link asks first.
 * Separately, a LOCAL draft is auto-saved to this browser (T072 «حفظ تلقائي للمسودة») and
 * offered back on the next visit — it is never sent to the server without «حفظ».
 *
 * Creation presets (owner directive 2026-10-20): `/new?duplicate=<id>` opens the editor as a
 * copy of that product and `/new?template=<id>` pre-fills it from a template (see `prefill.ts`).
 */
const SECTIONS = [
  { id: "basic", label: "الأساسي" },
  { id: "media", label: "الوسائط" },
  { id: "pricing", label: "التسعير" },
  { id: "inventory", label: "المخزون" },
  { id: "variants", label: "المتغيرات" },
  { id: "content", label: "المحتوى" },
  { id: "shipping", label: "الشحن" },
  { id: "seo", label: "SEO" },
] as const;

const DRAFT_PREFIX = "sharwa:product-draft:";

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 border-b border-border py-6 last:border-0">
      <div className="mb-4 flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-base font-medium">
          {title}
        </h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function SideBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border py-5 first:pt-0 last:border-0">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-3", cols === 4 && "grid-cols-2 sm:grid-cols-4")}>
      {children}
    </div>
  );
}

// ── Loader ────────────────────────────────────────────────────────────────────────────
export function ProductEditor({ productId }: { productId: number | null }) {
  const query = useProduct(productId);
  const [duplicateId] = useQueryState("duplicate", parseAsInteger);
  const [templateId] = useQueryState("template", parseAsInteger);
  const creating = productId === null;
  const source = useProduct(creating ? duplicateId : null);
  const templates = useTemplates();
  const template = creating && templateId !== null ? (templates.data ?? []).find((t) => t.id === templateId) : undefined;
  const seed = useMemo<EditorSeed | null>(() => {
    if (!creating) return null;
    if (duplicateId !== null && source.data) return { kind: "duplicate", source: source.data, form: duplicateForm(source.data) };
    if (template) return { kind: "template", template, ...templateForm(template) };
    return null;
  }, [creating, duplicateId, source.data, template]);

  const waitingForSeed =
    (creating && duplicateId !== null && source.isLoading) || (creating && templateId !== null && templates.isLoading);
  if ((productId !== null && query.isLoading) || waitingForSeed) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-[32rem] lg:col-span-8" />
          <Skeleton className="h-80 lg:col-span-4" />
        </div>
      </div>
    );
  }
  if (productId !== null && query.error) {
    return (
      <ErrorState
        title={isApiError(query.error) && query.error.status === 404 ? "المنتج غير موجود" : "تعذّر تحميل المنتج"}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (creating && duplicateId !== null && source.error) {
    return (
      <ErrorState
        title={isApiError(source.error) && source.error.status === 404 ? "المنتج المطلوب نسخه غير موجود" : "تعذّر تحميل المنتج لنسخه"}
        error={source.error}
        onRetry={() => void source.refetch()}
      />
    );
  }
  const seedKey = seed ? `${seed.kind}-${seed.kind === "duplicate" ? seed.source.id : seed.template.id}` : "blank";
  return (
    <EditorForm
      key={productId ?? `new-${seedKey}`}
      product={query.data ?? null}
      seed={seed}
      missingTemplate={creating && templateId !== null && !templates.isLoading && !template}
    />
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────────────
function EditorForm({
  product,
  seed,
  missingTemplate,
}: {
  product: ProductDetail | null;
  seed: EditorSeed | null;
  missingTemplate: boolean;
}) {
  const qc = useQueryClient();
  const attributes = useVariantAttributes().data ?? [];
  const router = useRouter();
  const store = useStore();
  const storeOrigin = useStoreOrigin();
  const access = useCatalogAccess();
  const readOnly = !access.canManage;
  const discountsReadOnly = readOnly || !access.canManageDiscounts;
  const save = useSaveProduct(product?.id ?? null);
  const remove = useDeleteProduct();
  const templates = useTemplates().data ?? [];
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(["product", "advanced", "history"]).withDefault("product"));
  const [formError, setFormError] = useState("");
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const [now] = useState(() => Date.now());
  const initial = useMemo(() => (product ? detailToForm(product) : (seed?.form ?? EMPTY_PRODUCT_FORM)), [product, seed]);
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues: initial, mode: "onBlur" });
  const { register, handleSubmit, setValue, reset, setError, formState } = form;
  const v = { ...form.formState.defaultValues, ...useWatch({ control: form.control }) } as ProductFormValues;
  const dirty = formState.isDirty;
  // A preset gets its own draft slot, so a blank «منتج جديد» draft never hijacks a copy and vice versa.
  const draftKey = `${DRAFT_PREFIX}${store}:${product?.id ?? (seed ? `new-${seed.kind}-${seed.kind === "duplicate" ? seed.source.id : seed.template.id}` : "new")}`;


  // Re-sync when the server copy changes (after save, variants, images) and nothing is pending.
  useEffect(() => {
    if (!formState.isDirty) reset(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the server copy changes
  }, [initial]);

  // Local draft: offered back once (read from storage outside render), saved while dirty.
  const rawDraft = useSyncExternalStore(subscribeStorage, () => readStorage(draftKey), () => null);
  const draftOffer = useMemo(() => {
    if (draftDismissed || !rawDraft) return null;
    try {
      const parsed = JSON.parse(rawDraft) as { at: string; values: ProductFormValues };
      return parsed?.values ? parsed : null;
    } catch {
      return null;
    }
  }, [rawDraft, draftDismissed]);
  const serialized = JSON.stringify(v);

  useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify({ at: new Date().toISOString(), values: JSON.parse(serialized) }));
      } catch {
        // storage unavailable — drafts are a convenience only
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [serialized, dirty, draftKey]);

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  };

  /** Validate + save; resolves `true` when the server accepted the product. */
  const submit = () =>
    new Promise<boolean>((resolve) => {
      void handleSubmit(
        async (values) => {
          setFormError("");
          try {
            const blueprintId = product ? null : seedBlueprintId(seed);
            // [NEEDS BACKEND] `blueprint_id` on create: links the new product to its template (M04 US-04.6).
            const saved = await save.mutateAsync({ ...formToPayload(values), ...(blueprintId !== null ? { blueprint_id: blueprintId } : {}) });
            clearDraft();
            setDraftDismissed(true);
            reset(detailToForm(saved));
            const copiedVariants = !product && seed?.kind === "duplicate" ? await copyVariants(saved.id, seed.source) : 0;
            toast.success(
              product
                ? "حُفظت التغييرات"
                : seed?.kind === "duplicate"
                  ? `أُنشئت النسخة «${saved.name}»${copiedVariants ? ` مع ${copiedVariants} متغيراً` : ""} — مخفية عن المتجر حتى تفعّل «متاح»`
                  : `أُنشئ المنتج «${saved.name}»`,
            );
            if (!product) router.replace(`/dashboard/products/${saved.id}`);
            resolve(true);
          } catch (err) {
            if (isApiError(err) && err.fields) {
              for (const [k, msgs] of Object.entries(err.fields)) {
                if (k in EMPTY_PRODUCT_FORM) setError(k as keyof ProductFormValues, { message: msgs[0] }, { shouldFocus: true });
              }
            }
            setFormError(isApiError(err) ? (err.detail ?? (err.fields ? "تحقق من الحقول المعلّمة." : err.userMessage)) : "تعذّر الحفظ.");
            resolve(false);
          }
        },
        () => {
          setFormError("تحقق من الحقول المعلّمة.");
          resolve(false);
        },
      )();
    });
  /** Rebuild the source's variant set on the new copy (same combinations, same extra prices). */
  async function copyVariants(newId: number, source: ProductDetail): Promise<number> {
    const plan = variantCopyPlan(source, attributes);
    if (!plan) return 0;
    try {
      let rows = await generateVariants(newId, plan.request);
      const prices = variantPriceRows(rows, plan);
      if (prices.length) rows = await saveVariants(newId, prices);
      await qc.invalidateQueries({ queryKey: productKeys(store).detail(newId) });
      return rows.length;
    } catch {
      toast.warning("أُنشئت النسخة، لكن تعذّر نسخ المتغيرات — ولّدها من قسم «المتغيرات».");
      return 0;
    }
  }

  const onShortcutSave = useEffectEvent(() => {
    if (!readOnly) void submit();
  });

  // ⌘S / Ctrl+S saves (M04 §6).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyS") {
        e.preventDefault();
        onShortcutSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Leaving with unsaved changes: browser navigation + in-app links (US-04.3.1).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || (url.hash !== "" && url.pathname === window.location.pathname)) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(url.pathname + url.search);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const physical = v.product_type === "physical";
  const hasVariants = (product?.variants.length ?? 0) > 0;
  const errors = formState.errors;
  const err = (k: keyof ProductFormValues) => errors[k]?.message as string | undefined;

  // Estimate (labelled «تقديري»): price incl. tax. The formula result is ASKED from the server (M37 FR-37.02).
  const taxEstimate = v.is_taxable && isDecimal(v.price) && isDecimal(v.tax_rate) ? addDecimal(v.price, percentOf(v.price, v.tax_rate)) : null;
  const marginEstimate =
    isDecimal(v.price) && isDecimal(v.cost_price) && Number(v.price) > 0
      ? (((Number(v.price) - Number(v.cost_price)) / Number(v.price)) * 100).toFixed(1)
      : null;
  const saleState = (() => {
    if (!v.old_price) return null;
    if (!isDecimal(v.old_price) || !isDecimal(v.price) || Number(v.old_price) <= Number(v.price)) return null;
    const start = v.sale_start_at ? new Date(v.sale_start_at).getTime() : null;
    const end = v.sale_end_at ? new Date(v.sale_end_at).getTime() : null;
    if (start && start > now) return "تخفيض مجدول";
    if (end && end < now) return "تخفيض منتهٍ";
    return "تخفيض نشط";
  })();

  const bool = (k: keyof ProductFormValues) => ({
    checked: Boolean(v[k]),
    onCheckedChange: (next: boolean) => setValue(k, next as never, { shouldDirty: true }),
    disabled: readOnly,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate className="flex flex-col gap-4 pb-24" data-testid="product-editor">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link href="/dashboard/products" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:min-h-0">
            <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> المنتجات
          </Link>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {product ? product.name || "بلا اسم" : seed?.kind === "duplicate" ? "نسخ منتج" : seed?.kind === "template" ? "منتج جديد من قالب" : "منتج جديد"}
          </h1>
          {product ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <ProductStatusText status={product.status} className="text-foreground" />
              <Mono>{product.sku}</Mono>
              <span>آخر تعديل {formatDateTime(product.updated_at)}</span>
            </p>
          ) : null}
        </div>
        {product ? (
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly ? (
              <Link
                href={duplicateProductHref(product.id)}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground lg:h-9"
                data-testid="duplicate-product"
              >
                <Copy className="size-4" aria-hidden /> نسخ
              </Link>
            ) : null}
            <a
              href={`${storeOrigin}/p/${product.slug}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted lg:h-9"
            >
              <ExternalLink className="size-4" aria-hidden /> عرض في المتجر
            </a>
            {!readOnly ? (
              <Button type="button" variant="outline" size="lg" className="h-11 gap-1.5 text-destructive lg:h-9" onClick={() => setConfirmDelete(true)}>
                {product.has_orders ? <Archive className="size-4" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
                {product.has_orders ? "أرشفة" : "حذف"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {readOnly ? (
        <p role="note" className="surface-card px-4 py-3 text-sm text-muted-foreground">
          للعرض فقط: تعديل المنتجات مقصور على مالك المتجر ومدير المتجر أو الفرع.
        </p>
      ) : null}

      {seed && !readOnly ? <SeedBanner seed={seed} /> : null}
      {missingTemplate ? (
        <p role="status" className="surface-card px-4 py-3 text-sm text-muted-foreground">
          القالب المطلوب غير موجود (ربما حُذف) — يُفتح منتج جديد فارغ.
        </p>
      ) : null}

      {draftOffer && !readOnly ? (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 px-4 py-3 text-sm">
          <span className="flex-1">
            لديك مسودة محلية غير محفوظة من <Mono>{formatDateTime(draftOffer.at)}</Mono>.
          </span>
          <Button
            type="button"
            size="sm"
            className="h-11 lg:h-7"
            onClick={() => {
              reset(initial);
              for (const [k, val] of Object.entries(draftOffer.values)) setValue(k as keyof ProductFormValues, val as never, { shouldDirty: true });
              setDraftDismissed(true);
            }}
          >
            استعادة المسودة
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-11 lg:h-7" onClick={() => {
            clearDraft();
            setDraftDismissed(true);
          }}>
            تجاهل
          </Button>
        </div>
      ) : null}

      {product ? (
        <div role="tablist" aria-label="أقسام المنتج" className="flex gap-1 border-b border-border">
          {(
            [
              ["product", "المنتج"],
              ["advanced", "الأنماط المتقدمة"],
              ["history", "السجل"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => void setTab(key === "product" ? null : key)}
              className={cn("-mb-px min-h-11 border-b px-3 text-sm", tab === key ? "border-cta font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {product && tab === "history" ? (
        <ChangeLog productId={product.id} />
      ) : product && tab === "advanced" ? (
        <AdvancedPanels product={product} readOnly={readOnly} />
      ) : (
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-12">
          {/* Main column */}
          <div className="min-w-0 lg:col-span-8">
            <nav aria-label="انتقال بين الأقسام" className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto border-b border-border bg-card px-1 py-2">
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground lg:min-h-8">
                  {s.label}
                </a>
              ))}
            </nav>

            <Section id="basic" title="الأساسي">
              <Field label="اسم المنتج" htmlFor="pe-name" required error={err("name")} counter={{ value: v.name.length, max: 200 }}>
                <input id="pe-name" className={inputClass} readOnly={readOnly} aria-invalid={Boolean(errors.name)} {...register("name")} />
              </Field>
              <Grid>
                <Field label="الاسم بالإنجليزية" htmlFor="pe-name-en" error={err("name_en")}>
                  <input id="pe-name-en" dir="ltr" className={inputClass} readOnly={readOnly} {...register("name_en")} />
                </Field>
                <Field label="نوع المنتج" htmlFor="pe-type">
                  <NativeSelect id="pe-type" className="h-11 md:h-8" disabled={readOnly} {...register("product_type")}>
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {PRODUCT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </Grid>
              <Grid cols={3}>
                <Field label="الرابط (slug)" htmlFor="pe-slug" error={err("slug")} hint="يُولَّد من الاسم الإنجليزي إن تُرك فارغاً.">
                  <input id="pe-slug" dir="ltr" className={cn(inputClass, "font-mono")} readOnly={readOnly} {...register("slug")} />
                </Field>
                <Field label="SKU" htmlFor="pe-sku" error={err("sku")} hint={product ? undefined : "يُولَّد تلقائياً (SHW-…)"}>
                  <input id="pe-sku" dir="ltr" className={cn(inputClass, "font-mono")} readOnly={readOnly} placeholder="SHW-XXXXXXXX" {...register("sku")} />
                </Field>
                <Field label="الباركود" htmlFor="pe-barcode" error={err("barcode")}>
                  <input id="pe-barcode" dir="ltr" inputMode="numeric" className={cn(inputClass, "font-mono")} readOnly={readOnly} {...register("barcode")} />
                </Field>
              </Grid>
            </Section>

            <Section id="media" title="الوسائط" description="الصورة الأولى هي الرئيسية في المتجر.">
              {product ? (
                <MediaGallery product={product} readOnly={readOnly} />
              ) : (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">احفظ المنتج أولاً لرفع الصور وترتيبها.</p>
              )}
            </Section>

            <Section id="pricing" title="التسعير">
              <Grid cols={3}>
                <Field label="السعر" htmlFor="pe-price" required error={err("price")}>
                  <input id="pe-price" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly || v.pricing_type === "formula"} aria-invalid={Boolean(errors.price)} {...register("price")} />
                </Field>
                <Field label="السعر القديم" htmlFor="pe-old" error={err("old_price")} hint={discountsReadOnly && !readOnly ? "يتطلب صلاحية إدارة الخصومات." : saleState ?? undefined}>
                  <input id="pe-old" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={discountsReadOnly} {...register("old_price")} />
                </Field>
                <Field label="سعر التكلفة" htmlFor="pe-cost" error={err("cost_price")} hint={access.isOwner && marginEstimate ? <>هامش الربح <Mono className="text-foreground">{marginEstimate}%</Mono></> : undefined}>
                  <input id="pe-cost" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("cost_price")} />
                </Field>
              </Grid>
              {v.old_price ? (
                <Grid>
                  <Field label="بداية التخفيض" htmlFor="pe-ss" error={err("sale_start_at")}>
                    <input id="pe-ss" type="datetime-local" dir="ltr" className={inputClass} readOnly={discountsReadOnly} {...register("sale_start_at")} />
                  </Field>
                  <Field label="نهاية التخفيض" htmlFor="pe-se" error={err("sale_end_at")}>
                    <input id="pe-se" type="datetime-local" dir="ltr" className={inputClass} readOnly={discountsReadOnly} {...register("sale_end_at")} />
                  </Field>
                </Grid>
              ) : null}
              <Grid>
                <Field
                  label="العملة"
                  htmlFor="pe-currency"
                  hint={product?.has_orders && v.currency !== product.currency ? "لا يؤثر على الطلبات السابقة؛ سعر الصرف مثبّت فيها." : undefined}
                >
                  <NativeSelect id="pe-currency" className="h-11 md:h-8" disabled={readOnly} {...register("currency")}>
                    {CURRENCY_CODES.map((c) => (
                      <option key={c} value={c}>
                        {CURRENCY_LABELS[c]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="سياسة الدفع" htmlFor="pe-policy">
                  <NativeSelect id="pe-policy" className="h-11 md:h-8" disabled={readOnly} {...register("payment_policy")}>
                    {PAYMENT_POLICIES.map((p) => (
                      <option key={p} value={p}>
                        {PAYMENT_POLICY_LABELS[p]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </Grid>
              {v.payment_policy === "deposit" ? (
                <Field label="العربون المطلوب" htmlFor="pe-deposit" required error={err("deposit_required")} className="sm:max-w-xs">
                  <input id="pe-deposit" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("deposit_required")} data-testid="deposit-required" />
                </Field>
              ) : null}

              <div className="divide-y divide-border border-y border-border">
                <ToggleRow id="pe-taxable" label="خاضع للضريبة" description="تُضاف الضريبة إلى السعر عند الدفع." {...bool("is_taxable")}>
                  <div className="flex flex-wrap items-end gap-4">
                    <Field label="نسبة الضريبة %" htmlFor="pe-tax" required error={err("tax_rate")} className="w-40">
                      <input id="pe-tax" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("tax_rate")} />
                    </Field>
                    {taxEstimate ? (
                      <p className="pb-2 text-sm text-muted-foreground">
                        شامل الضريبة (تقديري): <Mono className="text-foreground">{groupDecimal(taxEstimate)}</Mono>
                      </p>
                    ) : null}
                  </div>
                </ToggleRow>
                <ToggleRow
                  id="pe-formula"
                  label="تسعير بالمعادلة"
                  description="السعر = سعر الوحدة × المعامل + إضافة ثابتة (مثل الذهب والزعفران)."
                  checked={v.pricing_type === "formula"}
                  onCheckedChange={(on) => setValue("pricing_type", on ? "formula" : "fixed", { shouldDirty: true })}
                  disabled={readOnly}
                >
                  <Field label="مرجع السعر الحيّ" htmlFor="pe-rate">
                    <NativeSelect id="pe-rate" className="h-11 md:h-8" disabled={readOnly} {...register("live_rate_ref")}>
                      <option value="">بلا مرجع</option>
                      {(product?.live_rate_refs ?? []).map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label} — {r.display_rate}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Grid cols={3}>
                    <Field label="سعر الوحدة" htmlFor="pe-fu" required error={err("formula_unit_price")}>
                      <input id="pe-fu" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("formula_unit_price")} />
                    </Field>
                    <Field label="المعامل" htmlFor="pe-fc" required error={err("formula_coefficient")}>
                      <input id="pe-fc" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("formula_coefficient")} />
                    </Field>
                    <Field label="إضافة ثابتة" htmlFor="pe-ff" error={err("formula_fixed_extra")}>
                      <input id="pe-ff" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("formula_fixed_extra")} />
                    </Field>
                  </Grid>
                  <FormulaPreview unitPrice={v.formula_unit_price ?? ""} coefficient={v.formula_coefficient ?? ""} fixedExtra={v.formula_fixed_extra ?? ""} currency={v.currency} />
                </ToggleRow>
                <ToggleRow id="pe-refdep" label="عربون قابل للاسترجاع" description="مبلغ يُدفع مع المنتج ويُرد بشرط (مثل العبوة)." {...bool("has_refundable_deposit")}>
                  <Field label="المبلغ" htmlFor="pe-rda" required error={err("refundable_deposit_amount")} className="sm:max-w-xs">
                    <input id="pe-rda" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("refundable_deposit_amount")} />
                  </Field>
                  <Grid>
                    <Field label="قاعدة الاسترجاع" htmlFor="pe-rdr">
                      <input id="pe-rdr" className={inputClass} readOnly={readOnly} {...register("refundable_deposit_refund_rule")} />
                    </Field>
                    <Field label="حدث الإرجاع" htmlFor="pe-rde">
                      <input id="pe-rde" className={inputClass} readOnly={readOnly} {...register("refundable_deposit_return_event")} />
                    </Field>
                  </Grid>
                </ToggleRow>
              </div>
              {product ? (
                <p className="text-sm text-muted-foreground">
                  السعر المعروض في المتجر: <Money value={product.display_price} className="text-foreground" />
                  {product.display_price_with_tax ? (
                    <>
                      {" "}· شامل الضريبة <Money value={product.display_price_with_tax} className="text-foreground" />
                    </>
                  ) : null}
                </p>
              ) : null}
            </Section>

            <Section id="inventory" title="المخزون">
              {v.is_serialized ? (
                <p className="surface-card px-4 py-3 text-sm">
                  المخزون من الأرقام التسلسلية: <Mono>{product?.serial_available ?? 0}</Mono> متاحة ·{" "}
                  <Link href={`/dashboard/inventory?product=${product?.id ?? ""}`} className="underline underline-offset-4">
                    إدارة الأرقام التسلسلية
                  </Link>
                </p>
              ) : hasVariants ? (
                <p className="surface-card px-4 py-3 text-sm">
                  المخزون يُدار على المتغيرات — المجموع <Mono>{formatNumber(Number(product?.variants_stock_total ?? 0), 3)}</Mono> {UNIT_LABELS[v.unit]}.
                </p>
              ) : (
                <Grid cols={3}>
                  <Field
                    label="المخزون"
                    htmlFor="pe-stock"
                    required
                    error={err("stock")}
                    hint={v.is_auction ? "المزاد قطعة واحدة دائماً." : !access.canAdjustStock && !readOnly ? "يتطلب صلاحية تعديل المخزون." : undefined}
                  >
                    <input id="pe-stock" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly || v.is_auction || !access.canAdjustStock} {...register("stock")} />
                  </Field>
                  <Field label="الوحدة" htmlFor="pe-unit">
                    <NativeSelect id="pe-unit" className="h-11 md:h-8" disabled={readOnly} {...register("unit")}>
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {UNIT_LABELS[u]}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label="حد المخزون المنخفض" htmlFor="pe-low" error={err("low_stock_threshold")} hint="الافتراضي 3">
                    <input id="pe-low" dir="ltr" inputMode="numeric" className={numericInputClass} readOnly={readOnly} {...register("low_stock_threshold")} />
                  </Field>
                </Grid>
              )}
              <Grid>
                <Field label="الحد الأدنى للكمية" htmlFor="pe-min" error={err("min_quantity")}>
                  <input id="pe-min" dir="ltr" inputMode="numeric" className={numericInputClass} readOnly={readOnly} {...register("min_quantity")} />
                </Field>
                <Field label="الحد الأعلى للكمية" htmlFor="pe-max" error={err("max_quantity")}>
                  <input id="pe-max" dir="ltr" inputMode="numeric" className={numericInputClass} readOnly={readOnly} {...register("max_quantity")} />
                </Field>
              </Grid>
              <div className="divide-y divide-border border-y border-border">
                <ToggleRow id="pe-backorder" label="السماح بالطلب عند نفاد المخزون" description="يُقبل الطلب ويُعلَّم «طلب مسبق»." {...bool("allow_backorder")} />
                <ToggleRow id="pe-varqty" label="كمية متغيرة" description="يحدد المشتري كمية عشرية (مثل 1.5 كغ)." {...bool("allow_variable_quantity")} />
              </div>
            </Section>

            <Section id="variants" title="المتغيرات" description="المقاس واللون وغيرها من قاموس سمات المتجر.">
              <Field label="نمط عرض المتغيرات في المتجر" htmlFor="pe-vds">
                <div id="pe-vds" role="radiogroup" className="grid grid-cols-3 gap-2">
                  {VARIANT_DISPLAY_STYLES.map((style) => (
                    <label
                      key={style}
                      className={cn("flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-xs", v.variant_display_style === style ? "border-primary" : "border-border")}
                    >
                      <input type="radio" value={style} className="sr-only" disabled={readOnly} {...register("variant_display_style")} />
                      <span aria-hidden className="flex h-6 items-center gap-1">
                        {style === "swatches" ? (
                          <>
                            <span className="size-4 rounded-sm border border-border bg-foreground" />
                            <span className="size-4 rounded-sm border border-border bg-card" />
                            <span className="size-4 rounded-sm border border-border bg-muted-foreground" />
                          </>
                        ) : style === "dropdown" ? (
                          <span className="flex h-5 w-full items-center justify-end rounded-sm border border-border px-1 text-[9px]">▾</span>
                        ) : (
                          <>
                            <span className="size-3 rounded-full border border-primary" />
                            <span className="size-3 rounded-full border border-border" />
                          </>
                        )}
                      </span>
                      {VARIANT_DISPLAY_STYLE_LABELS[style]}
                    </label>
                  ))}
                </div>
              </Field>
              {product ? (
                <VariantMatrix product={product} readOnly={readOnly} price={v.price} />
              ) : (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">احفظ المنتج أولاً لتوليد المتغيرات.</p>
              )}
            </Section>

            <Section id="content" title="المحتوى">
              <Field label="الوصف" htmlFor="pe-desc">
                <Textarea id="pe-desc" rows={5} readOnly={readOnly} {...register("description")} />
              </Field>
              <Field label="الوصف بالإنجليزية" htmlFor="pe-desc-en">
                <Textarea id="pe-desc-en" dir="ltr" rows={3} readOnly={readOnly} {...register("description_en")} />
              </Field>
              <Grid>
                <Field label="رابط صورة خارجية" htmlFor="pe-iurl" error={err("image_url")}>
                  <input id="pe-iurl" dir="ltr" className={cn(inputClass, "font-mono")} readOnly={readOnly} placeholder="https://" {...register("image_url")} />
                </Field>
                <Field label="رابط فيديو" htmlFor="pe-vurl" error={err("video_url")}>
                  <input id="pe-vurl" dir="ltr" className={cn(inputClass, "font-mono")} readOnly={readOnly} placeholder="https://" {...register("video_url")} />
                </Field>
              </Grid>
              <Field label="قالب صفحة المنتج" htmlFor="pe-tpl">
                <NativeSelect id="pe-tpl" className="h-11 md:h-8 sm:max-w-xs" disabled={readOnly} {...register("product_template")}>
                  {PRODUCT_TEMPLATES.map((t) => (
                    <option key={t} value={t}>
                      {PRODUCT_TEMPLATE_LABELS[t]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </Section>

            <Section id="shipping" title="الشحن">
              {!physical ? (
                <p className="surface-card px-4 py-3 text-sm text-muted-foreground" data-testid="no-shipping">
                  لا يتطلب شحناً — {PRODUCT_TYPE_LABELS[v.product_type]}.
                </p>
              ) : (
                <>
                  <div className="divide-y divide-border border-y border-border">
                    <ToggleRow id="pe-free" label="شحن مجاني" description="لا تُحتسب رسوم توصيل على هذا المنتج." {...bool("is_free_shipping")} />
                    <ToggleRow id="pe-hazard" label="مادة خطرة" description="بعض شركات الشحن لا تقبل المواد الخطرة." {...bool("is_hazardous")}>
                      <Field label="فئة الخطورة" htmlFor="pe-hc" required error={err("hazard_class")} className="sm:max-w-xs">
                        <NativeSelect id="pe-hc" className="h-11 md:h-8" disabled={readOnly} {...register("hazard_class")}>
                          {HAZARD_CLASSES.filter((h) => h !== "none").map((h) => (
                            <option key={h} value={h}>
                              {HAZARD_CLASS_LABELS[h]}
                            </option>
                          ))}
                          <option value="none">{HAZARD_CLASS_LABELS.none}</option>
                        </NativeSelect>
                      </Field>
                    </ToggleRow>
                  </div>
                  <Field label="مدة التوصيل" htmlFor="pe-dd" error={err("delivery_duration")} className="sm:max-w-xs">
                    <input id="pe-dd" className={inputClass} readOnly={readOnly} placeholder="2-4 أيام" {...register("delivery_duration")} />
                  </Field>
                  <Grid cols={4}>
                    <Field label="الوزن (كغ)" htmlFor="pe-w" error={err("weight")}>
                      <input id="pe-w" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("weight")} />
                    </Field>
                    <Field label="الطول (سم)" htmlFor="pe-l" error={err("length")}>
                      <input id="pe-l" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("length")} />
                    </Field>
                    <Field label="العرض (سم)" htmlFor="pe-wd" error={err("width")}>
                      <input id="pe-wd" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("width")} />
                    </Field>
                    <Field label="الارتفاع (سم)" htmlFor="pe-h" error={err("height")}>
                      <input id="pe-h" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("height")} />
                    </Field>
                  </Grid>
                </>
              )}
            </Section>

            <Section id="seo" title="تحسين محركات البحث (SEO)">
              <Field label="عنوان الصفحة" htmlFor="pe-mt" error={err("meta_title")} counter={{ value: v.meta_title.length, max: 70 }}>
                <input id="pe-mt" className={inputClass} readOnly={readOnly} {...register("meta_title")} />
              </Field>
              <Field label="الوصف" htmlFor="pe-md" error={err("meta_description")} counter={{ value: v.meta_description.length, max: 160 }}>
                <Textarea id="pe-md" rows={3} readOnly={readOnly} {...register("meta_description")} />
              </Field>
              <Field label="الكلمات المفتاحية" htmlFor="pe-mk" error={err("meta_keywords")} counter={{ value: v.meta_keywords.length, max: 255 }}>
                <input id="pe-mk" className={inputClass} readOnly={readOnly} {...register("meta_keywords")} />
              </Field>
            </Section>
          </div>

          {/* Side column */}
          <aside className="flex flex-col border-t border-border pt-6 lg:col-span-4 lg:border-t-0 lg:border-s lg:ps-8 lg:pt-14">
            <SideBlock title="الحالة والنشر">
              <div className="divide-y divide-border border-y border-border">
                <ToggleRow id="pe-available" label="متاح للبيع" description="إيقافه يجعل المنتج مسودة لا تظهر في المتجر." {...bool("is_available")} testId="pe-available" />
                <ToggleRow id="pe-featured" label="منتج مميز" description="يظهر في قسم المنتجات المميزة." {...bool("is_featured")} />
              </div>
              <Field label="تاريخ النشر" htmlFor="pe-pub" hint="اتركه فارغاً للنشر فوراً؛ تاريخ مستقبلي = مجدول.">
                <input id="pe-pub" type="datetime-local" dir="ltr" className={inputClass} readOnly={readOnly} {...register("published_at")} />
              </Field>
              {product?.archived_at ? (
                <p className="text-sm text-muted-foreground">
                  مؤرشف منذ <Mono>{formatDateTime(product.archived_at)}</Mono>
                </p>
              ) : null}
              {product?.active_badges.length ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">شارات تلقائية</p>
                  <ul className="flex flex-col gap-1">
                    {product.active_badges.map((b) => (
                      <li key={b.name} className="flex items-start gap-2 text-sm">
                        <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                        <span>
                          {b.name} <span className="text-xs text-muted-foreground">— {b.reason}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {product ? (
                <p className="text-xs text-muted-foreground">
                  مشاهدات <Mono className="text-foreground">{formatNumber(product.views_count)}</Mono> · أُضيف للسلة{" "}
                  <Mono className="text-foreground">{formatNumber(product.add_to_cart_count)}</Mono>
                </p>
              ) : null}
            </SideBlock>

            <SideBlock title="التنظيم">
              <Field label="التصنيف" htmlFor="pe-category">
                <CategoryPicker value={v.category_id} onChange={(next) => setValue("category_id", next, { shouldDirty: true })} disabled={readOnly} />
              </Field>
              <Field label="الماركة" htmlFor="pe-brand">
                <BrandPicker value={v.brand_id} onChange={(next) => setValue("brand_id", next, { shouldDirty: true })} disabled={readOnly} />
              </Field>
              <Field label="الوسوم">
                <TagPicker value={v.tag_ids} onChange={(next) => setValue("tag_ids", next, { shouldDirty: true })} disabled={readOnly} />
              </Field>
              <Field label="الشارات">
                <BadgesPicker value={v.badge_ids} onChange={(next) => setValue("badge_ids", next, { shouldDirty: true })} disabled={readOnly} />
              </Field>
              <Field label="المجموعات">
                <CollectionsPicker value={v.collection_ids} onChange={(next) => setValue("collection_ids", next, { shouldDirty: true })} disabled={readOnly} />
              </Field>
              {product?.blueprint_id ? (
                <p className="text-xs text-muted-foreground">
                  مبني على قالب «{templates.find((t) => t.id === product.blueprint_id)?.name ?? product.blueprint_id}»
                </p>
              ) : null}
            </SideBlock>

            <SideBlock title="الأعلام">
              <div className="divide-y divide-border border-y border-border">
                <ToggleRow id="pe-serial" label="أرقام تسلسلية" description="كل قطعة برقم مستقل (IMEI، رقم الضمان)." {...bool("is_serialized")} />
                <ToggleRow id="pe-bundle" label="حزمة" description="مكوّناتها وقواعد توافقها في تبويب «الأنماط المتقدمة»." {...bool("is_bundle")}>
                  <Field label="رسوم التجميع" htmlFor="pe-bfee" error={err("bundle_build_fee")}>
                    <input id="pe-bfee" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("bundle_build_fee")} />
                  </Field>
                </ToggleRow>
                <ToggleRow
                  id="pe-auction"
                  label="مزاد"
                  description={product?.auction_status === "active" ? "مزاد نشط: السعر والمخزون محجوبان حتى انتهائه." : "قطعة واحدة لأعلى مزايد؛ إعداداته في تبويب «الأنماط المتقدمة»."}
                  {...bool("is_auction")}
                  disabled={readOnly || product?.auction_status === "active"}
                />
                <ToggleRow id="pe-personal" label="قابل للتخصيص" description="حقول التخصيص في تبويب «الأنماط المتقدمة»." {...bool("is_personalizable")} />
                <ToggleRow id="pe-bookable" label="قابل للحجز" description="يُباع كموعد في تقويم الحجوزات (M26)." {...bool("is_bookable")}>
                  <Field label="مدة الحجز (دقيقة)" htmlFor="pe-bdur" required error={err("booking_duration_minutes")}>
                    <input id="pe-bdur" dir="ltr" inputMode="numeric" className={numericInputClass} readOnly={readOnly} {...register("booking_duration_minutes")} />
                  </Field>
                </ToggleRow>
              </div>
            </SideBlock>
          </aside>
        </div>
      )}

      {/* Sticky save bar */}
      {!readOnly && (dirty || !product) ? (
        <div
          role="region"
          aria-label="حفظ التغييرات"
          className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card lg:bottom-0 lg:start-auto lg:end-0 lg:w-[calc(100%-16rem)]"
          data-testid="save-bar"
        >
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
            <p className="flex-1 text-sm">
              {dirty ? "تغييرات غير محفوظة" : "منتج جديد غير محفوظ"}
              {formError ? <span className="ms-2 text-destructive">{formError}</span> : null}
            </p>
            {product ? (
              <Button type="button" variant="ghost" size="lg" className="h-11 lg:h-9" onClick={() => {
                reset(initial);
                clearDraft();
                setFormError("");
              }}>
                تجاهل
              </Button>
            ) : null}
            <Button type="submit" size="lg" className="h-11 gap-1.5 lg:h-9" disabled={save.isPending} data-testid="product-save">
              {save.isPending ? "جارٍ الحفظ…" : "حفظ"} <Mono className="hidden text-[11px] opacity-70 lg:inline">Ctrl+S</Mono>
            </Button>
          </div>
        </div>
      ) : null}

      {/* Leave guard */}
      <Dialog open={leaveTo !== null} onOpenChange={(o) => !o && setLeaveTo(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>تغييرات غير محفوظة</DialogTitle>
          <DialogDescription>احفظ تغييراتك قبل المغادرة أو تجاهلها.</DialogDescription>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-11 lg:h-9"
              onClick={() => {
                const to = leaveTo;
                reset(initial);
                clearDraft();
                setLeaveTo(null);
                if (to) router.push(to);
              }}
            >
              تجاهل
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-11 lg:h-9"
              onClick={async () => {
                const to = leaveTo;
                setLeaveTo(null);
                const ok = await submit();
                if (ok && to) router.push(to);
              }}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete / archive */}
      {product ? (
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent className="sm:max-w-sm">
            <DialogTitle>{product.has_orders ? "أرشفة المنتج" : "حذف المنتج"}</DialogTitle>
            <DialogDescription>
              {product.has_orders
                ? "لهذا المنتج طلبات سابقة، لذلك يُؤرشف بدل الحذف: يختفي من المتجر وتبقى الطلبات بلقطاتها."
                : `سيُحذف «${product.name}» نهائياً.`}
            </DialogDescription>
            <DialogFooter>
              <Button type="button" variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => setConfirmDelete(false)}>
                إلغاء
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="h-11 lg:h-9"
                onClick={async () => {
                  try {
                    const res = await remove.mutateAsync(product.id);
                    toast.success(res?.archived ? "أُرشف المنتج" : "حُذف المنتج");
                    reset(initial);
                    router.push("/dashboard/products");
                  } catch (e) {
                    toast.error(isApiError(e) ? e.userMessage : "تعذّر التنفيذ.");
                  } finally {
                    setConfirmDelete(false);
                  }
                }}
              >
                {product.has_orders ? "أرشفة" : "حذف"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </form>
  );
}


/** What the merchant is looking at when the editor opens from a preset (and what was not copied). */
function SeedBanner({ seed }: { seed: EditorSeed }) {
  if (seed.kind === "duplicate") {
    return (
      <div role="status" className="surface-card flex gap-3 border-primary/30 bg-accent px-4 py-3 text-sm" data-testid="duplicate-banner">
        <Copy className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium">
            نسخة من{" "}
            <Link href={`/dashboard/products/${seed.source.id}`} className="text-accent-ink underline-offset-4 hover:underline">
              «{seed.source.name}»
            </Link>{" "}
            — لم تُحفظ بعد. عدّل ما يلزم ثم اضغط «حفظ» لإنشاء منتج مستقل.
          </p>
          <p className="text-muted-foreground">
            يُنسخ: {DUPLICATE_CARRIED}. لا يُنسخ: {DUPLICATE_RESET}. تُحفظ النسخة مخفية عن المتجر.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div role="status" className="surface-card flex gap-3 border-primary/30 bg-accent px-4 py-3 text-sm" data-testid="template-banner">
      <LayoutTemplate className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-medium">
          مبني على قالب «{seed.template.name}» — عُبِّئ <Mono>{seed.filled}</Mono> حقلاً مسبقاً.
        </p>
        <p className="text-muted-foreground">
          أكمل الاسم والسعر والصور ثم احفظ. {seed.template.variant_attribute_ids.length > 0 ? "سمات المتغيرات من القالب تظهر جاهزة في قسم «المتغيرات» بعد الحفظ." : ""}
        </p>
      </div>
    </div>
  );
}
