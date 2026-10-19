"use client";

import { useDeferredValue, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { toWesternDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLineProducts, usePoFormOptions, useSavePo, useSubmitPo } from "@/features/procurement/api";
import { poFormSchema, poPayload, type PoDetail, type PoForm } from "@/features/procurement/schemas";

/**
 * Draft editor (FR-23.03): supplier, receiving location (hidden when the store has one
 * location — §8), notes, and lines added by searching product/variant by name or SKU.
 * «حفظ كمسودة» or «حفظ وإرسال للموافقة». Totals are NOT computed here (US-23.2 #3): the
 * server's `display_total` appears on the order page after save.
 */
export function PoEditor({ initial, presetSupplier }: { initial: PoDetail | null; presetSupplier?: number | null }) {
  const router = useRouter();
  const id = useId();
  const options = usePoFormOptions();
  const save = useSavePo(initial?.id ?? null);
  const submitPo = useSubmitPo();
  const form = useForm<PoForm>({
    resolver: zodResolver(poFormSchema),
    defaultValues: initial
      ? {
          supplier_id: String(initial.supplier.id),
          location_id: String(initial.location.id),
          notes: initial.notes,
          lines: initial.lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, name: l.product_name, sku: l.sku, quantity_ordered: String(l.quantity_ordered), unit_cost: l.unit_cost })),
        }
      : { supplier_id: presetSupplier ? String(presetSupplier) : "", location_id: "", notes: "", lines: [] },
  });
  const { register, control, handleSubmit, setError, formState, setValue, getValues } = form;
  const lines = useFieldArray({ control, name: "lines" });
  const watched = useWatch({ control, name: "lines" });
  const [linesError, setLinesError] = useState<string | null>(null);
  const multi = options.data?.multi_location ?? false;

  const err = (name: FieldPath<PoForm>) => {
    let node: unknown = formState.errors;
    for (const p of name.split(".")) node = node && typeof node === "object" ? (node as Record<string, unknown>)[p] : undefined;
    return node && typeof node === "object" && "message" in node ? String((node as { message?: unknown }).message ?? "") : undefined;
  };

  const run = (andSubmit: boolean) =>
    handleSubmit(async (values) => {
      setLinesError(null);
      if (multi && !values.location_id) {
        setError("location_id", { message: "اختر موقع الاستلام." });
        return;
      }
      if (andSubmit && values.lines.length === 0) {
        setLinesError("أضف سطراً واحداً على الأقل");
        return;
      }
      try {
        const saved = await save.mutateAsync({ ...poPayload(values), ...(initial ? { version: initial.version } : {}) });
        if (andSubmit) {
          const r = await submitPo.mutateAsync({ id: saved.id, version: saved.version });
          toast.success(`أُرسل ${saved.number} للموافقة`, { description: `طلب الموافقة #${r.approval_id}` });
        } else {
          toast.success(initial ? `حُفظت المسودة ${saved.number}` : `أُنشئت المسودة ${saved.number}`);
        }
        router.push(`/dashboard/purchase-orders/${saved.id}`);
      } catch (e) {
        if (isApiError(e) && e.fields) {
          for (const [k, m] of Object.entries(e.fields)) {
            if (k === "lines") setLinesError(m[0] ?? null);
            else setError(k as FieldPath<PoForm>, { message: m[0] });
          }
        } else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ");
      }
    })();

  const busy = save.isPending || submitPo.isPending;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void run(false);
      }}
      className="flex max-w-4xl flex-col gap-6"
      data-testid="po-form"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="المورد" htmlFor={`${id}-supplier`} required error={err("supplier_id")}>
          <NativeSelect id={`${id}-supplier`} {...register("supplier_id")} aria-invalid={Boolean(err("supplier_id"))} className="h-11 md:h-8" data-testid="po-supplier">
            <option value="">اختر المورد…</option>
            {(options.data?.suppliers ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {multi ? (
          <Field label="موقع الاستلام" htmlFor={`${id}-location`} required error={err("location_id")} hint="المخزون يُحدَّث في هذا الموقع عند الاستلام.">
            <NativeSelect id={`${id}-location`} {...register("location_id")} aria-invalid={Boolean(err("location_id"))} className="h-11 md:h-8" data-testid="po-location">
              <option value="">اختر الموقع…</option>
              {(options.data?.locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
      </div>

      <section className="flex flex-col gap-3" aria-labelledby={`${id}-lines`}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 id={`${id}-lines`} className="text-base font-medium">
            السطور <Mono className="text-muted-foreground">{lines.fields.length}</Mono>
          </h2>
        </div>
        <ProductPicker
          onPick={(p) => {
            const existing = getValues("lines").findIndex((l) => l.product_id === p.product_id && l.variant_id === p.variant_id);
            if (existing >= 0) {
              const cur = Number(getValues(`lines.${existing}.quantity_ordered`)) || 0;
              setValue(`lines.${existing}.quantity_ordered`, String(cur + 1), { shouldDirty: true });
              return;
            }
            lines.append({ product_id: p.product_id, variant_id: p.variant_id, name: p.name, sku: p.sku, quantity_ordered: "1", unit_cost: p.cost });
            setLinesError(null);
          }}
        />
        {linesError ? (
          <p role="alert" className="text-sm text-destructive" data-testid="po-lines-error">
            {linesError}
          </p>
        ) : null}
        {lines.fields.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border" data-testid="po-lines">
            {lines.fields.map((field, i) => (
              <li key={field.id} className="grid grid-cols-[1fr_auto] gap-3 p-3 md:grid-cols-[1fr_9rem_9rem_auto] md:items-start" data-testid="po-line">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm">{watched?.[i]?.name ?? field.name}</span>
                  <Mono className="text-xs text-muted-foreground">{field.sku}</Mono>
                </span>
                <Button type="button" variant="ghost" size="icon" className="size-11 md:order-last lg:size-8" aria-label={`حذف السطر ${field.sku}`} onClick={() => lines.remove(i)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
                <Field label="الكمية" htmlFor={`${id}-q${i}`} error={err(`lines.${i}.quantity_ordered`)} className="col-span-1">
                  <input id={`${id}-q${i}`} inputMode="numeric" dir="ltr" {...register(`lines.${i}.quantity_ordered`, { setValueAs: (v: string) => toWesternDigits(String(v)) })} className={numericInputClass} data-testid="po-line-qty" />
                </Field>
                <Field label="تكلفة الوحدة" htmlFor={`${id}-c${i}`} error={err(`lines.${i}.unit_cost`)} className="col-span-1">
                  <input id={`${id}-c${i}`} inputMode="decimal" dir="ltr" {...register(`lines.${i}.unit_cost`, { setValueAs: (v: string) => toWesternDigits(String(v)) })} className={numericInputClass} data-testid="po-line-cost" />
                </Field>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">لا سطور بعد — ابحث عن منتج بالاسم أو SKU لإضافته.</p>
        )}
      </section>

      <Field label="ملاحظات للمورد" htmlFor={`${id}-notes`} error={err("notes")}>
        <Textarea id={`${id}-notes`} rows={3} {...register("notes")} />
      </Field>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="submit" variant="outline" disabled={busy} className="h-11 lg:h-9" data-testid="po-save-draft">
          حفظ كمسودة
        </Button>
        <Button type="button" disabled={busy} className="h-11 lg:h-9" onClick={() => void run(true)} data-testid="po-save-submit">
          حفظ وإرسال للموافقة
        </Button>
        <Button type="button" variant="ghost" className="h-11 lg:h-9" onClick={() => router.back()}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

function ProductPicker({ onPick }: { onPick: (p: { product_id: number; variant_id: number | null; name: string; sku: string; cost: string }) => void }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const deferred = useDeferredValue(q.trim());
  const results = useLineProducts(deferred, open);
  const [active, setActive] = useState(0);
  const list = results.data ?? [];

  const pick = (i: number) => {
    const p = list[i];
    if (!p) return;
    onPick(p);
    setQ("");
    setActive(0);
  };

  return (
    <div className="relative">
      <label htmlFor={`${id}-search`} className="sr-only">
        بحث عن منتج لإضافته
      </label>
      <input
        id={`${id}-search`}
        role="combobox"
        aria-expanded={open && list.length > 0}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && list[active] ? `${id}-opt-${active}` : undefined}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(list.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(active);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder="ابحث عن منتج بالاسم أو SKU…"
        className={inputClass}
        data-testid="po-product-search"
      />
      {open && list.length ? (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-sm">
          {list.map((p, i) => (
            <li
              key={`${p.product_id}-${p.variant_id ?? 0}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(i);
              }}
              className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 text-sm lg:min-h-8", i === active && "bg-muted")}
              data-testid="po-product-option"
            >
              <Plus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <Mono className="text-xs text-muted-foreground">{p.sku}</Mono>
              <Mono className="text-xs">{p.display_cost}</Mono>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** ± stepper used by the receive screen on touch (spec §6 mobile). */
export function Stepper({ value, max, onChange, label, testId }: { value: number; max: number; onChange: (v: number) => void; label: string; testId?: string }) {
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="icon" className="size-11 lg:size-8" aria-label={`إنقاص ${label}`} onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>
        <Minus className="size-4" aria-hidden />
      </Button>
      <input
        aria-label={label}
        inputMode="numeric"
        dir="ltr"
        value={String(value)}
        onChange={(e) => {
          const n = Number(toWesternDigits(e.target.value).replace(/\D/g, "") || 0);
          onChange(Math.min(max, n));
        }}
        className={cn(numericInputClass, "w-20 text-center")}
        data-testid={testId}
      />
      <Button type="button" variant="outline" size="icon" className="size-11 lg:size-8" aria-label={`زيادة ${label}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Plus className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
