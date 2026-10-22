"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { addDecimal, groupDecimal, isDecimal } from "@/lib/decimal";
import { formatNumber, toWesternDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { VARIANT_MATRIX_WARN, type ProductTemplate, type ProductVariant, type VariantAttribute, type VariantOption } from "@/features/products/schemas";
import { attributeApi, generateVariants, saveVariants } from "@/features/products/api/products";
import { attributeCreateType, normalizeAttributeName } from "@/features/products/constants/standard-taxonomy";

/**
 * Pre-save variant builder for a NEW product (UI/UX overhaul 2026-10-22, Shopify-style).
 *
 * The attributes of the chosen template (or any attribute the merchant adds) appear as tag
 * inputs; typing values builds the combinations table at once (price on top of the base price,
 * stock, optional SKU, and a switch to leave a combination out). Nothing reaches the server
 * until «حفظ»: the product is created first, then `persistVariantPlan` resolves the attributes
 * and values in the store dictionary (creating what is missing), generates the variants and
 * writes the per-row prices / stock — the same endpoints the saved-product matrix uses.
 */
export type BuilderAttr = {
  /** Stable React/combination key: `a<id>` for a dictionary attribute, `n:<name>` for a new one. */
  key: string;
  attributeId: number | null;
  name: string;
  values: string[];
  fromTemplate: boolean;
};
export type BuilderRow = { enabled: boolean; extra_price: string; stock: string; sku: string };
export type VariantPlan = { attrs: BuilderAttr[]; rows: Record<string, BuilderRow> };

export const EMPTY_PLAN: VariantPlan = { attrs: [], rows: {} };
const DEFAULT_ROW: BuilderRow = { enabled: true, extra_price: "0", stock: "0", sku: "" };
const STOCK_RE = /^\d+(\.\d{1,3})?$/;

const partKey = (attrKey: string, value: string) => `${attrKey}␟${value}`;

export type Combo = { key: string; parts: Array<{ attrKey: string; attrName: string; value: string }> };

/** Every combination of the attributes that have at least one value, in attribute order. */
export function planCombos(attrs: BuilderAttr[]): Combo[] {
  const active = attrs.filter((a) => a.values.length > 0);
  if (active.length === 0) return [];
  return active
    .reduce<Combo["parts"][]>(
      (acc, a) => acc.flatMap((parts) => a.values.map((value) => [...parts, { attrKey: a.key, attrName: a.name, value }])),
      [[]],
    )
    .map((parts) => ({ key: parts.map((p) => partKey(p.attrKey, p.value)).join("␞"), parts }));
}

export function rowFor(plan: VariantPlan, key: string): BuilderRow {
  return plan.rows[key] ?? DEFAULT_ROW;
}

/**
 * At least one combination (an attribute with a value) moves stock from the product to its
 * variants. A real sector template brings 4–7 attributes, several of them open ones the
 * merchant may not need for this product: those left without values are simply ignored.
 */
export function planIsActive(plan: VariantPlan): boolean {
  return planCombos(plan.attrs).length > 0;
}

/** A template's attributes, in dictionary order, as empty tag inputs. */
export function attrsFromTemplate(template: ProductTemplate, dictionary: VariantAttribute[]): BuilderAttr[] {
  return template.variant_attribute_ids
    .map((id) => {
      const a = dictionary.find((x) => x.id === id);
      return { attr: a, id };
    })
    .sort((x, y) => (x.attr?.sort_order ?? 0) - (y.attr?.sort_order ?? 0))
    .map(({ attr, id }) => ({ key: `a${id}`, attributeId: id, name: attr?.name ?? "", values: [], fromTemplate: true }));
}

/**
 * Switching template: keep what the merchant already typed, drop the previous template's
 * attributes that are still empty, add the new template's attributes not already present.
 */
export function mergeTemplateAttrs(current: BuilderAttr[], incoming: BuilderAttr[]): BuilderAttr[] {
  const kept = current.filter((a) => !a.fromTemplate || a.values.length > 0);
  const keys = new Set(kept.map((a) => a.key));
  return [...kept, ...incoming.filter((a) => !keys.has(a.key))];
}

/** The first problem that blocks saving, in Arabic, or `null`. */
export function validatePlan(plan: VariantPlan): string | null {
  for (const a of plan.attrs) {
    if (a.values.length > 0 && !a.name.trim()) return "أدخل اسم كل سمة لها قيم أو احذفها.";
  }
  const combos = planCombos(plan.attrs);
  if (combos.length === 0) return null;
  const enabled = combos.filter((c) => rowFor(plan, c.key).enabled);
  if (enabled.length === 0) return "فعّل تركيبة واحدة على الأقل من جدول المتغيرات.";
  for (const c of enabled) {
    const r = rowFor(plan, c.key);
    const label = c.parts.map((p) => p.value).join(" / ");
    const extra = toWesternDigits(r.extra_price).trim();
    const stock = toWesternDigits(r.stock).trim();
    if (extra !== "" && !isDecimal(extra)) return `السعر الإضافي لـ «${label}» ليس رقماً.`;
    if (stock !== "" && !STOCK_RE.test(stock)) return `مخزون «${label}» رقم حتى 3 خانات عشرية.`;
  }
  return null;
}

/**
 * After the product exists: resolve attributes + values in the dictionary (create the missing
 * ones), generate the enabled combinations, then patch the rows the merchant filled in.
 * Throws with an Arabic message; the product itself is already saved at that point.
 */
export async function persistVariantPlan(productId: number, plan: VariantPlan, dictionary: VariantAttribute[]): Promise<number> {
  const combos = planCombos(plan.attrs);
  if (combos.length === 0) return 0;
  const byName = new Map(dictionary.map((a) => [normalizeAttributeName(a.name), a]));
  const optionIdOf = new Map<string, number>();
  const attributeIds: number[] = [];
  const active = plan.attrs.filter((a) => a.values.length > 0);

  for (const [i, attr] of active.entries()) {
    const known =
      (attr.attributeId !== null ? dictionary.find((a) => a.id === attr.attributeId) : undefined) ??
      byName.get(normalizeAttributeName(attr.name));
    let id: number;
    let options: VariantOption[];
    if (known) {
      id = known.id;
      options = known.options;
    } else {
      const created = await attributeApi
        .create({
          name: attr.name.trim(),
          ...attributeCreateType(attr.name),
          unit: "",
          min_value: null,
          max_value: null,
          is_required: false,
          sort_order: String(dictionary.length + i),
        })
        .catch(() => {
          throw new Error(`تعذّر إنشاء السمة «${attr.name}».`);
        });
      id = created.id;
      options = created.options;
    }
    attributeIds.push(id);
    for (const value of attr.values) {
      const existing = options.find((o) => o.value.trim() === value.trim());
      const optionId = existing
        ? existing.id
        : (
            await attributeApi.addOption(id, { value }).catch(() => {
              throw new Error(`تعذّر إضافة القيمة «${value}» إلى «${attr.name}».`);
            })
          ).id;
      optionIdOf.set(partKey(attr.key, value), optionId);
    }
  }

  const tuple = (c: Combo) => c.parts.map((p) => optionIdOf.get(partKey(p.attrKey, p.value))!);
  const sorted = (ids: number[]) => [...ids].sort((a, b) => a - b).join(",");
  const enabled = combos.filter((c) => rowFor(plan, c.key).enabled);
  const excluded = combos.filter((c) => !rowFor(plan, c.key).enabled);

  let rows: ProductVariant[] = await generateVariants(productId, {
    attribute_ids: attributeIds,
    option_ids: [...new Set(optionIdOf.values())],
    exclude: excluded.map(tuple),
  });
  const local = new Map(enabled.map((c) => [sorted(tuple(c)), rowFor(plan, c.key)]));
  const patches = rows.flatMap((v) => {
    const r = local.get(sorted(v.option_ids));
    if (!r) return [];
    const patch: { id: number; sku?: string; extra_price?: string; stock?: string } = { id: v.id };
    const sku = r.sku.trim();
    const extra = toWesternDigits(r.extra_price).trim();
    const stock = toWesternDigits(r.stock).trim();
    if (sku) patch.sku = sku;
    if (extra && Number(extra) !== 0) patch.extra_price = extra;
    if (stock && Number(stock) !== 0) patch.stock = stock;
    return Object.keys(patch).length > 1 ? [patch] : [];
  });
  if (patches.length > 0) rows = await saveVariants(productId, patches);
  return rows.length;
}

// ── Tag input ─────────────────────────────────────────────────────────────────────────
/** Values as removable chips; Enter or a comma adds, Backspace on an empty box removes the last. */
export function TagInput({
  values,
  onChange,
  label,
  placeholder = "اكتب قيمة ثم Enter",
  disabled,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  function add(raw: string) {
    const incoming = raw
      .split(/[,،\n]/)
      .map((v) => v.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    if (incoming.length === 0) return;
    const next = [...values];
    for (const v of incoming) if (!next.some((x) => x.toLowerCase() === v.toLowerCase())) next.push(v.slice(0, 100));
    onChange(next);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Enter must never submit the product form from here.
    if (e.key === "Enter" || e.key === "," || e.key === "،") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:min-h-9",
        disabled && "bg-muted/40",
      )}
    >
      {values.map((v) => (
        <span key={v} className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted/60 ps-2 pe-0.5 text-sm md:h-7" data-testid="variant-tag">
          {v}
          {!disabled ? (
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`إزالة «${v}» من ${label}`}
              className="flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground md:size-6"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </span>
      ))}
      {!disabled ? (
        <input
          id={inputId}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,،]/.test(v)) add(v);
            else setDraft(v);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          aria-label={`قيم ${label}`}
          placeholder={values.length === 0 ? placeholder : "أضف قيمة…"}
          className="h-8 min-w-28 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground md:h-7 md:text-sm"
          data-testid="variant-tag-input"
        />
      ) : null}
    </div>
  );
}

// ── Builder ───────────────────────────────────────────────────────────────────────────
export function VariantBuilder({
  plan,
  onChange,
  dictionary,
  basePrice,
  readOnly,
}: {
  plan: VariantPlan;
  onChange: (next: VariantPlan) => void;
  dictionary: VariantAttribute[];
  basePrice: string;
  readOnly: boolean;
}) {
  const [newAttr, setNewAttr] = useState("");
  const [bulk, setBulk] = useState({ extra_price: "", stock: "" });
  const listId = useId();
  const combos = planCombos(plan.attrs);
  const enabledCount = combos.filter((c) => rowFor(plan, c.key).enabled).length;
  const usedIds = new Set(plan.attrs.map((a) => a.attributeId).filter((x): x is number => x !== null));
  const usedNames = new Set(plan.attrs.map((a) => normalizeAttributeName(a.name)));
  const available = dictionary.filter((a) => !usedIds.has(a.id));

  const setAttrs = (attrs: BuilderAttr[]) => onChange({ ...plan, attrs });
  const setRow = (key: string, patch: Partial<BuilderRow>) =>
    onChange({ ...plan, rows: { ...plan.rows, [key]: { ...rowFor(plan, key), ...patch } } });
  const dataTypeOf = (a: BuilderAttr) => dictionary.find((x) => x.id === a.attributeId)?.data_type ?? "text";
  const nameOf = (a: BuilderAttr) => (a.attributeId !== null ? (dictionary.find((x) => x.id === a.attributeId)?.name ?? a.name) : a.name);

  function addAttribute(raw: string) {
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name) return;
    const norm = normalizeAttributeName(name);
    if (usedNames.has(norm)) {
      setNewAttr("");
      return;
    }
    const known = dictionary.find((a) => normalizeAttributeName(a.name) === norm);
    setAttrs([
      ...plan.attrs,
      known
        ? { key: `a${known.id}`, attributeId: known.id, name: known.name, values: [], fromTemplate: false }
        : { key: `n:${norm}`, attributeId: null, name, values: [], fromTemplate: false },
    ]);
    setNewAttr("");
  }

  function applyBulk() {
    const rows = { ...plan.rows };
    for (const c of combos) {
      const r = rowFor(plan, c.key);
      if (!r.enabled) continue;
      rows[c.key] = {
        ...r,
        ...(bulk.extra_price.trim() ? { extra_price: bulk.extra_price.trim() } : {}),
        ...(bulk.stock.trim() ? { stock: bulk.stock.trim() } : {}),
      };
    }
    onChange({ ...plan, rows });
    setBulk({ extra_price: "", stock: "" });
  }

  const estimate = (extra: string) => {
    const e = toWesternDigits(extra).trim() || "0";
    const b = toWesternDigits(basePrice).trim();
    return isDecimal(e) && isDecimal(b) ? groupDecimal(addDecimal(b, e)) : null;
  };

  return (
    <div className="flex flex-col gap-4" data-testid="variant-builder">
      {plan.attrs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          منتج بلا متغيرات. اختر قالباً من بطاقة «التنظيم والقالب» لتظهر سماته هنا، أو أضف سمة مثل المقاس أو اللون.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {plan.attrs.map((a) => {
            const name = nameOf(a);
            const suggestions = (dictionary.find((x) => x.id === a.attributeId)?.options ?? [])
              .map((o) => o.value)
              .filter((v) => !a.values.includes(v));
            return (
              <li key={a.key} className="flex flex-col gap-2 rounded-xl border border-border p-3" data-testid="variant-attr">
                <div className="flex items-center gap-2">
                  {a.attributeId === null && !readOnly ? (
                    <input
                      value={a.name}
                      onChange={(e) => setAttrs(plan.attrs.map((x) => (x.key === a.key ? { ...x, name: e.target.value } : x)))}
                      aria-label="اسم السمة الجديدة"
                      className={cn(inputClass, "max-w-56 font-medium")}
                    />
                  ) : (
                    <span className="text-sm font-medium">{name || "سمة"}</span>
                  )}
                  {a.fromTemplate ? <Badge variant="secondary">من القالب</Badge> : null}
                  {a.attributeId === null ? (
                    <Badge variant="outline" title="تُضاف إلى قاموس السمات عند الحفظ">
                      جديدة
                    </Badge>
                  ) : null}
                  <span className="ms-auto text-xs text-muted-foreground">
                    {a.values.length ? (
                      <>
                        <Mono>{a.values.length}</Mono> قيمة
                      </>
                    ) : (
                      "بلا قيم — لن تدخل في المتغيرات"
                    )}
                  </span>
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => setAttrs(plan.attrs.filter((x) => x.key !== a.key))}
                      aria-label={`حذف السمة ${name}`}
                      className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive lg:size-7"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
                <TagInput
                  label={name || "السمة"}
                  values={a.values}
                  disabled={readOnly}
                  placeholder={
                    suggestions.length
                      ? `مثال: ${suggestions.slice(0, 3).join("، ")}`
                      : dataTypeOf(a) === "number"
                        ? "أرقام فقط (مثال: 10) ثم Enter"
                        : dataTypeOf(a) === "date"
                          ? "تاريخ YYYY-MM-DD ثم Enter"
                          : "اكتب قيمة ثم Enter"
                  }
                  onChange={(values) => setAttrs(plan.attrs.map((x) => (x.key === a.key ? { ...x, values } : x)))}
                />
                {!readOnly && suggestions.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">من القاموس:</span>
                    {suggestions.slice(0, 12).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAttrs(plan.attrs.map((x) => (x.key === a.key ? { ...x, values: [...x.values, v] } : x)))}
                        className="inline-flex min-h-11 items-center gap-0.5 rounded-md border border-dashed border-border px-2 text-muted-foreground hover:border-primary hover:text-foreground lg:min-h-7"
                      >
                        <Plus className="size-3" aria-hidden />
                        {v}
                      </button>
                    ))}
                    {suggestions.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setAttrs(plan.attrs.map((x) => (x.key === a.key ? { ...x, values: [...x.values, ...suggestions] } : x)))}
                        className="inline-flex min-h-11 items-center px-2 font-medium text-primary hover:underline lg:min-h-7"
                      >
                        إضافة الكل
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <input
            value={newAttr}
            onChange={(e) => setNewAttr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAttribute(newAttr);
              }
            }}
            list={listId}
            placeholder="أضف سمة (المقاس، اللون…)"
            aria-label="اسم سمة لإضافتها"
            maxLength={100}
            className={cn(inputClass, "max-w-xs flex-1")}
            data-testid="variant-add-attr"
          />
          <datalist id={listId}>
            {available.map((a) => (
              <option key={a.id} value={a.name} />
            ))}
          </datalist>
          <Button type="button" variant="outline" size="lg" className="h-11 gap-1 lg:h-9" disabled={!newAttr.trim()} onClick={() => addAttribute(newAttr)}>
            <Plus className="size-4" aria-hidden /> إضافة سمة
          </Button>
        </div>
      ) : null}

      {combos.length > 0 ? (
        <div className="flex flex-col gap-3" data-testid="variant-builder-table">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">
              <Mono>{formatNumber(enabledCount)}</Mono> متغيراً
              {enabledCount < combos.length ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  (مستثنى <Mono>{combos.length - enabledCount}</Mono>)
                </span>
              ) : null}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5" aria-hidden /> تُنشأ المتغيرات عند حفظ المنتج.
            </p>
          </div>
          {combos.length > VARIANT_MATRIX_WARN ? (
            <p role="alert" className="text-xs text-warning">
              أكثر من {VARIANT_MATRIX_WARN} تركيبة تُبطئ المتجر؛ استثنِ ما لا تبيعه أو قسّم المنتج.
            </p>
          ) : null}

          {!readOnly ? (
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/50 p-2">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                سعر إضافي للكل
                <input
                  dir="ltr"
                  inputMode="decimal"
                  value={bulk.extra_price}
                  onChange={(e) => setBulk((b) => ({ ...b, extra_price: e.target.value }))}
                  className={cn(inputClass, "w-28 text-end font-mono")}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                مخزون للكل
                <input
                  dir="ltr"
                  inputMode="decimal"
                  value={bulk.stock}
                  onChange={(e) => setBulk((b) => ({ ...b, stock: e.target.value }))}
                  className={cn(inputClass, "w-28 text-end font-mono")}
                />
              </label>
              <Button type="button" variant="outline" size="lg" className="h-11 lg:h-8" disabled={!bulk.extra_price.trim() && !bulk.stock.trim()} onClick={applyBulk}>
                تطبيق
              </Button>
            </div>
          ) : null}

          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">المتغيرات قبل الحفظ</caption>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <th scope="col" className="h-9 w-10 px-3 text-start font-normal">
                    <span className="sr-only">مُفعّل</span>
                  </th>
                  <th scope="col" className="h-9 px-3 text-start font-normal">
                    المتغير
                  </th>
                  <th scope="col" className="h-9 px-3 text-end font-normal">
                    سعر إضافي
                  </th>
                  <th scope="col" className="h-9 px-3 text-end font-normal">
                    السعر النهائي
                  </th>
                  <th scope="col" className="h-9 px-3 text-end font-normal">
                    المخزون
                  </th>
                  <th scope="col" className="h-9 px-3 text-start font-normal">
                    SKU
                  </th>
                </tr>
              </thead>
              <tbody>
                {combos.map((c) => {
                  const r = rowFor(plan, c.key);
                  const label = c.parts.map((p) => p.value).join(" / ");
                  const final = estimate(r.extra_price);
                  return (
                    <tr key={c.key} className={cn("border-b border-border last:border-0", !r.enabled && "text-muted-foreground")} data-testid="variant-builder-row">
                      <td className="px-3">
                        <Checkbox checked={r.enabled} disabled={readOnly} onCheckedChange={(on) => setRow(c.key, { enabled: on === true })} aria-label={`تضمين ${label}`} />
                      </td>
                      <td className={cn("h-11 whitespace-nowrap px-3", !r.enabled && "line-through")}>{label}</td>
                      <td className="px-3 py-1">
                        <input
                          dir="ltr"
                          inputMode="decimal"
                          value={r.extra_price}
                          readOnly={readOnly}
                          disabled={!r.enabled}
                          onChange={(e) => setRow(c.key, { extra_price: e.target.value })}
                          aria-label={`السعر الإضافي — ${label}`}
                          className="h-8 w-full min-w-24 rounded-md border border-input bg-card px-2 text-end font-mono text-sm tabular-nums outline-none focus-visible:border-ring disabled:opacity-50"
                        />
                      </td>
                      <td className="h-11 px-3 text-end">
                        {final && r.enabled ? (
                          <span className="flex flex-col items-end leading-tight">
                            <Mono>{final}</Mono>
                            <span className="text-[10px] text-muted-foreground">تقديري</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1">
                        <input
                          dir="ltr"
                          inputMode="decimal"
                          value={r.stock}
                          readOnly={readOnly}
                          disabled={!r.enabled}
                          onChange={(e) => setRow(c.key, { stock: e.target.value })}
                          aria-label={`المخزون — ${label}`}
                          className="h-8 w-full min-w-20 rounded-md border border-input bg-card px-2 text-end font-mono text-sm tabular-nums outline-none focus-visible:border-ring disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          dir="ltr"
                          value={r.sku}
                          readOnly={readOnly}
                          disabled={!r.enabled}
                          placeholder="تلقائي"
                          onChange={(e) => setRow(c.key, { sku: e.target.value })}
                          aria-label={`SKU — ${label}`}
                          className="h-8 w-full min-w-28 rounded-md border border-input bg-card px-2 font-mono text-sm outline-none placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-xl border border-border md:hidden">
            {combos.map((c) => {
              const r = rowFor(plan, c.key);
              const label = c.parts.map((p) => p.value).join(" / ");
              const final = estimate(r.extra_price);
              return (
                <li key={c.key} className="flex flex-col gap-2 p-3">
                  <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                    <Checkbox checked={r.enabled} disabled={readOnly} onCheckedChange={(on) => setRow(c.key, { enabled: on === true })} />
                    <span className={cn(!r.enabled && "text-muted-foreground line-through")}>{label}</span>
                    {final && r.enabled ? (
                      <span className="ms-auto text-xs text-muted-foreground">
                        <Mono className="text-foreground">{final}</Mono> تقديري
                      </span>
                    ) : null}
                  </label>
                  {r.enabled ? (
                    <div className="grid grid-cols-3 gap-2">
                      {(["extra_price", "stock", "sku"] as const).map((field) => (
                        <label key={field} className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                          {field === "sku" ? "SKU" : field === "extra_price" ? "سعر إضافي" : "المخزون"}
                          <input
                            dir="ltr"
                            inputMode={field === "sku" ? undefined : "decimal"}
                            value={r[field]}
                            readOnly={readOnly}
                            placeholder={field === "sku" ? "تلقائي" : undefined}
                            onChange={(e) => setRow(c.key, { [field]: e.target.value })}
                            className="h-11 w-full rounded-md border border-input bg-card px-2 font-mono text-sm text-foreground tabular-nums"
                          />
                        </label>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
