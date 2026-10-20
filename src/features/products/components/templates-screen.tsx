"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Layers, PackagePlus, Pencil, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
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
import { BLUEPRINT_FIELD_LABELS, type ProductTemplate } from "@/features/products/schemas";
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
import {
  STANDARD_TAXONOMY_GROUPS,
  attributeCreateType,
  normalizeAttributeName,
  standardCategory,
} from "@/features/products/constants/standard-taxonomy";

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
 * Zero-Config (owner directive 2026-10-20): the «قالب جديد» form opens with «تعبئة من قسم قياسي»,
 * a grouped picker over `STANDARD_TAXONOMY`. Picking a category checks its attributes and names the
 * template. Attributes missing from the store dictionary are listed as new and created on save,
 * so a store with no products and no dictionary can still build its first template.
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
                <p className="font-medium">{t.name}</p>
                <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>
                    <Mono>{Object.keys(t.fields).length}</Mono> حقلاً
                  </span>
                  <span>
                    السمات: {t.variant_attribute_ids.map((id) => attributes.find((a) => a.id === id)?.name).filter(Boolean).join("، ") || "—"}
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

type NewAttribute = { name: string; on: boolean };
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
  const [name, setName] = useState(template?.name ?? (copyOf ? `${copyOf.name}${DUPLICATE_SUFFIX}` : ""));
  const [fromProduct, setFromProduct] = useState("");
  const [attrIds, setAttrIds] = useState<number[]>(seed?.variant_attribute_ids ?? []);
  /** Attributes not in the store dictionary yet, created on save. `on` = checked. */
  const [newAttrs, setNewAttrs] = useState<NewAttribute[]>([]);
  const [category, setCategory] = useState("");
  /** What the current preset added and the merchant has not touched since: a switch removes only these. */
  const [preset, setPreset] = useState<PresetTrace>(EMPTY_PRESET);
  const [customAttr, setCustomAttr] = useState("");
  const [fields, setFields] = useState<Record<string, string | number | boolean | null>>(seed ? { ...seed.fields } : {});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const byName = useMemo(() => new Map(attributes.map((a) => [normalizeAttributeName(a.name), a])), [attributes]);
  const checkedNew = newAttrs.filter((a) => a.on).length;

  function pickCategory(id: string) {
    setCategory(id);
    const cat = standardCategory(id);
    const ids = attrIds.filter((x) => !preset.ids.includes(x));
    const pending = newAttrs.filter((a) => !preset.names.includes(a.name)).map((a) => ({ ...a }));
    const added: PresetTrace = { ids: [], names: [], autoName: cat ? `قالب ${cat.label}` : "" };
    for (const label of cat?.attributes ?? []) {
      const key = normalizeAttributeName(label);
      const existing = byName.get(key);
      if (existing) {
        if (!ids.includes(existing.id)) {
          ids.push(existing.id);
          added.ids.push(existing.id);
        }
      } else {
        const listed = pending.find((a) => normalizeAttributeName(a.name) === key);
        if (listed) listed.on = true;
        else {
          pending.push({ name: label, on: true });
          added.names.push(label);
        }
      }
    }
    setAttrIds(ids);
    setNewAttrs(pending);
    // Name the template after the category unless the merchant typed a name of their own.
    if (!name.trim() || name === preset.autoName) setName(added.autoName);
    setPreset(added);
  }

  function toggleExisting(id: number, on: boolean) {
    setAttrIds((ids) => (on ? [...ids, id] : ids.filter((x) => x !== id)));
    setPreset((p) => ({ ...p, ids: p.ids.filter((x) => x !== id) }));
  }

  function toggleNew(label: string, on: boolean) {
    setNewAttrs((list) => list.map((a) => (a.name === label ? { ...a, on } : a)));
    setPreset((p) => ({ ...p, names: p.names.filter((x) => x !== label) }));
  }

  function addCustom() {
    const label = customAttr.trim().replace(/\s+/g, " ");
    if (!label) return;
    const key = normalizeAttributeName(label);
    const existing = byName.get(key);
    if (existing) setAttrIds((ids) => (ids.includes(existing.id) ? ids : [...ids, existing.id]));
    else
      setNewAttrs((list) =>
        list.some((a) => normalizeAttributeName(a.name) === key)
          ? list.map((a) => (normalizeAttributeName(a.name) === key ? { ...a, on: true } : a))
          : [...list, { name: label, on: true }],
      );
    setCustomAttr("");
  }

  /**
   * Creates the checked new attributes in the store dictionary and returns their ids. It first
   * re-reads the dictionary so a name that appeared meanwhile is reused, not duplicated. Each
   * resolved name moves into `attrIds` at once, so a failed save retried later never creates
   * the same attribute twice.
   */
  async function resolveNewAttributes(): Promise<number[]> {
    const pending = newAttrs.filter((a) => a.on);
    if (pending.length === 0) return [];
    const fresh = (await attributeQuery.refetch()).data ?? attributes;
    const known = new Map(fresh.map((a) => [normalizeAttributeName(a.name), a.id]));
    const resolved: { name: string; id: number }[] = [];
    try {
      for (const [i, attr] of pending.entries()) {
        const existingId = known.get(normalizeAttributeName(attr.name));
        if (existingId !== undefined) {
          resolved.push({ name: attr.name, id: existingId });
          continue;
        }
        try {
          const created = await attributeApi.create({
            name: attr.name,
            ...attributeCreateType(attr.name),
            unit: "",
            min_value: null,
            max_value: null,
            is_required: false,
            sort_order: String(fresh.length + i),
          });
          resolved.push({ name: attr.name, id: created.id });
        } catch (err) {
          throw new Error(`تعذّر إنشاء السمة «${attr.name}»${isApiError(err) ? `: ${err.userMessage}` : "."}`);
        }
      }
    } finally {
      if (resolved.length > 0) {
        const done = new Set(resolved.map((r) => r.name));
        setNewAttrs((list) => list.filter((a) => !done.has(a.name)));
        setAttrIds((ids) => [...new Set([...ids, ...resolved.map((r) => r.id)])]);
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
      const body = { name, variant_attribute_ids: variantAttributeIds, fields, from_product_id: fromProduct ? Number(fromProduct) : undefined };
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
              hint="اختر نشاط متجرك لتحديد السمات المعتادة تلقائياً — يمكنك تعديلها بعد ذلك."
            >
              <NativeSelect
                id="tp-category"
                value={category}
                onChange={(e) => pickCategory(e.target.value)}
                className="h-11 bg-card md:h-9"
              >
                <option value="">بلا — سأختار السمات بنفسي</option>
                {STANDARD_TAXONOMY_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.ids.map((id) => (
                      <option key={id} value={id}>
                        {standardCategory(id)?.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </NativeSelect>
            </Field>
            {category ? (
              <p className="text-xs text-muted-foreground" role="status">
                حُدّدت سمات «{standardCategory(category)?.label}».
                {checkedNew > 0 ? (
                  <>
                    {" "}
                    السمات المعلَّمة «جديدة» (<Mono>{checkedNew}</Mono>) تُضاف إلى قاموس المتجر عند الحفظ.
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
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
        <fieldset className="flex flex-col gap-1" data-testid="template-attributes">
          <legend className="mb-1 text-sm font-medium">السمات</legend>
          {newAttrs.map((a) => (
            <label key={`new-${a.name}`} className="flex min-h-11 items-center gap-2 text-sm lg:min-h-8">
              <Checkbox checked={a.on} onCheckedChange={(on) => toggleNew(a.name, on === true)} />
              <span className="flex-1">{a.name}</span>
              <Badge variant="secondary" title="غير موجودة في قاموس المتجر — تُنشأ عند الحفظ">
                جديدة
              </Badge>
            </label>
          ))}
          {attributes.map((a) => (
            <label key={a.id} className="flex min-h-11 items-center gap-2 text-sm lg:min-h-8">
              <Checkbox checked={attrIds.includes(a.id)} onCheckedChange={(on) => toggleExisting(a.id, on === true)} />
              {a.name}
            </label>
          ))}
          {attributes.length === 0 && newAttrs.length === 0 && !attributeQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">لا سمات في قاموس المتجر بعد — اختر قسماً قياسياً أو أضف سمة.</p>
          ) : null}
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
              placeholder="أضف سمة (مثال: الطول)"
              aria-label="اسم سمة جديدة"
              maxLength={100}
              className={inputClass}
            />
            <Button type="button" variant="outline" size="lg" className="h-11 shrink-0 gap-1 lg:h-9" disabled={!customAttr.trim()} onClick={addCustom}>
              <Plus className="size-4" aria-hidden /> إضافة
            </Button>
          </div>
        </fieldset>
        {Object.keys(fields).length > 0 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">الحقول المنسوخة</legend>
            {Object.entries(fields).map(([k, val]) => (
              <label key={k} className="grid grid-cols-2 items-center gap-2 text-sm">
                <span className="text-muted-foreground">{BLUEPRINT_FIELD_LABELS[k] ?? k}</span>
                {typeof val === "boolean" ? (
                  <Checkbox checked={val} onCheckedChange={(on) => setFields((f) => ({ ...f, [k]: Boolean(on) }))} aria-label={BLUEPRINT_FIELD_LABELS[k] ?? k} />
                ) : (
                  <input
                    dir="ltr"
                    value={val === null ? "" : String(val)}
                    onChange={(e) => setFields((f) => ({ ...f, [k]: typeof val === "number" ? Number(e.target.value) || 0 : e.target.value }))}
                    className={`${inputClass} font-mono`}
                    aria-label={BLUEPRINT_FIELD_LABELS[k] ?? k}
                  />
                )}
              </label>
            ))}
          </fieldset>
        ) : null}
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
