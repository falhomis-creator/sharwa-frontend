"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { isApiError } from "@/lib/api-error";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  DATA_TYPES,
  DEFAULT_SWATCH_COLOR,
  DATA_TYPE_LABELS,
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  variantAttributeInputSchema,
  type VariantAttribute,
  type VariantAttributeInput,
} from "@/features/products/schemas";
import { attributeApi, productKeys, useVariantAttributes } from "@/features/products/api/products";
import { useCatalogAccess } from "@/features/products/hooks/use-catalog-access";

/**
 * `/dashboard/products/variants` — the store's attribute dictionary (`variant_hub`, FR-04.10,
 * T073): each attribute with its `field_type` / `data_type` / unit / range, and its values
 * typed by `data_type`. A value is added by typing + Enter; a swatch value takes a colour.
 * Deleting an attribute or value used by variants is refused by the server with the number
 * of affected products, which is shown with a link to them (M04 §8).
 */
export function VariantDictionary() {
  const store = useStore();
  const qc = useQueryClient();
  const access = useCatalogAccess();
  const query = useVariantAttributes();
  const [editing, setEditing] = useState<VariantAttribute | "new" | null>(null);
  const [deleting, setDeleting] = useState<VariantAttribute | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: productKeys(store).attributes });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="نماذج المتغيرات"
        description="قاموس السمات (المقاس، اللون، الخامة…) وقيمها، تُستخدم لتوليد متغيرات أي منتج."
        actions={
          access.canManage ? (
            <Button size="lg" className="h-11 gap-1.5 lg:h-9" onClick={() => setEditing("new")} data-testid="new-attribute">
              <Plus className="size-4" aria-hidden /> سمة جديدة
            </Button>
          ) : null
        }
      />
      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState title="لا سمات بعد" description="أضف سمة مثل «المقاس» ثم قيمها." />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {(query.data ?? []).map((a) => (
            <AttributeRow
              key={a.id}
              attribute={a}
              canManage={access.canManage}
              onEdit={() => setEditing(a)}
              onDelete={() => {
                setDeleteError("");
                setDeleting(a);
              }}
              onChanged={refresh}
            />
          ))}
        </ul>
      )}

      <AttributeSheet
        attribute={editing === "new" ? null : editing}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => void refresh()}
      />

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>حذف السمة «{deleting?.name}»</DialogTitle>
          <DialogDescription>
            {deleteError || (deleting?.products_count ? `مستخدمة في متغيرات ${deleting.products_count} منتجات.` : "ستُحذف السمة وقيمها.")}
          </DialogDescription>
          {deleteError ? (
            <Link href="/dashboard/products?flags=variants" className="text-sm underline underline-offset-4">
              عرض المنتجات ذات المتغيرات
            </Link>
          ) : null}
          <DialogFooter>
            <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => setDeleting(null)}>
              إغلاق
            </Button>
            {!deleteError ? (
              <Button
                variant="destructive"
                size="lg"
                className="h-11 lg:h-9"
                onClick={async () => {
                  if (!deleting) return;
                  try {
                    await attributeApi.remove(deleting.id);
                    toast.success("حُذفت السمة");
                    setDeleting(null);
                    void refresh();
                  } catch (err) {
                    setDeleteError(isApiError(err) ? err.userMessage : "تعذّر الحذف.");
                  }
                }}
              >
                حذف
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttributeRow({
  attribute: a,
  canManage,
  onEdit,
  onDelete,
  onChanged,
}: {
  attribute: VariantAttribute;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => Promise<unknown>;
}) {
  const [value, setValue] = useState("");
  const [color, setColor] = useState(DEFAULT_SWATCH_COLOR);
  const [error, setError] = useState("");
  const numeric = a.data_type === "number" || a.data_type === "unit";

  async function add() {
    setError("");
    if (!value.trim()) return;
    try {
      await attributeApi.addOption(a.id, { value: value.trim(), color: a.field_type === "swatches" ? color : undefined });
      setValue("");
      await onChanged();
    } catch (err) {
      setError(isApiError(err) ? err.userMessage : "تعذّر الإضافة.");
    }
  }

  async function removeOption(id: number) {
    try {
      await attributeApi.removeOption(id);
      await onChanged();
    } catch (err) {
      toast.error(isApiError(err) ? err.userMessage : "تعذّر الحذف.");
    }
  }

  return (
    <li className="flex flex-col gap-3 p-4" data-testid="attribute-row">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium">
            {a.name}
            {a.is_required ? <span className="ms-2 text-xs text-muted-foreground">إلزامية</span> : null}
          </p>
          <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <span>{FIELD_TYPE_LABELS[a.field_type]}</span>
            <span>{DATA_TYPE_LABELS[a.data_type]}</span>
            {a.unit ? <span>الوحدة: {a.unit}</span> : null}
            {a.min_value !== null || a.max_value !== null ? (
              <span>
                المدى <Mono>{a.min_value ?? "—"}</Mono>–<Mono>{a.max_value ?? "—"}</Mono>
              </span>
            ) : null}
            <span>
              في <Mono>{a.products_count}</Mono> منتجات
            </span>
          </p>
        </div>
        {canManage ? (
          <div className="flex gap-1">
            <button type="button" onClick={onEdit} aria-label={`تحرير ${a.name}`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8">
              <Pencil className="size-4" aria-hidden />
            </button>
            <button type="button" onClick={onDelete} aria-label={`حذف ${a.name}`} className="flex size-11 items-center justify-center rounded-md text-destructive hover:bg-muted lg:size-8">
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {a.options.map((o) => (
          <li key={o.id} className="inline-flex items-center gap-1.5 rounded-md border border-border ps-2 text-sm">
            {o.color ? (
              <span aria-hidden className="size-3 rounded-sm border border-border" style={{ backgroundColor: o.color }} />
            ) : null}
            {numeric ? <Mono>{o.value}</Mono> : o.value}
            {numeric && a.unit ? <span className="text-xs text-muted-foreground">{a.unit}</span> : null}
            {canManage ? (
              <button type="button" onClick={() => void removeOption(o.id)} aria-label={`حذف القيمة ${o.value}`} className="flex size-11 items-center justify-center text-muted-foreground hover:text-foreground lg:size-6">
                <X className="size-3" aria-hidden />
              </button>
            ) : (
              <span className="pe-2" />
            )}
          </li>
        ))}
      </ul>
      {canManage ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {a.field_type === "swatches" ? (
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="لون القيمة" className="size-11 shrink-0 cursor-pointer rounded-md border border-border bg-background p-1 lg:size-8" />
            ) : null}
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void add();
                }
              }}
              dir={numeric ? "ltr" : undefined}
              inputMode={numeric ? "decimal" : undefined}
              type={a.data_type === "date" ? "date" : "text"}
              placeholder={numeric ? `قيمة رقمية${a.min_value ? ` من ${a.min_value}` : ""}${a.max_value ? ` إلى ${a.max_value}` : ""} ثم Enter` : "أضف قيمة ثم Enter"}
              aria-label={`إضافة قيمة إلى ${a.name}`}
              aria-invalid={Boolean(error)}
              className={`${numeric ? numericInputClass : inputClass} max-w-xs`}
              data-testid={`option-input-${a.id}`}
            />
          </div>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

const EMPTY: VariantAttributeInput = {
  name: "",
  field_type: "select",
  data_type: "text",
  unit: "",
  min_value: "",
  max_value: "",
  is_required: false,
  sort_order: "0",
};

function AttributeSheet({
  attribute,
  open,
  onOpenChange,
  onSaved,
}: {
  attribute: VariantAttribute | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 shadow-none sm:max-w-md">
        {open ? <AttributeForm key={attribute?.id ?? "new"} attribute={attribute} onDone={() => { onSaved(); onOpenChange(false); }} onCancel={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function AttributeForm({ attribute, onDone, onCancel }: { attribute: VariantAttribute | null; onDone: () => void; onCancel: () => void }) {
  const [formError, setFormError] = useState("");
  const form = useForm<VariantAttributeInput>({
    resolver: zodResolver(variantAttributeInputSchema),
    defaultValues: attribute
      ? {
          name: attribute.name,
          field_type: attribute.field_type,
          data_type: attribute.data_type,
          unit: attribute.unit,
          min_value: attribute.min_value ?? "",
          max_value: attribute.max_value ?? "",
          is_required: attribute.is_required,
          sort_order: String(attribute.sort_order),
        }
      : EMPTY,
  });
  const { register, handleSubmit, setValue, setError, formState } = form;
  const v = { ...form.formState.defaultValues, ...useWatch({ control: form.control }) } as VariantAttributeInput;
  const numeric = v.data_type === "number" || v.data_type === "unit";

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    try {
      const body = { ...values, min_value: values.min_value || null, max_value: values.max_value || null };
      if (attribute) await attributeApi.update(attribute.id, body);
      else await attributeApi.create(body);
      toast.success(attribute ? "حُفظت السمة" : `أُضيفت سمة «${values.name}»`);
      onDone();
    } catch (err) {
      if (isApiError(err) && err.fields) {
        for (const [k, msgs] of Object.entries(err.fields)) if (k in EMPTY) setError(k as keyof VariantAttributeInput, { message: msgs[0] });
      }
      setFormError(isApiError(err) ? (err.detail ?? "") : "تعذّر الحفظ.");
    }
  });

  return (
    <>
      <SheetHeader className="border-b border-border">
        <SheetTitle>{attribute ? `تحرير «${attribute.name}»` : "سمة جديدة"}</SheetTitle>
        <SheetDescription>نوع الحقل يحدد طريقة العرض، ونوع البيانات يحدد ما تقبله القيم.</SheetDescription>
      </SheetHeader>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-1 flex-col gap-4 p-4" noValidate>
        <Field label="الاسم" htmlFor="va-name" required error={formState.errors.name?.message}>
          <input id="va-name" autoFocus className={inputClass} {...register("name")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="نوع الحقل" htmlFor="va-ft">
            <NativeSelect id="va-ft" className="h-11 md:h-8" {...register("field_type")}>
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="نوع البيانات" htmlFor="va-dt">
            <NativeSelect id="va-dt" className="h-11 md:h-8" {...register("data_type")}>
              {DATA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DATA_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        {v.data_type === "unit" ? (
          <Field label="الوحدة" htmlFor="va-unit" required error={formState.errors.unit?.message}>
            <input id="va-unit" className={inputClass} placeholder="سم، غ، مل" {...register("unit")} />
          </Field>
        ) : null}
        {numeric ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="أقل قيمة" htmlFor="va-min" error={formState.errors.min_value?.message}>
              <input id="va-min" dir="ltr" inputMode="decimal" className={numericInputClass} {...register("min_value")} />
            </Field>
            <Field label="أعلى قيمة" htmlFor="va-max" error={formState.errors.max_value?.message}>
              <input id="va-max" dir="ltr" inputMode="decimal" className={numericInputClass} {...register("max_value")} />
            </Field>
          </div>
        ) : null}
        <Field label="الترتيب" htmlFor="va-sort" error={formState.errors.sort_order?.message} className="max-w-32">
          <input id="va-sort" dir="ltr" inputMode="numeric" className={numericInputClass} {...register("sort_order")} />
        </Field>
        <div className="border-y border-border">
          <ToggleRow id="va-req" label="إلزامية" description="يجب على المشتري اختيار قيمة." checked={v.is_required} onCheckedChange={(on) => setValue("is_required", on, { shouldDirty: true })} />
        </div>
        {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
        <div className="sticky bottom-0 -mx-4 mt-auto flex gap-2 border-t border-border bg-popover p-4">
          <Button type="submit" size="lg" className="h-11 flex-1" disabled={formState.isSubmitting}>
            حفظ
          </Button>
          <Button type="button" variant="outline" size="lg" className="h-11" onClick={onCancel}>
            إلغاء
          </Button>
        </div>
      </form>
    </>
  );
}
