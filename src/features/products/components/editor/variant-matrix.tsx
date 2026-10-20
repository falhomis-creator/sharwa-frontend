"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Mono } from "@/components/shared/mono";
import { Money } from "@/components/shared/money";
import { isApiError } from "@/lib/api-error";
import { addDecimal, groupDecimal, isDecimal } from "@/lib/decimal";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  VARIANT_MATRIX_WARN,
  type ProductDetail,
  type ProductVariant,
  type VariantAttribute,
} from "@/features/products/schemas";
import { generateVariants, productKeys, saveVariants, useVariantAttributes } from "@/features/products/api/products";
import { useProductEditorStore, type VariantDraftRow } from "@/stores/product-editor";

/**
 * Variant generator + matrix (US-04.5, FR-04.09, T073): pick attributes from the store
 * dictionary and the values that apply → see the combination count (warning past 100) →
 * exclude combinations → «توليد» → edit SKU / extra price / stock in a table that accepts a
 * pasted column like a spreadsheet. Unsaved edits live in Zustand; `effective_price` is the
 * server's, and any value computed from an unsaved edit is labelled «تقديرية» (FR-04.14).
 * SC-04.4: 12 variants generated and saved in ≤ 3 clicks.
 */
const comboKey = (ids: number[]) => [...ids].sort((a, b) => a - b).join(",");

function Swatch({ color, label }: { color: string | null | undefined; label: string }) {
  if (!color) return null;
  return (
    <span
      aria-hidden
      title={label}
      className="inline-block size-3 shrink-0 rounded-sm border border-border"
      // A merchant-defined swatch is DATA, rendered as data (like OrderStatus.color).
      style={{ backgroundColor: color }}
    />
  );
}

export function VariantMatrix({ product, readOnly, price }: { product: ProductDetail; readOnly: boolean; price: string }) {
  const store = useStore();
  const qc = useQueryClient();
  const attributes = useVariantAttributes();
  const drafts = useProductEditorStore((s) => s.variantDrafts[product.id]);
  const setDraft = useProductEditorStore((s) => s.setVariantDraft);
  const setDrafts = useProductEditorStore((s) => s.setVariantDrafts);

  const usedOptionIds = useMemo(() => new Set(product.variants.flatMap((v) => v.option_ids)), [product.variants]);
  const [attrIds, setAttrIds] = useState<number[]>(product.variant_attribute_ids);
  const [optionIds, setOptionIds] = useState<Set<number> | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"generate" | "save" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dict = useMemo(() => attributes.data ?? [], [attributes.data]);
  const selectedAttrs = dict.filter((a) => attrIds.includes(a.id)).sort((a, b) => a.sort_order - b.sort_order);
  const effectiveOptions = (a: VariantAttribute) =>
    a.options.filter((o) => (optionIds ? optionIds.has(o.id) : usedOptionIds.size ? usedOptionIds.has(o.id) : true));

  const combos =
    selectedAttrs.length === 0
      ? []
      : selectedAttrs
      .map((a) => effectiveOptions(a))
      .reduce<Array<Array<{ id: number; value: string; color?: string | null }>>>(
        (acc, opts) => acc.flatMap((c) => opts.map((o) => [...c, { id: o.id, value: o.value, color: o.color }])),
        [[]],
      );

  const kept = combos.filter((c) => !excluded.has(comboKey(c.map((o) => o.id))));
  const optionById = new Map(dict.flatMap((a) => a.options.map((o) => [o.id, o] as const)));

  function toggleAttr(id: number) {
    setAttrIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    setExcluded(new Set());
  }

  function toggleOption(a: VariantAttribute, id: number) {
    const base = new Set(optionIds ?? new Set(dict.flatMap((x) => effectiveOptions(x).map((o) => o.id))));
    if (base.has(id)) base.delete(id);
    else base.add(id);
    setOptionIds(base);
    setExcluded(new Set());
  }

  function writeVariants(variants: ProductVariant[]) {
    qc.setQueryData<ProductDetail>(productKeys(store).detail(product.id), (old) =>
      old ? { ...old, variants, has_variants: variants.length > 0, variant_attribute_ids: attrIds } : old,
    );
    void qc.invalidateQueries({ queryKey: [...productKeys(store).all, "list"] });
  }

  async function generate() {
    setBusy("generate");
    try {
      const allowed = selectedAttrs.flatMap((a) => effectiveOptions(a).map((o) => o.id));
      const rows = await generateVariants(product.id, {
        attribute_ids: selectedAttrs.map((a) => a.id),
        option_ids: allowed,
        exclude: [...excluded].map((k) => k.split(",").map(Number)),
      });
      writeVariants(rows);
      setDrafts(product.id, undefined);
      toast.success(rows.length ? `وُلِّد ${rows.length} متغيراً` : "أُزيلت المتغيرات");
    } catch (err) {
      toast.error(isApiError(err) ? err.userMessage : "تعذّر التوليد.");
    } finally {
      setBusy(null);
    }
  }

  function rowOf(v: ProductVariant): VariantDraftRow {
    return drafts?.[v.id] ?? { sku: v.sku, extra_price: v.extra_price, stock: String(Number(v.stock)) };
  }

  function edit(v: ProductVariant, field: keyof VariantDraftRow, value: string) {
    setDraft(product.id, v.id, { ...rowOf(v), [field]: value });
  }

  /** Paste a multi-line column into a cell → fill downwards (spreadsheet behaviour). */
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>, startIndex: number, field: keyof VariantDraftRow) {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n")) return;
    e.preventDefault();
    const values = text.split(/\r?\n/).map((s) => s.split("\t")[0]!.trim()).filter((s, i, a) => s !== "" || i < a.length - 1);
    values.forEach((val, i) => {
      const v = product.variants[startIndex + i];
      if (v) edit(v, field, val);
    });
    toast(`لُصقت ${Math.min(values.length, product.variants.length - startIndex)} قيم`);
  }

  const dirtyIds = Object.keys(drafts ?? {}).map(Number);

  async function save() {
    const rows = product.variants
      .filter((v) => dirtyIds.includes(v.id))
      .map((v) => ({ id: v.id, ...rowOf(v) }));
    const errs: Record<string, string> = {};
    for (const r of rows) {
      if (!isDecimal(r.extra_price)) errs[`${r.id}.extra_price`] = "رقم غير صالح";
      if (!/^\d+(\.\d{1,3})?$/.test(r.stock)) errs[`${r.id}.stock`] = "رقم غير صالح";
      if (!r.sku.trim()) errs[`${r.id}.sku`] = "مطلوب";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy("save");
    try {
      writeVariants(await saveVariants(product.id, rows));
      setDrafts(product.id, undefined);
      toast.success("حُفظت المتغيرات");
    } catch (err) {
      if (isApiError(err) && err.fields) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fields)) mapped[k.replace(/^variants\./, "")] = v[0] ?? "";
        setErrors(mapped);
      }
      toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
    } finally {
      setBusy(null);
    }
  }

  if (attributes.isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="flex flex-col gap-5" data-testid="variant-matrix">
      {!readOnly ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">السمات</p>
            {dict.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا سمات في قاموس المتجر بعد.{" "}
                <Link href="/dashboard/products/variants" className="underline underline-offset-4">
                  أضف سمة
                </Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {dict.map((a) => (
                  <label
                    key={a.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm lg:min-h-8",
                      attrIds.includes(a.id) ? "border-primary" : "border-border",
                    )}
                  >
                    <Checkbox checked={attrIds.includes(a.id)} onCheckedChange={() => toggleAttr(a.id)} aria-label={a.name} />
                    {a.name}
                    <Mono className="text-[11px] text-muted-foreground">{a.options.length}</Mono>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedAttrs.map((a) => (
            <fieldset key={a.id} className="flex flex-col gap-2">
              <legend className="mb-1 text-xs text-muted-foreground">قيم «{a.name}»</legend>
              <div className="flex flex-wrap gap-1.5">
                {a.options.map((o) => {
                  const on = effectiveOptions(a).some((x) => x.id === o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleOption(a, o.id)}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-1.5 rounded-md border px-2.5 text-sm lg:min-h-8",
                        on ? "border-cta font-medium text-primary" : "border-border text-muted-foreground line-through",
                      )}
                    >
                      <Swatch color={o.color} label={o.value} />
                      {o.value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {selectedAttrs.length > 0 ? (
            <div className="flex flex-col gap-2 surface-card p-4">
              <p className="text-sm">
                <Mono>{formatNumber(kept.length)}</Mono> تركيبة
                {excluded.size > 0 ? (
                  <span className="text-muted-foreground">
                    {" "}
                    (مستثنى <Mono>{excluded.size}</Mono>)
                  </span>
                ) : null}
              </p>
              {combos.length > VARIANT_MATRIX_WARN ? (
                <p role="alert" className="text-xs text-warning">
                  أكثر من {VARIANT_MATRIX_WARN} تركيبة تُبطئ المتجر؛ استثنِ ما لا تبيعه أو قسّم المنتج.
                </p>
              ) : null}
              <ul className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto" aria-label="التركيبات — أزل التحديد لاستثناء تركيبة">
                {combos.map((c) => {
                  const key = comboKey(c.map((o) => o.id));
                  const on = !excluded.has(key);
                  return (
                    <li key={key}>
                      <label className={cn("flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs lg:min-h-7", on ? "border-border" : "border-dashed border-border text-muted-foreground")}>
                        <Checkbox
                          checked={on}
                          onCheckedChange={(v) =>
                            setExcluded((s) => {
                              const n = new Set(s);
                              if (v) n.delete(key);
                              else n.add(key);
                              return n;
                            })
                          }
                          aria-label={c.map((o) => o.value).join(" / ")}
                        />
                        {c.map((o) => o.value).join(" / ")}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div>
            <Button
              type="button"
              size="lg"
              className="h-11 lg:h-9"
              onClick={() => void generate()}
              disabled={busy !== null || (selectedAttrs.length > 0 && kept.length === 0)}
              data-testid="generate-variants"
            >
              {busy === "generate" ? "جارٍ التوليد…" : selectedAttrs.length === 0 && product.variants.length > 0 ? "إزالة المتغيرات" : `توليد ${kept.length || ""} متغيراً`}
            </Button>
          </div>
        </div>
      ) : null}

      {product.variants.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="hidden overflow-x-auto surface-card md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">مصفوفة المتغيرات</caption>
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th scope="col" className="h-9 px-3 text-start font-normal">
                    التركيبة
                  </th>
                  <th scope="col" className="h-9 px-3 text-start font-normal">
                    SKU
                  </th>
                  <th scope="col" className="h-9 px-3 text-end font-normal">
                    سعر إضافي
                  </th>
                  <th scope="col" className="h-9 px-3 text-end font-normal">
                    المخزون
                  </th>
                  <th scope="col" className="h-9 px-3 text-end font-normal">
                    السعر الفعلي
                  </th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((v, i) => {
                  const row = rowOf(v);
                  const dirty = dirtyIds.includes(v.id);
                  const estimate = dirty && isDecimal(row.extra_price) && isDecimal(price) ? addDecimal(price, row.extra_price) : null;
                  return (
                    <tr key={v.id} className="border-b border-border last:border-0" data-testid="variant-row">
                      <td className="h-11 whitespace-nowrap px-3">
                        <span className="flex items-center gap-1.5">
                          {v.option_ids.map((oid) => (
                            <Swatch key={oid} color={optionById.get(oid)?.color} label={optionById.get(oid)?.value ?? ""} />
                          ))}
                          {v.label}
                        </span>
                      </td>
                      {(["sku", "extra_price", "stock"] as const).map((field) => (
                        <td key={field} className="px-3 py-1">
                          <input
                            dir="ltr"
                            value={row[field]}
                            readOnly={readOnly}
                            onChange={(e) => edit(v, field, e.target.value)}
                            onPaste={(e) => onPaste(e, i, field)}
                            aria-label={`${field === "sku" ? "SKU" : field === "extra_price" ? "السعر الإضافي" : "المخزون"} — ${v.label}`}
                            aria-invalid={Boolean(errors[`${v.id}.${field}`])}
                            inputMode={field === "sku" ? undefined : "decimal"}
                            className={cn(
                              "h-8 w-full min-w-24 rounded-md border border-input bg-card px-2 font-mono text-sm tabular-nums outline-none focus-visible:border-ring",
                              field !== "sku" && "text-end",
                              errors[`${v.id}.${field}`] && "border-destructive",
                            )}
                          />
                          {errors[`${v.id}.${field}`] ? <span className="text-[11px] text-destructive">{errors[`${v.id}.${field}`]}</span> : null}
                        </td>
                      ))}
                      <td className="h-11 px-3 text-end">
                        {estimate ? (
                          <span className="flex flex-col items-end leading-tight">
                            <Mono>{groupDecimal(estimate)}</Mono>
                            <span className="text-[10px] text-muted-foreground">تقديرية</span>
                          </span>
                        ) : (
                          <Money value={v.display_effective_price} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col divide-y divide-border/60 surface-card md:hidden overflow-hidden">
            {product.variants.map((v) => {
              const row = rowOf(v);
              return (
                <li key={v.id} className="flex flex-col gap-2 p-3">
                  <span className="text-sm font-medium">{v.label}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["sku", "extra_price", "stock"] as const).map((field) => (
                      <label key={field} className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                        {field === "sku" ? "SKU" : field === "extra_price" ? "سعر إضافي" : "المخزون"}
                        <input
                          dir="ltr"
                          value={row[field]}
                          readOnly={readOnly}
                          onChange={(e) => edit(v, field, e.target.value)}
                          className="h-11 w-full rounded-md border border-input bg-card px-2 font-mono text-sm text-foreground tabular-nums"
                        />
                      </label>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    السعر الفعلي: <Money value={v.display_effective_price} />
                  </span>
                </li>
              );
            })}
          </ul>

          {!readOnly ? (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant={dirtyIds.length ? "default" : "outline"}
                size="lg"
                className="h-11 lg:h-9"
                disabled={dirtyIds.length === 0 || busy !== null}
                onClick={() => void save()}
                data-testid="save-variants"
              >
                {busy === "save" ? "جارٍ الحفظ…" : `حفظ المتغيرات${dirtyIds.length ? ` (${dirtyIds.length})` : ""}`}
              </Button>
              <p className="text-xs text-muted-foreground">الصق عموداً من جدول بيانات في أي خانة لتعبئة ما تحتها.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
