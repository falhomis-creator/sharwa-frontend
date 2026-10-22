"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Layers, PackagePlus, Pencil, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkActionDialog, SearchBox, type BulkReport } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { formatRelative } from "@/lib/format";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { CURRENCY_LABELS } from "@/lib/schemas/money";
import {
  BLUEPRINT_FIELD_DEFAULTS,
  BLUEPRINT_FIELD_LABELS,
  CURRENCY_CODES,
  HAZARD_CLASSES,
  HAZARD_CLASS_LABELS,
  PAYMENT_POLICIES,
  PAYMENT_POLICY_LABELS,
  PRICING_TYPES,
  PRICING_TYPE_LABELS,
  PRODUCT_TEMPLATES,
  PRODUCT_TEMPLATE_LABELS,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  UNITS,
  UNIT_LABELS,
  VARIANT_DISPLAY_STYLES,
  VARIANT_DISPLAY_STYLE_LABELS,
  defaultBlueprintFields,
  type BlueprintValue,
  type DataType,
  type FieldType,
  type ProductTemplate,
} from "@/features/products/schemas";
import {
  attributeApi,
  productKeys,
  templateApi,
  useGlobalTemplates,
  useProducts,
  useTemplates,
  useVariantAttributes,
} from "@/features/products/api/products";
import { useCatalogAccess } from "@/features/products/hooks/use-catalog-access";
import { DUPLICATE_SUFFIX, productFromTemplateHref } from "@/features/products/components/editor/prefill";
import { attributeCreateType, normalizeAttributeName } from "@/features/products/constants/standard-taxonomy";

/**
 * `/dashboard/products/templates` — merchant blueprints (`ProductTemplate`, US-04.6, T073).
 * Create from scratch, from an existing product, or seed the store dictionary from one of
 * the 35 central sectors (US-04.6.1 — attributes copied without duplicating existing ones).
 * Applying a template to products shows the fields that will be replaced, then a report.
 *
 * Presets (owner directive 2026-10-20): «إنشاء منتج» opens the product editor pre-filled from
 * the template — the primary use, so it leads the row — and «نسخ» opens the template form as
 * an unsaved copy named «… (نسخة)».
 *
 * Zero-Config (owner directive 2026-10-20, real data 2026-10-22): the «قالب جديد» form opens with
 * «تعبئة من قسم قياسي», a picker over the 35 REAL central sectors (`GlobalVariantTemplate`, the
 * same list Django's `seed_variant_templates` creates). Picking one selects its exact attributes
 * from the store dictionary, names the template, and links it to the sector (`global_template_id`
 * → the «من قطاع مركزي» badge). A sector attribute the merchant deleted is listed as new and
 * re-created on save with the sector's values.
 */
type Editing = { mode: "new" } | { mode: "edit"; template: ProductTemplate } | { mode: "duplicate"; template: ProductTemplate };
export function TemplatesScreen() {
  const store = useStore();
  const qc = useQueryClient();
  const access = useCatalogAccess();
  const templates = useTemplates();
  const attributes = useVariantAttributes().data ?? [];
  const [editing, setEditing] = useState<Editing | null>(null);
  const [applying, setApplying] = useState<ProductTemplate | null>(null);
  const [sectorFor, setSectorFor] = useState<ProductTemplate | null>(null);
  const [deleting, setDeleting] = useState<ProductTemplate | null>(null);
  const globals = useGlobalTemplates();
  const sectorName = (id: number) => (globals.data ?? []).find((g) => g.id === id)?.name ?? null;
  const attrNames = (t: ProductTemplate) =>
    t.variant_attribute_ids.map((id) => attributes.find((a) => a.id === id)?.name).filter((n): n is string => Boolean(n));
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: productKeys(store).templates }),
      qc.invalidateQueries({ queryKey: productKeys(store).attributes }),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="نماذج المنتجات"
        description="قوالب جاهزة بالحقول المتكررة (الوحدة، الضريبة، الشحن، السمات) تُطبَّق على المنتجات الجديدة أو القائمة."
        actions={
          access.canManage ? (
            <Button size="lg" className="h-11 gap-1.5 lg:h-9" onClick={() => setEditing({ mode: "new" })}>
              <Plus className="size-4" aria-hidden /> قالب جديد
            </Button>
          ) : null
        }
      />
      {templates.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : templates.error ? (
        <ErrorState error={templates.error} onRetry={() => void templates.refetch()} />
      ) : (templates.data ?? []).length === 0 ? (
        <EmptyState
          title="لا قوالب بعد"
          description="أنشئ قالباً من منتج قائم أو من أحد القطاعات المركزية الـ 35."
          action={access.canManage ? <Button size="lg" className="h-11" onClick={() => setEditing({ mode: "new" })}>قالب جديد</Button> : undefined}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden">
          {(templates.data ?? []).map((t) => (
            <li key={t.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between" data-testid="template-row">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {t.name}
                  {t.global_template_id !== null ? (
                    <Badge variant="secondary" className="gap-1" title={sectorName(t.global_template_id) ?? undefined} data-testid="template-sector-badge">
                      <Layers aria-hidden /> من قطاع مركزي
                    </Badge>
                  ) : null}
                </p>
                <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span data-testid="template-fields-count">
                    <Mono>{Object.keys(t.fields).length}</Mono> حقلاً · <Mono>{t.variant_attribute_ids.length}</Mono> سمة
                  </span>
                  {t.global_template_id !== null && sectorName(t.global_template_id) ? <span>القطاع: {sectorName(t.global_template_id)}</span> : null}
                  <span className="basis-full truncate md:basis-auto" title={attrNames(t).join("، ")}>
                    السمات: {attrNames(t).slice(0, 4).join("، ") || "—"}
                    {attrNames(t).length > 4 ? ` +${attrNames(t).length - 4}` : ""}
                  </span>
                  <span>
                    مستخدم في <Mono>{t.products_count}</Mono> منتجات
                  </span>
                  <span>عُدِّل {formatRelative(t.updated_at)}</span>
                </p>
              </div>
              {access.canManage ? (
                <div className="flex flex-wrap gap-1.5">
                  <Link
                    href={productFromTemplateHref(t.id)}
                    className="inline-flex h-11 items-center gap-1 rounded-lg bg-primary px-2.5 text-[0.8rem] font-semibold text-primary-foreground shadow-button hover:bg-primary/90 lg:h-7"
                    data-testid="template-create-product"
                  >
                    <PackagePlus className="size-3.5" aria-hidden /> إنشاء منتج
                  </Link>
                  <Button variant="outline" size="sm" className="h-11 gap-1 lg:h-7" onClick={() => setApplying(t)}>
                    <Wand2 className="size-3.5" aria-hidden /> تطبيق على منتجات
                  </Button>
                  <Button variant="outline" size="sm" className="h-11 gap-1 lg:h-7" onClick={() => setSectorFor(t)}>
                    <Layers className="size-3.5" aria-hidden /> من قطاع مركزي
                  </Button>
                  <button
                    type="button"
                    onClick={() => setEditing({ mode: "duplicate", template: t })}
                    aria-label={`نسخ ${t.name}`}
                    title="نسخ"
                    data-testid="template-duplicate"
                    className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-7"
                  >
                    <Copy className="size-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => setEditing({ mode: "edit", template: t })} aria-label={`تحرير ${t.name}`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-7">
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => setDeleting(t)} aria-label={`حذف ${t.name}`} className="flex size-11 items-center justify-center rounded-md text-destructive hover:bg-muted lg:size-7">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 shadow-none sm:max-w-md">
          {editing !== null ? (
            <TemplateForm
              key={editing.mode === "new" ? "new" : `${editing.mode}-${editing.template.id}`}
              template={editing.mode === "edit" ? editing.template : null}
              copyOf={editing.mode === "duplicate" ? editing.template : null}
              onDone={() => {
                setEditing(null);
                void refresh();
              }}
              onCancel={() => setEditing(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      {applying ? <ApplyDialog template={applying} onClose={() => setApplying(null)} onDone={() => void refresh()} /> : null}
      {sectorFor ? <SectorDialog template={sectorFor} onClose={() => setSectorFor(null)} onDone={() => void refresh()} /> : null}

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>حذف القالب «{deleting?.name}»</DialogTitle>
          <DialogDescription>المنتجات المبنية عليه تبقى كما هي، ويُفك ارتباطها بالقالب.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => setDeleting(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              size="lg"
              className="h-11 lg:h-9"
              onClick={async () => {
                if (!deleting) return;
                await templateApi.remove(deleting.id).catch(() => toast.error("تعذّر الحذف."));
                setDeleting(null);
                void refresh();
              }}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * An attribute picked for the template that is not in this store's dictionary (e.g. the
 * merchant deleted a sector attribute, or typed a new name). Created on save — with the
 * sector's field type and closed values when it came from a sector.
 */
type NewAttribute = { name: string; field_type?: FieldType; data_type?: DataType; values?: readonly string[] };
type PresetTrace = { ids: number[]; names: string[]; autoName: string };
const EMPTY_PRESET: PresetTrace = { ids: [], names: [], autoName: "" };

function TemplateForm({
  template,
  copyOf = null,
  onDone,
  onCancel,
}: {
  template: ProductTemplate | null;
  /** Duplicate: a NEW template seeded from this one (saved with «create», not «update»). */
  copyOf?: ProductTemplate | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const store = useStore();
  const qc = useQueryClient();
  const attributeQuery = useVariantAttributes();
  const attributes = useMemo(() => attributeQuery.data ?? [], [attributeQuery.data]);
  const products = useProducts({ page_size: 100, ordering: "name" }).data?.results ?? [];
  const seed = template ?? copyOf;
  const creating = !template && !copyOf;
  const globals = useGlobalTemplates(creating);
  const sectors = globals.data ?? [];
  const [name, setName] = useState(template?.name ?? (copyOf ? `${copyOf.name}${DUPLICATE_SUFFIX}` : ""));
  const [fromProduct, setFromProduct] = useState("");
  const [attrIds, setAttrIds] = useState<number[]>(seed?.variant_attribute_ids ?? []);
  const [newAttrs, setNewAttrs] = useState<NewAttribute[]>([]);
  /** The central sector (`GlobalVariantTemplate`) this template is built on — the «من قطاع مركزي» badge. */
  const [sectorId, setSectorId] = useState<number | null>(seed?.global_template_id ?? null);
  /** What the current preset added and the merchant has not touched since: a switch removes only these. */
  const [preset, setPreset] = useState<PresetTrace>(EMPTY_PRESET);
  const [customAttr, setCustomAttr] = useState("");
  // A new template starts from the default blueprint (bug fix 2026-10-22: it used to start `{}`).
  const [fields, setFields] = useState<Record<string, BlueprintValue>>(() => (seed ? { ...seed.fields } : defaultBlueprintFields()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const listId = useId();
  const byExact = useMemo(() => new Map(attributes.map((a) => [a.name, a])), [attributes]);
  const byName = useMemo(() => new Map(attributes.map((a) => [normalizeAttributeName(a.name), a])), [attributes]);
  const selected = attrIds.map((id) => attributes.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => Boolean(a));
  const sector = sectors.find((g) => g.id === sectorId);
  const findAttr = (n: string) => byExact.get(n) ?? byName.get(normalizeAttributeName(n));

  /**
   * «تعبئة من قسم قياسي»: the sector's EXACT attributes (as Django seeds them) are picked —
   * matched by name in the store dictionary, or listed as new (with the sector's values)
   * when the merchant removed them — and the template is named after the sector.
   */
  function pickSector(value: string) {
    const next = sectors.find((g) => String(g.id) === value) ?? null;
    setSectorId(next?.id ?? null);
    const ids = attrIds.filter((x) => !preset.ids.includes(x));
    const pending = newAttrs.filter((a) => !preset.names.includes(a.name));
    const added: PresetTrace = { ids: [], names: [], autoName: next ? `قالب ${next.name}` : "" };
    for (const ga of next?.attributes ?? []) {
      const existing = (ga.attribute_id !== undefined ? attributes.find((a) => a.id === ga.attribute_id) : undefined) ?? findAttr(ga.name);
      if (existing) {
        if (!ids.includes(existing.id)) {
          ids.push(existing.id);
          added.ids.push(existing.id);
        }
      } else if (!pending.some((a) => normalizeAttributeName(a.name) === normalizeAttributeName(ga.name))) {
        pending.push({ name: ga.name, field_type: ga.field_type, data_type: ga.data_type, values: ga.values });
        added.names.push(ga.name);
      }
    }
    setAttrIds(ids);
    setNewAttrs(pending);
    // Name the template after the sector unless the merchant typed a name of their own.
    if (!name.trim() || name === preset.autoName) setName(added.autoName);
    setPreset(added);
  }

  function removeExisting(id: number) {
    setAttrIds((list) => list.filter((x) => x !== id));
    setPreset((p) => ({ ...p, ids: p.ids.filter((x) => x !== id) }));
  }

  function removeNew(label: string) {
    setNewAttrs((list) => list.filter((a) => a.name !== label));
    setPreset((p) => ({ ...p, names: p.names.filter((x) => x !== label) }));
  }

  function addCustom() {
    const label = customAttr.trim().replace(/\s+/g, " ");
    if (!label) return;
    const existing = findAttr(label);
    if (existing) setAttrIds((list) => (list.includes(existing.id) ? list : [...list, existing.id]));
    else if (!newAttrs.some((a) => normalizeAttributeName(a.name) === normalizeAttributeName(label))) setNewAttrs((list) => [...list, { name: label }]);
    setCustomAttr("");
  }

  /**
   * Creates the new attributes in the store dictionary (with their sector values) and returns
   * their ids. It first re-reads the dictionary so a name that appeared meanwhile is reused,
   * not duplicated. Each resolved name moves into `attrIds` at once, so a failed save retried
   * later never creates the same attribute twice.
   */
  async function resolveNewAttributes(): Promise<number[]> {
    if (newAttrs.length === 0) return [];
    const fresh = (await attributeQuery.refetch()).data ?? attributes;
    const known = new Map(fresh.map((a) => [normalizeAttributeName(a.name), a.id]));
    const resolved: { name: string; id: number }[] = [];
    try {
      for (const [i, attr] of newAttrs.entries()) {
        const existingId = known.get(normalizeAttributeName(attr.name));
        if (existingId !== undefined) {
          resolved.push({ name: attr.name, id: existingId });
          continue;
        }
        const guessed = attributeCreateType(attr.name);
        try {
          const created = await attributeApi.create({
            name: attr.name,
            field_type: attr.field_type ?? guessed.field_type,
            data_type: attr.data_type ?? guessed.data_type,
            unit: "",
            min_value: null,
            max_value: null,
            is_required: false,
            sort_order: String(fresh.length + i),
          });
          resolved.push({ name: attr.name, id: created.id });
          for (const value of attr.values ?? []) await attributeApi.addOption(created.id, { value }).catch(() => undefined);
        } catch (err) {
          throw new Error(`تعذّر إنشاء السمة «${attr.name}»${isApiError(err) ? `: ${err.userMessage}` : "."}`);
        }
      }
    } finally {
      if (resolved.length > 0) {
        const done = new Set(resolved.map((r) => r.name));
        setNewAttrs((list) => list.filter((a) => !done.has(a.name)));
        setAttrIds((list) => [...new Set([...list, ...resolved.map((r) => r.id)])]);
        setPreset((p) => ({ ...p, names: p.names.filter((x) => !done.has(x)) }));
        void qc.invalidateQueries({ queryKey: productKeys(store).attributes });
      }
    }
    return resolved.map((r) => r.id);
  }

  async function save() {
    setError("");
    setBusy(true);
    try {
      const createdIds = await resolveNewAttributes();
      const variantAttributeIds = [...new Set([...attrIds, ...createdIds])];
      const link = template ? {} : { global_template_id: sectorId };
      // Copying from a product: the server reads that product's fields, so ours are not sent.
      const body = fromProduct
        ? { name, variant_attribute_ids: variantAttributeIds, from_product_id: Number(fromProduct), ...link }
        : { name, variant_attribute_ids: variantAttributeIds, fields, ...link };
      if (template) await templateApi.update(template.id, body);
      else await templateApi.create(body);
      toast.success(template ? "حُفظ القالب" : copyOf ? `أُنشئت نسخة القالب «${name}»` : `أُنشئ القالب «${name}»`);
      onDone();
    } catch (err) {
      setError(isApiError(err) ? err.userMessage : err instanceof Error && err.message ? err.message : "تعذّر الحفظ.");
    } finally {
      setBusy(false);
    }
  }

  const available = attributes.filter((a) => !attrIds.includes(a.id));
  const total = selected.length + newAttrs.length;

  return (
    <>
      <SheetHeader className="border-b border-border">
        <SheetTitle>{template ? `تحرير «${template.name}»` : copyOf ? `نسخ «${copyOf.name}»` : "قالب جديد"}</SheetTitle>
        <SheetDescription>
          {copyOf ? "نسخة غير محفوظة بكل الحقول والسمات — غيّر الاسم وما يلزم ثم احفظ." : "القيم هنا تُنسخ إلى المنتج عند تطبيق القالب."}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4 p-4">
        {creating ? (
          <div className="flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3" data-testid="standard-category">
            <Field
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="size-4 text-primary" aria-hidden /> تعبئة من قسم قياسي
                </span>
              }
              htmlFor="tp-category"
              hint={
                globals.isLoading
                  ? "جارٍ تحميل القطاعات المركزية…"
                  : `اختر قطاع متجرك من القطاعات المركزية الـ ${sectors.length} لتُحدَّد سماته تلقائياً — يمكنك تعديلها بعد ذلك.`
              }
            >
              <NativeSelect
                id="tp-category"
                value={sectorId === null ? "" : String(sectorId)}
                onChange={(e) => pickSector(e.target.value)}
                className="h-11 bg-card md:h-9"
                disabled={globals.isLoading}
                data-testid="sector-select"
              >
                <option value="">بلا — سأختار السمات بنفسي</option>
                {sectors.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.id}. {g.name} ({g.attributes.length} سمات)
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {sector ? (
              <p className="text-xs text-muted-foreground" role="status">
                حُدّدت سمات «{sector.name}» (<Mono>{sector.attributes.length}</Mono>).
                {newAttrs.length > 0 ? (
                  <>
                    {" "}
                    السمات المعلَّمة «جديدة» (<Mono>{newAttrs.length}</Mono>) تُضاف إلى قاموس المتجر عند الحفظ.
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : sector ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="size-3.5" aria-hidden /> مبني على القطاع المركزي «{sector.name}».
          </p>
        ) : null}
        <Field label="اسم القالب" htmlFor="tp-name" required error={error && !name ? "أدخل اسم القالب." : undefined}>
          <input id="tp-name" autoFocus={!creating} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        {!template && !copyOf ? (
          <Field label="انسخ القيم من منتج قائم" htmlFor="tp-from" hint="اختياري — يملأ الحقول والسمات من المنتج.">
            <NativeSelect id="tp-from" value={fromProduct} onChange={(e) => setFromProduct(e.target.value)} className="h-11 md:h-8">
              <option value="">بلا</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <fieldset className="flex flex-col gap-1.5" data-testid="template-attributes">
          <legend className="mb-1 flex w-full items-baseline justify-between gap-2 text-sm font-medium">
            <span>السمات</span>
            <span className="text-xs font-normal text-muted-foreground">
              <Mono>{total}</Mono> سمة
            </span>
          </legend>
          {total === 0 && !attributeQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">لا سمات بعد — اختر قطاعاً مركزياً أو ابحث في قاموس المتجر وأضف سمة.</p>
          ) : null}
          <ul className="flex flex-col divide-y divide-border/60 rounded-lg border border-border empty:hidden">
            {selected.map((a) => (
              <li key={a.id} className="flex min-h-11 items-center gap-2 px-3 text-sm lg:min-h-9" data-testid="template-attr">
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground" title={a.options.map((o) => o.value).join("، ") || undefined}>
                  {a.options.length ? (
                    <>
                      <Mono>{a.options.length}</Mono> قيمة
                    </>
                  ) : (
                    "قيم حرة"
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeExisting(a.id)}
                  aria-label={`إزالة ${a.name}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-7"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
            {newAttrs.map((a) => (
              <li key={`new-${a.name}`} className="flex min-h-11 items-center gap-2 px-3 text-sm lg:min-h-9" data-testid="template-attr">
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <Badge variant="secondary" title="غير موجودة في قاموس المتجر — تُنشأ عند الحفظ">
                  جديدة
                </Badge>
                <button
                  type="button"
                  onClick={() => removeNew(a.name)}
                  aria-label={`إزالة ${a.name}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-7"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex gap-2">
            <input
              value={customAttr}
              onChange={(e) => setCustomAttr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              list={listId}
              placeholder={`ابحث في القاموس (${attributes.length}) أو اكتب سمة جديدة`}
              aria-label="سمة لإضافتها"
              maxLength={100}
              className={inputClass}
            />
            <datalist id={listId}>
              {available.map((a) => (
                <option key={a.id} value={a.name} />
              ))}
            </datalist>
            <Button type="button" variant="outline" size="lg" className="h-11 shrink-0 gap-1 lg:h-9" disabled={!customAttr.trim()} onClick={addCustom}>
              <Plus className="size-4" aria-hidden /> إضافة
            </Button>
          </div>
        </fieldset>
        {fromProduct ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground" role="status">
            تُنسخ حقول القالب (النوع، الوحدة، الضريبة، الشحن…) من المنتج المختار عند الحفظ.
          </p>
        ) : (
          <BlueprintFieldsEditor fields={fields} onChange={setFields} />
        )}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="sticky bottom-0 -mx-4 mt-auto flex gap-2 border-t border-border bg-popover p-4">
          <Button size="lg" className="h-11 flex-1" disabled={busy || !name.trim()} onClick={() => void save()}>
            حفظ
          </Button>
          <Button variant="outline" size="lg" className="h-11" onClick={onCancel}>
            إلغاء
          </Button>
        </div>
      </div>
    </>
  );
}

function ApplyDialog({ template, onClose, onDone }: { template: ProductTemplate; onClose: () => void; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [confirm, setConfirm] = useState(false);
  const query = useProducts({ q: q || undefined, page_size: 20 });
  const results = useMemo(() => query.data?.results ?? [], [query.data]);
  const names = useMemo(() => new Map(results.map((r) => [r.id, r.name])), [results]);

  async function run(): Promise<BulkReport> {
    const res = await templateApi.apply(template.id, picked);
    onDone();
    return { succeeded: res.applied, failed: res.skipped.map((s) => ({ id: s.id, label: names.get(s.id), reason: s.reason })) };
  }

  if (confirm) {
    return (
      <BulkActionDialog
        open
        onOpenChange={(o) => !o && onClose()}
        title={`تطبيق «${template.name}»`}
        count={picked.length}
        confirmLabel="تطبيق"
        description={`ستُستبدل هذه الحقول: ${Object.keys(template.fields).map((k) => BLUEPRINT_FIELD_LABELS[k] ?? k).join("، ")}.`}
        run={run}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>تطبيق «{template.name}» على منتجات</DialogTitle>
        <DialogDescription>اختر المنتجات ثم راجع الحقول التي ستُستبدل.</DialogDescription>
        <SearchBox value={q} onChange={setQ} placeholder="ابحث عن منتج" />
        <ul className="max-h-64 overflow-y-auto rounded-md border border-border">
          {results.map((p) => (
            <li key={p.id}>
              <label className="flex min-h-11 items-center gap-2 px-3 text-sm hover:bg-muted lg:min-h-9">
                <Checkbox checked={picked.includes(p.id)} onCheckedChange={(on) => setPicked((ids) => (on ? [...ids, p.id] : ids.filter((x) => x !== p.id)))} />
                <span className="flex-1 truncate">{p.name}</span>
                <Mono className="text-xs text-muted-foreground">{p.sku}</Mono>
              </label>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={onClose}>
            إلغاء
          </Button>
          <Button size="lg" className="h-11 lg:h-9" disabled={picked.length === 0} onClick={() => setConfirm(true)}>
            متابعة ({picked.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectorDialog({ template, onClose, onDone }: { template: ProductTemplate; onClose: () => void; onDone: () => void }) {
  const globals = useGlobalTemplates();
  const [sector, setSector] = useState(template.global_template_id ? String(template.global_template_id) : "");
  const [result, setResult] = useState<{ added_attributes: string[]; existing_attributes: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = (globals.data ?? []).find((g) => String(g.id) === sector);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>سمات من قطاع مركزي</DialogTitle>
        <DialogDescription>تُنسخ سمات القطاع إلى قاموس المتجر دون تكرار الموجود منها، وتُربط بالقالب.</DialogDescription>
        {result ? (
          <div className="flex flex-col gap-2 text-sm" role="status">
            <p>أُضيفت: {result.added_attributes.join("، ") || "لا شيء"}</p>
            <p className="text-muted-foreground">موجودة مسبقاً: {result.existing_attributes.join("، ") || "لا شيء"}</p>
          </div>
        ) : (
          <>
            <NativeSelect value={sector} onChange={(e) => setSector(e.target.value)} className="h-11 lg:h-8" aria-label="القطاع">
              <option value="">اختر قطاعاً ({globals.data?.length ?? 0})</option>
              {(globals.data ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </NativeSelect>
            {selected ? (
              <ul className="flex flex-col gap-1 text-sm">
                {selected.attributes.map((a) => (
                  <li key={a.name}>
                    {a.name}: <span className="text-muted-foreground">{a.values.join("، ")}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
        <DialogFooter>
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={onClose}>
            {result ? "تم" : "إلغاء"}
          </Button>
          {!result ? (
            <Button
              size="lg"
              className="h-11 lg:h-9"
              disabled={!sector || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setResult(await templateApi.applyGlobal(template.id, Number(sector)));
                  onDone();
                } catch (err) {
                  toast.error(isApiError(err) ? err.userMessage : "تعذّر التطبيق.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              تطبيق
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Choices for the enum blueprint fields — the same lists the product editor offers. */
const BLUEPRINT_CHOICES: Record<string, ReadonlyArray<readonly [string, string]>> = {
  product_type: PRODUCT_TYPES.map((v) => [v, PRODUCT_TYPE_LABELS[v]] as const),
  unit: UNITS.map((v) => [v, UNIT_LABELS[v]] as const),
  currency: CURRENCY_CODES.map((v) => [v, CURRENCY_LABELS[v]] as const),
  payment_policy: PAYMENT_POLICIES.map((v) => [v, PAYMENT_POLICY_LABELS[v]] as const),
  pricing_type: PRICING_TYPES.map((v) => [v, PRICING_TYPE_LABELS[v]] as const),
  variant_display_style: VARIANT_DISPLAY_STYLES.map((v) => [v, VARIANT_DISPLAY_STYLE_LABELS[v]] as const),
  product_template: PRODUCT_TEMPLATES.map((v) => [v, PRODUCT_TEMPLATE_LABELS[v]] as const),
  hazard_class: HAZARD_CLASSES.map((v) => [v, HAZARD_CLASS_LABELS[v]] as const),
};

/**
 * The template's blueprint (`fields`): typed controls per value, remove a field, or add any
 * other blueprint field. These are the values copied into a product created from the template.
 */
function BlueprintFieldsEditor({
  fields,
  onChange,
}: {
  fields: Record<string, BlueprintValue>;
  onChange: (next: Record<string, BlueprintValue>) => void;
}) {
  const [adding, setAdding] = useState("");
  const missing = Object.keys(BLUEPRINT_FIELD_LABELS).filter((k) => !(k in fields));
  const set = (k: string, val: BlueprintValue) => onChange({ ...fields, [k]: val });
  const label = (k: string) => BLUEPRINT_FIELD_LABELS[k] ?? k;

  return (
    <fieldset className="flex flex-col gap-2" data-testid="template-fields">
      <legend className="mb-1 flex w-full items-baseline justify-between gap-2 text-sm font-medium">
        <span>حقول القالب</span>
        <span className="text-xs font-normal text-muted-foreground">
          <Mono>{Object.keys(fields).length}</Mono> حقلاً
        </span>
      </legend>
      {Object.keys(fields).length === 0 ? (
        <p className="text-sm text-muted-foreground">لا حقول — أضف ما يتكرر في منتجاتك (الوحدة، الضريبة، الشحن…).</p>
      ) : null}
      {Object.entries(fields).map(([k, val]) => {
        const choices = BLUEPRINT_CHOICES[k];
        return (
          <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 text-sm">
            <span className="truncate text-muted-foreground">{label(k)}</span>
            {typeof val === "boolean" ? (
              <Checkbox checked={val} onCheckedChange={(on) => set(k, on === true)} aria-label={label(k)} />
            ) : choices ? (
              <NativeSelect value={String(val ?? "")} onChange={(e) => set(k, e.target.value)} className="h-11 md:h-8" aria-label={label(k)}>
                {choices.map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <input
                dir="ltr"
                inputMode={typeof val === "number" ? "numeric" : undefined}
                value={val === null ? "" : String(val)}
                onChange={(e) => set(k, typeof val === "number" ? Number(e.target.value.replace(/\D/g, "")) || 0 : e.target.value)}
                className={`${inputClass} font-mono`}
                aria-label={label(k)}
              />
            )}
            <button
              type="button"
              onClick={() => {
                const next = { ...fields };
                delete next[k];
                onChange(next);
              }}
              aria-label={`إزالة حقل ${label(k)}`}
              className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-7"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
      {missing.length > 0 ? (
        <div className="mt-1 flex gap-2">
          <NativeSelect value={adding} onChange={(e) => setAdding(e.target.value)} className="h-11 md:h-9" aria-label="حقل لإضافته">
            <option value="">اختر حقلاً لإضافته</option>
            {missing.map((k) => (
              <option key={k} value={k}>
                {label(k)}
              </option>
            ))}
          </NativeSelect>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 shrink-0 gap-1 lg:h-9"
            disabled={!adding}
            onClick={() => {
              set(adding, BLUEPRINT_FIELD_DEFAULTS[adding] ?? "");
              setAdding("");
            }}
          >
            <Plus className="size-4" aria-hidden /> حقل
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
}
