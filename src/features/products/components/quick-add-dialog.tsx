"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { ToggleRow } from "@/components/shared/toggle-row";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { addDecimal, groupDecimal, isDecimal, mulDecimal } from "@/lib/decimal";
import { toWesternDigits } from "@/lib/format";
import { hasImageExtension, IMAGE_EXTENSIONS_MESSAGE } from "@/features/organization/schemas";
import { UNITS, UNIT_LABELS, quickAddSchema, type QuickAddValues } from "@/features/products/schemas";
import { useQuickAdd, useTemplates } from "@/features/products/api/products";

/**
 * Quick add (US-04.2, T072): a side panel with ONLY the `ProductQuickAddForm` fields — four
 * up front (name, price, image, stock), the rest folded under «خيارات إضافية». Saved as
 * published with unit `piece` and a generated SKU; the toast offers «تحرير كامل».
 *
 * SC-04.1: a product with an image and a price in ≤ 30 s and ≤ 5 fields.
 *
 * «القالب» sits up front (owner directive 2026-10-20): picking one FILLS the visible fields
 * (unit, pricing, flags) with the template's values, so what the merchant sees is what is
 * applied — the server then copies the rest of the blueprint (`blueprint_id`).
 */
/** Quick-add fields a template may pre-fill — the visible ones the merchant can still change. */
const TEMPLATE_PREFILL_KEYS = [
  "unit",
  "pricing_type",
  "formula_coefficient",
  "formula_fixed_extra",
  "is_serialized",
  "is_bundle",
  "is_auction",
  "is_personalizable",
] as const;
const DEFAULTS: QuickAddValues = {
  name: "",
  name_en: "",
  image: null,
  price: "",
  stock: "1",
  unit: "piece",
  blueprint_id: "",
  pricing_type: "fixed",
  formula_unit_price: "",
  formula_coefficient: "",
  formula_fixed_extra: "",
  is_serialized: false,
  is_bundle: false,
  is_auction: false,
  is_personalizable: false,
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function QuickAddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const mutation = useQuickAdd();
  const templates = useTemplates();
  const [more, setMore] = useState(false);
  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const form = useForm<QuickAddValues>({ resolver: zodResolver(quickAddSchema), defaultValues: DEFAULTS });
  const { register, handleSubmit, setValue, setError, reset, formState } = form;
  const values = { ...form.formState.defaultValues, ...useWatch({ control: form.control }) } as QuickAddValues;

  const pickedTemplate = (templates.data ?? []).find((t) => String(t.id) === values.blueprint_id);

  function pickTemplate(id: string) {
    setValue("blueprint_id", id, { shouldDirty: true });
    const t = (templates.data ?? []).find((x) => String(x.id) === id);
    // Back to the plain defaults first, so switching templates never leaves the previous one's values behind.
    for (const key of TEMPLATE_PREFILL_KEYS) {
      const raw = t?.fields[key];
      const fallback = DEFAULTS[key];
      const next = raw === undefined || raw === null ? fallback : typeof fallback === "boolean" ? Boolean(raw) : String(raw);
      setValue(key, next as never, { shouldDirty: true });
    }
    if (t && (t.fields.pricing_type === "formula" || t.fields.is_serialized || t.fields.is_bundle)) setMore(true);
  }

  // `is_auction` pins stock to 1 (discovery 02 §2).
  useEffect(() => {
    if (values.is_auction) setValue("stock", "1");
  }, [values.is_auction, setValue]);

  async function onPickImage(file: File | undefined) {
    setImageError("");
    if (!file) return;
    if (!hasImageExtension(file.name)) {
      setImageError(IMAGE_EXTENSIONS_MESSAGE);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("حجم الصورة أكبر من 5MB.");
      return;
    }
    setValue("image", await readAsDataUrl(file), { shouldDirty: true });
  }

  const onSubmit = handleSubmit(async (v) => {
    setFormError("");
    try {
      const res = await mutation.mutateAsync({
        ...v,
        price: toWesternDigits(v.price),
        stock: toWesternDigits(v.stock),
        blueprint_id: v.blueprint_id ? Number(v.blueprint_id) : null,
      });
      toast.success(
        res.applied_template
          ? `أُضيف «${v.name}» — طُبِّق قالب ${res.applied_template.name}: ${res.applied_template.fields_count} حقلاً`
          : `أُضيف «${v.name}» ونُشر في المتجر`,
        {
          action: { label: "تحرير كامل", onClick: () => router.push(`/dashboard/products/${res.id}`) },
        },
      );
      reset(DEFAULTS);
      setMore(false);
      onOpenChange(false);
    } catch (err) {
      if (isApiError(err) && err.fields) {
        for (const [k, msgs] of Object.entries(err.fields)) {
          if (k in DEFAULTS) setError(k as keyof QuickAddValues, { message: msgs[0] });
        }
      }
      setFormError(isApiError(err) ? (err.detail ?? (err.fields ? "" : err.userMessage)) : "تعذّر الحفظ.");
    }
  });

  const formula =
    values.pricing_type === "formula" && isDecimal(values.formula_unit_price) && isDecimal(values.formula_coefficient)
      ? addDecimal(mulDecimal(values.formula_unit_price, values.formula_coefficient), values.formula_fixed_extra || "0")
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 shadow-none sm:max-w-md" data-testid="quick-add">
        <SheetHeader className="border-b border-border">
          <SheetTitle>إضافة سريعة</SheetTitle>
          <SheetDescription>الاسم والسعر والصورة تكفي — أكمل الباقي لاحقاً من المحرّر.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 p-4" noValidate>
          <Field
            label="القالب"
            htmlFor="qa-blueprint"
            hint={
              pickedTemplate
                ? `يُعبّئ ${Object.keys(pickedTemplate.fields).length} حقلاً (الوحدة، الضريبة، الشحن…) — عدّل ما يلزم.`
                : "اختياري — ابدأ من قالب لتعبئة الحقول المتكررة تلقائياً."
            }
          >
            <NativeSelect
              id="qa-blueprint"
              className="h-11 md:h-8"
              value={values.blueprint_id}
              onChange={(e) => pickTemplate(e.target.value)}
              data-testid="quick-add-template"
            >
              <option value="">بلا قالب</option>
              {(templates.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="اسم المنتج" htmlFor="qa-name" required error={formState.errors.name?.message}>
            <input id="qa-name" autoFocus className={inputClass} aria-invalid={Boolean(formState.errors.name)} {...register("name")} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="السعر" htmlFor="qa-price" required error={formState.errors.price?.message}>
              <input
                id="qa-price"
                dir="ltr"
                inputMode="decimal"
                placeholder="0.00"
                className={numericInputClass}
                aria-invalid={Boolean(formState.errors.price)}
                {...register("price")}
              />
            </Field>
            <Field
              label="المخزون"
              htmlFor="qa-stock"
              required
              error={formState.errors.stock?.message}
              hint={values.is_auction ? "المزاد قطعة واحدة دائماً." : undefined}
            >
              <input
                id="qa-stock"
                dir="ltr"
                inputMode="decimal"
                readOnly={values.is_auction}
                className={numericInputClass}
                aria-invalid={Boolean(formState.errors.stock)}
                {...register("stock")}
              />
            </Field>
          </div>

          <Field label="الصورة" htmlFor="qa-image" error={imageError} hint="jpg, jpeg, png, webp, gif — حتى 5MB">
            {values.image ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview before upload */}
                <img src={values.image} alt="" className="size-16 rounded-md border border-border object-cover" />
                <button
                  type="button"
                  onClick={() => setValue("image", null)}
                  className="inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted md:h-8"
                >
                  <X className="size-4" aria-hidden /> إزالة
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-20 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted"
              >
                <ImagePlus className="size-4" strokeWidth={1.75} aria-hidden />
                اختر صورة
              </button>
            )}
            <input
              ref={fileRef}
              id="qa-image"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              className="sr-only"
              onChange={(e) => void onPickImage(e.target.files?.[0])}
            />
          </Field>

          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            aria-expanded={more}
            className="min-h-11 self-start text-sm lg:min-h-8 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {more ? "إخفاء الخيارات الإضافية" : "خيارات إضافية"}
          </button>

          {more ? (
            <div className="flex flex-col gap-4 border-t border-border pt-4">
              <Field label="الاسم بالإنجليزية" htmlFor="qa-name-en">
                <input id="qa-name-en" dir="ltr" className={inputClass} {...register("name_en")} />
              </Field>
              <Field label="الوحدة" htmlFor="qa-unit">
                <NativeSelect id="qa-unit" className="h-11 md:h-8" {...register("unit")}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="التسعير" htmlFor="qa-pricing">
                <NativeSelect id="qa-pricing" className="h-11 md:h-8" {...register("pricing_type")}>
                  <option value="fixed">سعر ثابت</option>
                  <option value="formula">بالمعادلة (وحدة × معامل + ثابت)</option>
                </NativeSelect>
              </Field>
              {values.pricing_type === "formula" ? (
                <div className="grid grid-cols-3 gap-2">
                  <Field label="سعر الوحدة" htmlFor="qa-fu" error={formState.errors.formula_unit_price?.message}>
                    <input id="qa-fu" dir="ltr" inputMode="decimal" className={numericInputClass} {...register("formula_unit_price")} />
                  </Field>
                  <Field label="المعامل" htmlFor="qa-fc" error={formState.errors.formula_coefficient?.message}>
                    <input id="qa-fc" dir="ltr" inputMode="decimal" className={numericInputClass} {...register("formula_coefficient")} />
                  </Field>
                  <Field label="ثابت" htmlFor="qa-ff">
                    <input id="qa-ff" dir="ltr" inputMode="decimal" className={numericInputClass} {...register("formula_fixed_extra")} />
                  </Field>
                  {formula ? (
                    <p className="col-span-3 text-xs text-muted-foreground">
                      السعر الناتج (تقديري): <Mono className="text-foreground">{groupDecimal(formula)}</Mono>
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="divide-y divide-border border-y border-border">
                <ToggleRow id="qa-serial" label="أرقام تسلسلية" description="كل قطعة برقم مستقل يُدار من المخزون." checked={values.is_serialized} onCheckedChange={(v) => setValue("is_serialized", v)} />
                <ToggleRow id="qa-bundle" label="حزمة" description="منتج يتكوّن من منتجات أخرى." checked={values.is_bundle} onCheckedChange={(v) => setValue("is_bundle", v)} />
                <ToggleRow id="qa-auction" label="مزاد" description="قطعة واحدة تُباع لأعلى مزايد." checked={values.is_auction} onCheckedChange={(v) => setValue("is_auction", v)} />
                <ToggleRow id="qa-personal" label="قابل للتخصيص" description="يطلب من المشتري نصاً أو صورة." checked={values.is_personalizable} onCheckedChange={(v) => setValue("is_personalizable", v)} />
              </div>
            </div>
          ) : null}

          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="sticky bottom-0 -mx-4 mt-auto flex gap-2 border-t border-border bg-popover p-4">
            <Button type="submit" size="lg" className="h-11 flex-1" disabled={mutation.isPending} data-testid="quick-add-submit">
              {mutation.isPending ? "جارٍ الحفظ…" : "حفظ ونشر"}
            </Button>
            <Button type="button" variant="outline" size="lg" className="h-11" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
