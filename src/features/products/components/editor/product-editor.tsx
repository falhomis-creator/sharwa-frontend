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
  type ProductTemplate,
  type VariantAttribute,
} from "@/features/products/schemas";
import { useQueryClient } from "@tanstack/react-query";
import {
  generateVariants,
  productKeys,
  saveVariants,
  uploadImagesSequential,
  useDeleteProduct,
  useGlobalTemplates,
  useProduct,
  useSaveProduct,
  useTemplates,
  useVariantAttributes,
} from "@/features/products/api/products";
import { useCatalogAccess } from "@/features/products/hooks/use-catalog-access";
import { useProductEditorStore } from "@/stores/product-editor";
import { ProductStatusText } from "@/features/products/components/status-text";
import { EMPTY_PRODUCT_FORM, detailToForm, formToPayload } from "@/features/products/components/editor/form-mapping";
import {
  DUPLICATE_CARRIED,
  DUPLICATE_RESET,
  duplicateForm,
  duplicateProductHref,
  templateForm,
  variantCopyPlan,
  variantPriceRows,
  type EditorSeed,
} from "@/features/products/components/editor/prefill";
import { MediaGallery } from "@/features/products/components/editor/media-gallery";
import { PendingMedia, type PendingImage } from "@/features/products/components/editor/pending-media";
import { VariantMatrix } from "@/features/products/components/editor/variant-matrix";
import {
  EMPTY_PLAN,
  VariantBuilder,
  attrsFromTemplate,
  mergeTemplateAttrs,
  persistVariantPlan,
  planCombos,
  planIsActive,
  validatePlan,
  type VariantPlan,
} from "@/features/products/components/editor/variant-builder";
import { CardGroup, CollapsibleCard, EditorCard } from "@/features/products/components/editor/editor-cards";
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
 * Layout (owner directive 2026-10-22, Shopify-style): ONE scrollable page of vertical cards —
 * no top tabs and no section nav (they raised the cognitive load).
 *   Main column: ① المعلومات الأساسية · ② الوسائط · ③ التنظيم والقالب · ④ المتغيرات والتسعير
 *   (dynamic: the chosen template's attributes appear as tag inputs and build the variants
 *   table) · ⑤ الشحن (collapsible, closed) · ⑥ SEO (collapsible, closed) · and, for a saved
 *   product, «الأنماط المتقدمة» and «سجل التغييرات» as closed cards (`?tab=advanced|history`
 *   opens them, so old links keep working).
 *   Side column: حالة النشر + خصائص المنتج (on phones the status card comes first).
 * Conditional fields are HIDDEN, never disabled (FR-04.04); digital and service products drop
 * the shipping group for «لا يتطلب شحناً» (FR-04.05).
 *
 * A new product can get its images and variants BEFORE the first save: both stay in the
 * browser and are sent right after the product is created (same endpoints as a saved product).
 *
 * Saving is explicit (FR-04.11): the sticky footer always carries «حفظ» and «إلغاء», `⌘S` /
 * `Ctrl+S` saves, and leaving through an in-app link with unsaved changes asks first. A LOCAL
 * draft of the form is auto-saved to this browser (T072) and offered back on the next visit.
 *
 * Creation presets (owner directive 2026-10-20): `/new?duplicate=<id>` opens the editor as a
 * copy of that product and `/new?template=<id>` pre-selects a template (see `prefill.ts`).
 */
const DRAFT_PREFIX = "sharwa:product-draft:";
const SHIPPING_FIELDS = ["delivery_duration", "weight", "length", "width", "height", "hazard_class"] as const;
const SEO_FIELDS = ["meta_title", "meta_description", "meta_keywords"] as const;
/** Blueprint keys a template must never overwrite in the form. */
const TEMPLATE_SKIP = new Set(["name", "sku", "slug"]);
/** Labels for the «أكمل الحقول المطلوبة: …» summary next to «حفظ» (schema audit 2026-10-23). */
const REQUIRED_LABELS: Partial<Record<keyof ProductFormValues, string>> = {
  name: "اسم المنتج",
  price: "السعر",
  category_id: "التصنيف",
  unit: "الوحدة",
};

/** After a failed save: open, scroll to and focus the first field that shows an error. */
function focusFirstError() {
  // Two frames: a collapsed card (الشحن، SEO) opens on its error first, then the field exists.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const alert = document.querySelector<HTMLElement>('[data-testid="product-editor"] [data-field-error]');
      const control = alert?.parentElement?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button");
      (control ?? alert)?.scrollIntoView({ behavior: "smooth", block: "center" });
      control?.focus({ preventScroll: true });
    }),
  );
}

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
  const attributes = useVariantAttributes();
  const template = creating && templateId !== null ? (templates.data ?? []).find((t) => t.id === templateId) : undefined;
  const seed = useMemo<EditorSeed | null>(() => {
    if (!creating) return null;
    if (duplicateId !== null && source.data) return { kind: "duplicate", source: source.data, form: duplicateForm(source.data) };
    if (template) return { kind: "template", template, ...templateForm(template) };
    return null;
  }, [creating, duplicateId, source.data, template]);

  // A template seed needs the dictionary too: its attributes open as named tag inputs.
  const waitingForSeed =
    (creating && duplicateId !== null && source.isLoading) ||
    (creating && templateId !== null && (templates.isLoading || attributes.isLoading));
  if ((productId !== null && query.isLoading) || waitingForSeed) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-8">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl lg:col-span-4" />
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
      initialAttributes={attributes.data ?? []}
      missingTemplate={creating && templateId !== null && !templates.isLoading && !template}
    />
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────────────
function EditorForm({
  product,
  seed,
  initialAttributes,
  missingTemplate,
}: {
  product: ProductDetail | null;
  seed: EditorSeed | null;
  initialAttributes: VariantAttribute[];
  missingTemplate: boolean;
}) {
  const qc = useQueryClient();
  const attributesQuery = useVariantAttributes();
  const attributes = useMemo(() => attributesQuery.data ?? [], [attributesQuery.data]);
  const router = useRouter();
  const store = useStore();
  const storeOrigin = useStoreOrigin();
  const access = useCatalogAccess();
  const readOnly = !access.canManage;
  const discountsReadOnly = readOnly || !access.canManageDiscounts;
  const save = useSaveProduct(product?.id ?? null);
  const remove = useDeleteProduct();
  const templates = useTemplates().data ?? [];
  const globals = useGlobalTemplates(!product);
  // Old deep links (`?tab=advanced|history`) now open the matching card instead of a tab.
  const [openPanel] = useQueryState("tab", parseAsStringLiteral(["advanced", "history"]));
  const [formError, setFormError] = useState("");
  const [finishing, setFinishing] = useState<string | null>(null);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const [now] = useState(() => Date.now());

  // New-product only state (kept in the browser until «حفظ»).
  const [blueprintId, setBlueprintId] = useState<number | null>(seed?.kind === "template" ? seed.template.id : null);
  const [plan, setPlan] = useState<VariantPlan>(() =>
    seed?.kind === "template" ? { attrs: attrsFromTemplate(seed.template, initialAttributes), rows: {} } : EMPTY_PLAN,
  );
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  /** Bumped by «تجاهل التغييرات» so the saved product's variant matrix drops its local edits. */
  const [matrixKey, setMatrixKey] = useState(0);
  const [templateNote, setTemplateNote] = useState<string | null>(
    seed?.kind === "template" ? `عُبِّئ ${seed.filled} حقلاً من «${seed.template.name}» — أكمل الاسم والسعر والصور ثم احفظ.` : null,
  );

  const initial = useMemo(() => (product ? detailToForm(product) : (seed?.form ?? EMPTY_PRODUCT_FORM)), [product, seed]);
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues: initial, mode: "onBlur" });
  const { register, handleSubmit, setValue, reset, setError, formState } = form;
  const v = { ...form.formState.defaultValues, ...useWatch({ control: form.control }) } as ProductFormValues;
  const formDirty = formState.isDirty;
  const extraDirty = !product && (pendingImages.length > 0 || plan.attrs.some((a) => a.values.length > 0));
  // Saved product: edited variant rows and a not-yet-generated matrix are unsaved changes too —
  // «حفظ» persists them (schema audit 2026-10-23). Images of a saved product upload at once.
  const variantDirty = useProductEditorStore((s) =>
    product ? Object.keys(s.variantDrafts[product.id] ?? {}).length > 0 || Boolean(s.variantPending[product.id]) : false,
  );
  const dirty = formDirty || extraDirty || variantDirty;
  // A preset gets its own draft slot, so a blank «منتج جديد» draft never hijacks a copy and vice versa.
  const draftKey = `${DRAFT_PREFIX}${store}:${product?.id ?? (seed ? `new-${seed.kind}-${seed.kind === "duplicate" ? seed.source.id : seed.template.id}` : "new")}`;

  const duplicateWithVariants = !product && seed?.kind === "duplicate" && seed.source.variants.length > 0;
  const builderActive = !product && !duplicateWithVariants && planIsActive(plan);

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
    if (!formDirty) return;
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify({ at: new Date().toISOString(), values: JSON.parse(serialized) }));
      } catch {
        // storage unavailable — drafts are a convenience only
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [serialized, formDirty, draftKey]);

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  };

  /**
   * Template selector (new product): the blueprint fields fill the form at once and the
   * template's attributes appear in «المتغيرات والتسعير». Values the merchant already typed
   * for variants are kept; name, SKU and slug are never touched.
   */
  function chooseTemplate(next: ProductTemplate | null) {
    setBlueprintId(next?.id ?? null);
    setPlan((p) => ({ ...p, attrs: mergeTemplateAttrs(p.attrs, next ? attrsFromTemplate(next, attributes) : []) }));
    if (!next) {
      setTemplateNote(null);
      return;
    }
    const filled = templateForm(next).form as unknown as Record<string, unknown>;
    let n = 0;
    for (const key of Object.keys(next.fields)) {
      if (!(key in EMPTY_PRODUCT_FORM) || TEMPLATE_SKIP.has(key) || Array.isArray(filled[key])) continue;
      setValue(key as keyof ProductFormValues, filled[key] as never, { shouldDirty: true, shouldValidate: false });
      n += 1;
    }
    const note = `طُبِّق القالب «${next.name}»: ${n} حقلاً و${next.variant_attribute_ids.length} سمة`;
    setTemplateNote(`${note}.`);
    toast.success(note);
  }

  /** Validate + save; resolves `true` when the server accepted the product. */
  const submit = () =>
    new Promise<boolean>((resolve) => {
      void handleSubmit(
        async (values) => {
          setFormError("");
          const planError = builderActive ? validatePlan(plan) : null;
          if (planError) {
            setFormError(planError);
            document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
            resolve(false);
            return;
          }
          try {
            const blueprintForCreate = product ? null : seed?.kind === "duplicate" ? seed.source.blueprint_id : blueprintId;
            // [NEEDS BACKEND] `blueprint_id` on create: links the new product to its template (M04 US-04.6).
            const payload: Record<string, unknown> = {
              ...formToPayload(values),
              ...(blueprintForCreate !== null ? { blueprint_id: blueprintForCreate } : {}),
            };
            // With variants the stock lives on each variant (FR-04.09).
            if (builderActive) payload.stock = "0";
            // INT-005: a saved product sends `stock` only when the merchant changed it. Django shows
            // a backordered (negative) stock as 0, so echoing the loaded value back would reset the
            // backorder to 0 on every unrelated save — and is refused outright for products whose
            // stock lives on variants, serial numbers or locations.
            if (product && Number(payload.stock ?? 0) === Number(initial.stock || 0)) delete payload.stock;
            const saved = await save.mutateAsync(payload);
            clearDraft();
            setDraftDismissed(true);
            reset(detailToForm(saved));
            let variantsCount = 0;
            let imagesCount = 0;
            const flushVariants = product ? useProductEditorStore.getState().variantFlush[product.id] : undefined;
            if (product && variantDirty && flushVariants) {
              setFinishing("جارٍ حفظ المتغيرات…");
              try {
                variantsCount = await flushVariants();
              } catch (e) {
                const msg = isApiError(e) ? e.userMessage : e instanceof Error ? e.message : "";
                toast.warning(`حُفظ المنتج، لكن تعذّر حفظ المتغيرات${msg ? `: ${msg}` : ""}`);
              }
            }
            if (!product) {
              if (seed?.kind === "duplicate") variantsCount = await copyVariants(saved.id, seed.source);
              else if (builderActive && planCombos(plan.attrs).length > 0) variantsCount = await createPlannedVariants(saved.id);
              if (pendingImages.length > 0) imagesCount = await uploadPending(saved.id);
              if (variantsCount || imagesCount) await qc.invalidateQueries({ queryKey: productKeys(store).detail(saved.id) });
            }
            const extras = [variantsCount ? `${variantsCount} متغيراً` : "", imagesCount ? `${imagesCount} صور` : ""].filter(Boolean).join(" و");
            toast.success(
              product
                ? `حُفظت التغييرات${variantsCount ? ` مع ${variantsCount} متغيراً` : ""}`
                : seed?.kind === "duplicate"
                  ? `أُنشئت النسخة «${saved.name}»${extras ? ` مع ${extras}` : ""} — مخفية عن المتجر حتى تفعّل «متاح»`
                  : `أُنشئ المنتج «${saved.name}»${extras ? ` مع ${extras}` : ""}`,
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
            if (isApiError(err) && err.fields) focusFirstError();
            resolve(false);
          } finally {
            setFinishing(null);
          }
        },
        (invalid) => {
          // Never a silent button: say what is missing, then take the merchant to the first field.
          const keys = Object.keys(invalid) as Array<keyof ProductFormValues>;
          const missing = keys.map((k) => REQUIRED_LABELS[k]).filter(Boolean);
          const others = keys.length - missing.length;
          setFormError(
            missing.length
              ? `أكمل الحقول المطلوبة: ${missing.join("، ")}${others ? ` — وصحّح ${others} حقلاً آخر معلّماً بالأحمر` : ""}.`
              : `صحّح ${keys.length === 1 ? "الحقل المعلّم" : `${keys.length} حقول معلّمة`} بالأحمر.`,
          );
          focusFirstError();
          resolve(false);
        },
      )();
    });

  /** Rebuild the source's variant set on the new copy (same combinations, same extra prices). */
  async function copyVariants(newId: number, source: ProductDetail): Promise<number> {
    const copy = variantCopyPlan(source, attributes);
    if (!copy) return 0;
    setFinishing("جارٍ نسخ المتغيرات…");
    try {
      let rows = await generateVariants(newId, copy.request);
      const prices = variantPriceRows(rows, copy);
      if (prices.length) rows = await saveVariants(newId, prices);
      return rows.length;
    } catch {
      toast.warning("أُنشئت النسخة، لكن تعذّر نسخ المتغيرات — ولّدها من بطاقة «المتغيرات والتسعير».");
      return 0;
    }
  }

  /** The variants typed before the first save (tag inputs + table), created on the new product. */
  async function createPlannedVariants(newId: number): Promise<number> {
    setFinishing("جارٍ إنشاء المتغيرات…");
    try {
      const fresh = (await attributesQuery.refetch()).data ?? attributes;
      const n = await persistVariantPlan(newId, plan, fresh);
      void qc.invalidateQueries({ queryKey: productKeys(store).attributes });
      return n;
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : isApiError(err) ? err.userMessage : "";
      toast.warning(`أُنشئ المنتج، لكن تعذّر إنشاء المتغيرات${msg ? `: ${msg}` : ""} — أكملها من بطاقة «المتغيرات والتسعير».`);
      return 0;
    }
  }

  /** Pending images go up one per request (Nginx 8 MB per request), in the order shown. */
  async function uploadPending(newId: number): Promise<number> {
    const files = pendingImages.map((i) => i.file);
    const result = await uploadImagesSequential(newId, files, (done, total) =>
      setFinishing(done < total ? `جارٍ رفع الصور ${done + 1}/${total}…` : "جارٍ إنهاء الحفظ…"),
    );
    setPendingImages([]);
    if (result.failed.length > 0) {
      toast.warning(
        `أُنشئ المنتج، لكن تعذّر رفع ${result.failed.length} من ${files.length} صور (${result.failed.map((f) => f.name).join("، ")}) — ارفعها من بطاقة «الوسائط».`,
      );
    }
    return result.uploaded;
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

  /** Drop every unsaved change (form, pre-save variants and images). */
  function discardAll() {
    reset(initial);
    clearDraft();
    setFormError("");
    if (product) {
      useProductEditorStore.getState().setVariantDrafts(product.id, undefined);
      useProductEditorStore.getState().setVariantPending(product.id, false);
      setMatrixKey((k) => k + 1);
    }
    if (!product) {
      setPendingImages([]);
      setPlan(seed?.kind === "template" ? { attrs: attrsFromTemplate(seed.template, attributes), rows: {} } : EMPTY_PLAN);
      setBlueprintId(seed?.kind === "template" ? seed.template.id : null);
      setTemplateNote(null);
    }
  }

  const physical = v.product_type === "physical";
  const hasVariants = (product?.variants.length ?? 0) > 0;
  const variantsOwnStock = hasVariants || builderActive || duplicateWithVariants;
  const errors = formState.errors;
  const err = (k: keyof ProductFormValues) => errors[k]?.message as string | undefined;
  // A sector's own template is named exactly like the sector (Django `seed_variant_templates`).
  const sectorNames = new Set((globals.data ?? []).map((g) => g.name));
  const isSectorTemplate = (t: ProductTemplate) => sectorNames.has(t.name);
  const linkedTemplate = product?.blueprint_id ? templates.find((t) => t.id === product.blueprint_id) : undefined;
  const busy = save.isPending || finishing !== null;

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

  const shippingSummary = !physical
    ? `لا يتطلب شحناً — ${PRODUCT_TYPE_LABELS[v.product_type]}`
    : [v.is_free_shipping ? "شحن مجاني" : "", v.weight ? `${v.weight} كغ` : "", v.delivery_duration, v.is_hazardous ? "مادة خطرة" : ""]
        .filter(Boolean)
        .join(" · ") || "الوزن والأبعاد ومدة التوصيل";
  const seoSummary = v.meta_title || "يُستخدم اسم المنتج ووصفه افتراضياً في نتائج البحث";

  const bool = (k: keyof ProductFormValues) => ({
    checked: Boolean(v[k]),
    onCheckedChange: (next: boolean) => setValue(k, next as never, { shouldDirty: true }),
    disabled: readOnly,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate className="flex flex-col gap-5 pb-28" data-testid="product-editor">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link href="/dashboard/products" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:min-h-0">
            <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> المنتجات
          </Link>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {product ? product.name || "بلا اسم" : seed?.kind === "duplicate" ? "نسخ منتج" : blueprintId !== null ? "منتج جديد من قالب" : "منتج جديد"}
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

      {seed?.kind === "duplicate" && !readOnly ? <DuplicateBanner seed={seed} /> : null}
      {missingTemplate ? (
        <p role="status" className="surface-card px-4 py-3 text-sm text-muted-foreground">
          القالب المطلوب غير موجود (ربما حُذف) — يُفتح منتج جديد فارغ.
        </p>
      ) : null}

      {draftOffer && !readOnly ? (
        <div role="status" className="surface-card flex flex-wrap items-center gap-3 border-warning/40 px-4 py-3 text-sm">
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:items-start">
        {/* Side: publish status (first on phones, end column on desktop). */}
        <aside className="flex flex-col gap-5 lg:col-span-4 lg:col-start-9 lg:row-start-1" aria-label="حالة النشر">
          <EditorCard id="status" title="حالة النشر" testId="card-status">
            <div className="-my-3 divide-y divide-border/60">
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
          </EditorCard>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-8 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          {/* ① Basic info */}
          <EditorCard id="basic" title="المعلومات الأساسية" description="الحقول المعلّمة بـ * مطلوبة، والباقي اختياري ويمكن تركه فارغاً." testId="card-basic">
            <Field label="اسم المنتج" htmlFor="pe-name" required error={err("name")} counter={{ value: v.name.length, max: 200 }}>
              <input id="pe-name" className={inputClass} readOnly={readOnly} maxLength={200} aria-invalid={Boolean(errors.name)} {...register("name")} />
            </Field>
            <Grid>
              <Field label="الاسم بالإنجليزية" htmlFor="pe-name-en" error={err("name_en")}>
                <input id="pe-name-en" dir="ltr" className={inputClass} readOnly={readOnly} maxLength={200} {...register("name_en")} />
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
              <Field label="الرابط (slug)" htmlFor="pe-slug" error={err("slug")} hint="اختياري — يُولَّد تلقائياً إن تُرك فارغاً، وأي نص تكتبه يُحوَّل إلى رابط صالح.">
                <input id="pe-slug" dir="ltr" className={cn(inputClass, "font-mono")} readOnly={readOnly} maxLength={255} {...register("slug")} />
              </Field>
              <Field label="SKU" htmlFor="pe-sku" error={err("sku")} hint={product ? undefined : "يُولَّد تلقائياً (SHW-…)"}>
                <input id="pe-sku" dir="ltr" className={cn(inputClass, "font-mono")} readOnly={readOnly} placeholder="SHW-XXXXXXXX" maxLength={64} {...register("sku")} />
              </Field>
              <Field label="الباركود" htmlFor="pe-barcode" error={err("barcode")}>
                <input id="pe-barcode" dir="ltr" inputMode="numeric" className={cn(inputClass, "font-mono")} readOnly={readOnly} maxLength={64} {...register("barcode")} />
              </Field>
            </Grid>
            <Field label="الوصف" htmlFor="pe-desc">
              <Textarea id="pe-desc" rows={6} readOnly={readOnly} {...register("description")} />
            </Field>
            <Field label="الوصف بالإنجليزية" htmlFor="pe-desc-en">
              <Textarea id="pe-desc-en" dir="ltr" rows={3} readOnly={readOnly} {...register("description_en")} />
            </Field>
            <Field label="تخطيط صفحة المنتج" htmlFor="pe-tpl" className="sm:max-w-xs">
              <NativeSelect id="pe-tpl" className="h-11 md:h-8" disabled={readOnly} {...register("product_template")}>
                {PRODUCT_TEMPLATES.map((t) => (
                  <option key={t} value={t}>
                    {PRODUCT_TEMPLATE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </EditorCard>

          {/* ② Media */}
          <EditorCard id="media" title="الوسائط" description="الصورة الأولى هي الرئيسية في المتجر." testId="card-media">
            {product ? (
              <MediaGallery product={product} readOnly={readOnly} />
            ) : (
              <PendingMedia images={pendingImages} onChange={setPendingImages} disabled={readOnly} />
            )}
            <Grid>
              <Field label="رابط صورة خارجية" htmlFor="pe-iurl" error={err("image_url")}>
                <input id="pe-iurl" dir="ltr" className={cn(inputClass, "font-mono")} readOnly={readOnly} placeholder="https://" {...register("image_url")} />
              </Field>
              <Field label="رابط فيديو" htmlFor="pe-vurl" error={err("video_url")}>
                <input id="pe-vurl" dir="ltr" className={cn(inputClass, "font-mono")} readOnly={readOnly} placeholder="https://" {...register("video_url")} />
              </Field>
            </Grid>
          </EditorCard>

          {/* ③ Organization & template */}
          <EditorCard id="organization" title="التنظيم والقالب" testId="card-organization">
            {product ? (
              <p className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm" data-testid="linked-template">
                <LayoutTemplate className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {product.blueprint_id ? (
                  <span>
                    مبني على قالب «{linkedTemplate?.name ?? product.blueprint_id}»
                  </span>
                ) : (
                  <span className="text-muted-foreground">غير مرتبط بقالب.</span>
                )}
                <Link href="/dashboard/products/templates" className="ms-auto text-primary underline-offset-4 hover:underline">
                  إدارة القوالب
                </Link>
              </p>
            ) : seed?.kind === "duplicate" ? null : (
              <Field
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <LayoutTemplate className="size-4 text-primary" aria-hidden /> قالب المنتج
                  </span>
                }
                htmlFor="pe-blueprint"
                hint={
                  templates.length === 0 ? (
                    <>
                      لا قوالب بعد —{" "}
                      <Link href="/dashboard/products/templates" className="text-primary underline-offset-4 hover:underline">
                        أنشئ قالباً
                      </Link>{" "}
                      للحقول والسمات المتكررة.
                    </>
                  ) : (
                    "يملأ الحقول المتكررة فوراً، وتظهر سماته (المقاس، اللون…) في بطاقة «المتغيرات والتسعير»."
                  )
                }
              >
                <NativeSelect
                  id="pe-blueprint"
                  value={blueprintId === null ? "" : String(blueprintId)}
                  onChange={(e) => chooseTemplate(templates.find((t) => String(t.id) === e.target.value) ?? null)}
                  disabled={readOnly || templates.length === 0}
                  className="h-11 md:h-9"
                  data-testid="template-select"
                >
                  <option value="">بلا قالب</option>
                  {(
                    [
                      ["قوالبي", templates.filter((t) => t.global_template_id === null || !isSectorTemplate(t))],
                      ["قوالب القطاعات المركزية", templates.filter((t) => t.global_template_id !== null && isSectorTemplate(t))],
                    ] as const
                  )
                    .filter(([, list]) => list.length > 0)
                    .map(([label, list]) => (
                      <optgroup key={label} label={label}>
                        {list.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} — {Object.keys(t.fields).length} حقلاً، {t.variant_attribute_ids.length} سمة
                          </option>
                        ))}
                      </optgroup>
                    ))}
                </NativeSelect>
                {templateNote ? (
                  <p role="status" className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-ink" data-testid="template-banner">
                    {templateNote}
                  </p>
                ) : null}
              </Field>
            )}
            <Grid>
              <Field label="التصنيف" htmlFor="pe-category" required error={err("category_id")}>
                <CategoryPicker
                  value={v.category_id}
                  onChange={(next) => setValue("category_id", next, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
                  disabled={readOnly}
                  invalid={Boolean(errors.category_id)}
                  placeholder="اختر التصنيف…"
                />
              </Field>
              <Field label="الماركة" htmlFor="pe-brand">
                <BrandPicker value={v.brand_id} onChange={(next) => setValue("brand_id", next, { shouldDirty: true })} disabled={readOnly} />
              </Field>
            </Grid>
            <Field label="الوسوم">
              <TagPicker value={v.tag_ids} onChange={(next) => setValue("tag_ids", next, { shouldDirty: true })} disabled={readOnly} />
            </Field>
            <Grid>
              <Field label="الشارات">
                <BadgesPicker value={v.badge_ids} onChange={(next) => setValue("badge_ids", next, { shouldDirty: true })} disabled={readOnly} />
              </Field>
              <Field label="المجموعات">
                <CollectionsPicker value={v.collection_ids} onChange={(next) => setValue("collection_ids", next, { shouldDirty: true })} disabled={readOnly} />
              </Field>
            </Grid>
          </EditorCard>

          {/* ④ Variants & pricing (dynamic) */}
          <EditorCard
            id="pricing"
            title="المتغيرات والتسعير"
            description={variantsOwnStock ? "السعر الأساسي + سعر إضافي لكل متغير، والمخزون لكل متغير." : "سعر ومخزون واحد — أضف سمات لتوليد المتغيرات."}
            testId="card-pricing"
          >
            <CardGroup title="السعر">
              <Grid cols={3}>
                <Field
                  label={variantsOwnStock ? "السعر الأساسي" : "السعر"}
                  htmlFor="pe-price"
                  required={v.pricing_type !== "formula"}
                  error={err("price")}
                  hint={v.pricing_type === "formula" ? "يُحسب من المعادلة أدناه عند الحفظ." : undefined}
                >
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
            </CardGroup>

            <CardGroup
              title="المتغيرات"
              description={product ? "المقاس واللون وغيرها من قاموس سمات المتجر." : "سمات القالب تظهر هنا؛ اكتب القيم ليتولّد جدول المتغيرات."}
            >
              {product ? (
                <VariantMatrix key={matrixKey} product={product} readOnly={readOnly} price={v.price} />
              ) : duplicateWithVariants && seed?.kind === "duplicate" ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                  تُنسخ متغيرات «{seed.source.name}» (<Mono>{seed.source.variants.length}</Mono>) وأسعارها الإضافية عند الحفظ، بمخزون يبدأ من 0.
                </p>
              ) : (
                <VariantBuilder plan={plan} onChange={setPlan} dictionary={attributes} basePrice={v.price} readOnly={readOnly} />
              )}
              {product || variantsOwnStock ? (
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
              ) : null}
            </CardGroup>

            <CardGroup title="المخزون">
              {v.is_serialized ? (
                <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
                  المخزون من الأرقام التسلسلية: <Mono>{product?.serial_available ?? 0}</Mono> متاحة
                  {product ? (
                    <>
                      {" "}·{" "}
                      <Link href={`/dashboard/inventory?product=${product.id}`} className="underline underline-offset-4">
                        إدارة الأرقام التسلسلية
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : hasVariants ? (
                <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
                  المخزون يُدار على المتغيرات — المجموع <Mono>{formatNumber(Number(product?.variants_stock_total ?? 0), 3)}</Mono> {UNIT_LABELS[v.unit]}.
                </p>
              ) : variantsOwnStock ? (
                <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm">المخزون يُدار على المتغيرات — أدخله لكل متغير في الجدول أعلاه.</p>
              ) : null}
              <Grid cols={3}>
                {!v.is_serialized && !variantsOwnStock ? (
                  <Field
                    label="المخزون"
                    htmlFor="pe-stock"
                    error={err("stock")}
                    hint={v.is_auction ? "المزاد قطعة واحدة دائماً." : !access.canAdjustStock && !readOnly ? "يتطلب صلاحية تعديل المخزون." : "فارغ = 0"}
                  >
                    <input id="pe-stock" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly || v.is_auction || !access.canAdjustStock} {...register("stock")} />
                  </Field>
                ) : null}
                <Field label="الوحدة" htmlFor="pe-unit" required error={err("unit")}>
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
              <Grid>
                <Field label="الحد الأدنى للكمية" htmlFor="pe-min" error={err("min_quantity")} hint={v.allow_variable_quantity ? `بوحدة ${UNIT_LABELS[v.unit]} — تقبل كسوراً (مثال: 0.5).` : undefined}>
                  <input id="pe-min" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("min_quantity")} />
                </Field>
                <Field label="الحد الأعلى للكمية" htmlFor="pe-max" error={err("max_quantity")}>
                  <input id="pe-max" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("max_quantity")} />
                </Field>
              </Grid>
              <div className="divide-y divide-border/60 border-y border-border/60">
                <ToggleRow id="pe-backorder" label="السماح بالطلب عند نفاد المخزون" description="يُقبل الطلب ويُعلَّم «طلب مسبق»." {...bool("allow_backorder")} />
                <ToggleRow id="pe-varqty" label="كمية متغيرة" description="يحدد المشتري كمية عشرية (مثل 1.5 كغ)." {...bool("allow_variable_quantity")} />
              </div>
            </CardGroup>

            <CardGroup title="الدفع والضريبة">
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
              <div className="divide-y divide-border/60 border-y border-border/60">
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
                  {(product?.live_rate_refs ?? []).length > 0 ? (
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
                  ) : (
                    // Decision D4: no live-rate feed yet — the reference is kept as free text, so an
                    // existing value (e.g. `gold_21`) is never lost behind an empty list.
                    <Field label="مرجع السعر الحيّ" htmlFor="pe-rate" error={err("live_rate_ref")} hint="لا تغذية أسعار حيّة بعد — يُحفظ المرجع نصاً ويُربط حين تتوفر.">
                      <input id="pe-rate" dir="ltr" className={cn(inputClass, "font-mono sm:max-w-xs")} readOnly={readOnly} placeholder="gold_21" maxLength={50} {...register("live_rate_ref")} />
                    </Field>
                  )}
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
            </CardGroup>
          </EditorCard>

          {/* ⑤ Shipping (collapsible, closed by default) */}
          <CollapsibleCard
            id="shipping"
            title="الشحن"
            summary={shippingSummary}
            forceOpen={SHIPPING_FIELDS.some((k) => errors[k])}
            testId="card-shipping"
          >
            {!physical ? (
              <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground" data-testid="no-shipping">
                لا يتطلب شحناً — {PRODUCT_TYPE_LABELS[v.product_type]}.
              </p>
            ) : (
              <>
                <div className="divide-y divide-border/60 border-y border-border/60">
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
                  <input id="pe-dd" className={inputClass} readOnly={readOnly} placeholder="2-4 أيام" maxLength={100} {...register("delivery_duration")} />
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
          </CollapsibleCard>

          {/* ⑥ SEO (collapsible, closed by default) */}
          <CollapsibleCard id="seo" title="تحسين محركات البحث (SEO)" summary={seoSummary} forceOpen={SEO_FIELDS.some((k) => errors[k])} testId="card-seo">
            <Field label="عنوان الصفحة" htmlFor="pe-mt" error={err("meta_title")} counter={{ value: v.meta_title.length, max: 70 }}>
              <input id="pe-mt" className={inputClass} readOnly={readOnly} maxLength={70} {...register("meta_title")} />
            </Field>
            <Field label="الوصف" htmlFor="pe-md" error={err("meta_description")} counter={{ value: v.meta_description.length, max: 160 }}>
              <Textarea id="pe-md" rows={3} readOnly={readOnly} maxLength={160} {...register("meta_description")} />
            </Field>
            <Field label="الكلمات المفتاحية" htmlFor="pe-mk" error={err("meta_keywords")} counter={{ value: v.meta_keywords.length, max: 255 }}>
              <input id="pe-mk" className={inputClass} readOnly={readOnly} maxLength={255} {...register("meta_keywords")} />
            </Field>
          </CollapsibleCard>

          {/* Saved product only: the former «الأنماط المتقدمة» / «السجل» tabs. */}
          {product ? (
            <>
              <CollapsibleCard
                id="advanced"
                title="الأنماط المتقدمة"
                summary="الحزم والمزاد والتخصيص وقواعد التوافق"
                defaultOpen={openPanel === "advanced"}
                testId="card-advanced"
              >
                <AdvancedPanels product={product} readOnly={readOnly} />
              </CollapsibleCard>
              <CollapsibleCard id="history" title="سجل التغييرات" summary="من غيّر ماذا ومتى" defaultOpen={openPanel === "history"} testId="card-history">
                <ChangeLog productId={product.id} />
              </CollapsibleCard>
            </>
          ) : null}
        </div>

        {/* Side: product flags (after the main cards on phones). */}
        <div className="flex flex-col gap-5 lg:col-span-4 lg:col-start-9 lg:row-start-2">
          <EditorCard id="flags" title="خصائص المنتج" testId="card-flags">
            <div className="-my-3 divide-y divide-border/60">
              <ToggleRow id="pe-serial" label="أرقام تسلسلية" description="كل قطعة برقم مستقل (IMEI، رقم الضمان)." {...bool("is_serialized")} />
              <ToggleRow id="pe-bundle" label="حزمة" description="مكوّناتها وقواعد توافقها في بطاقة «الأنماط المتقدمة»." {...bool("is_bundle")}>
                <Field label="رسوم التجميع" htmlFor="pe-bfee" error={err("bundle_build_fee")}>
                  <input id="pe-bfee" dir="ltr" inputMode="decimal" className={numericInputClass} readOnly={readOnly} {...register("bundle_build_fee")} />
                </Field>
              </ToggleRow>
              <ToggleRow
                id="pe-auction"
                label="مزاد"
                description={product?.auction_status === "active" ? "مزاد نشط: السعر والمخزون محجوبان حتى انتهائه." : "قطعة واحدة لأعلى مزايد؛ إعداداته في بطاقة «الأنماط المتقدمة»."}
                {...bool("is_auction")}
                disabled={readOnly || product?.auction_status === "active"}
              />
              <ToggleRow id="pe-personal" label="قابل للتخصيص" description="حقول التخصيص في بطاقة «الأنماط المتقدمة»." {...bool("is_personalizable")} />
              <ToggleRow id="pe-bookable" label="قابل للحجز" description="يُباع كموعد في تقويم الحجوزات (M26)." {...bool("is_bookable")}>
                <Field label="مدة الحجز (دقيقة)" htmlFor="pe-bdur" required error={err("booking_duration_minutes")}>
                  <input id="pe-bdur" dir="ltr" inputMode="numeric" className={numericInputClass} readOnly={readOnly} {...register("booking_duration_minutes")} />
                </Field>
              </ToggleRow>
            </div>
          </EditorCard>
        </div>
      </div>

      {/* Sticky footer: «حفظ» and «إلغاء» always in reach. */}
      {!readOnly ? (
        <div
          role="region"
          aria-label="حفظ المنتج"
          className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:bottom-0 lg:start-auto lg:end-0 lg:w-[calc(100%-16rem)]"
          data-testid="save-bar"
        >
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
            <p className="min-w-0 flex-1 text-sm" aria-live="polite">
              <span className={cn(!dirty && product && "text-muted-foreground")}>
                {finishing ?? (dirty ? "تغييرات غير محفوظة" : product ? "لا تغييرات غير محفوظة" : "منتج جديد غير محفوظ")}
              </span>
              {formError ? <span className="ms-2 text-destructive">{formError}</span> : null}
            </p>
            {dirty ? (
              <Button type="button" variant="ghost" size="lg" className="h-11 lg:h-9" disabled={busy} onClick={discardAll}>
                تجاهل التغييرات
              </Button>
            ) : null}
            <Link
              href="/dashboard/products"
              className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium shadow-xs hover:bg-muted lg:h-9"
              data-testid="product-cancel"
            >
              إلغاء
            </Link>
            {/* Always clickable (schema audit 2026-10-23): an invalid form answers with the missing
                fields; only a save already in flight blocks a second click. */}
            <Button type="submit" size="lg" className="h-11 gap-1.5 lg:h-9" disabled={busy} aria-busy={busy} data-testid="product-save">
              {save.isPending ? "جارٍ الحفظ…" : finishing ? "لحظة…" : "حفظ"} <Mono className="hidden text-[11px] opacity-70 lg:inline">Ctrl+S</Mono>
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
                discardAll();
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

/** What the merchant is looking at when the editor opens as a copy (and what was not copied). */
function DuplicateBanner({ seed }: { seed: Extract<EditorSeed, { kind: "duplicate" }> }) {
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
