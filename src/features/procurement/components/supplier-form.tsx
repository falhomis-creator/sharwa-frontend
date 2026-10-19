"use client";

import { useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field, inputClass } from "@/components/shared/field";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useSaveSupplier } from "@/features/procurement/api";
import { emptySupplierForm, supplierFormSchema, type Supplier, type SupplierForm } from "@/features/procurement/schemas";

/** FR-23.02: the supplier side sheet (React Hook Form + Zod, the `SupplierForm` fields). */
export function SupplierSheet({ open, onOpenChange, supplier }: { open: boolean; onOpenChange: (v: boolean) => void; supplier: Supplier | null }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md" data-testid="supplier-sheet">
        <div className="flex flex-col gap-1 border-b border-border p-4">
          <SheetTitle>{supplier ? "تعديل المورد" : "مورد جديد"}</SheetTitle>
          <SheetDescription>بيانات التواصل كما تظهر في أوامر الشراء.</SheetDescription>
        </div>
        {open ? <SupplierFormBody key={supplier?.id ?? "new"} supplier={supplier} onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function SupplierFormBody({ supplier, onDone }: { supplier: Supplier | null; onDone: () => void }) {
  const id = useId();
  const save = useSaveSupplier(supplier?.id ?? null);
  const form = useForm<SupplierForm>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: supplier
      ? { name: supplier.name, contact_name: supplier.contact_name, phone: supplier.phone, email: supplier.email, address: supplier.address, tax_number: supplier.tax_number, notes: supplier.notes, is_active: supplier.is_active }
      : emptySupplierForm(),
  });
  const { register, handleSubmit, formState, setError, control } = form;
  const err = (k: keyof SupplierForm) => formState.errors[k]?.message;

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(values);
      toast.success(supplier ? "حُفظ المورد" : `أُضيف المورد «${saved.name}»`);
      onDone();
    } catch (e) {
      if (isApiError(e) && e.fields) for (const [k, m] of Object.entries(e.fields)) setError(k as FieldPath<SupplierForm>, { message: m[0] });
      else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ");
    }
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-4 p-4"
      data-testid="supplier-form"
    >
      <Field label="الاسم" htmlFor={`${id}-name`} required error={err("name")}>
        <input id={`${id}-name`} {...register("name")} aria-invalid={Boolean(err("name"))} className={inputClass} autoFocus />
      </Field>
      <Field label="مسؤول التواصل" htmlFor={`${id}-contact`} error={err("contact_name")}>
        <input id={`${id}-contact`} {...register("contact_name")} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الهاتف" htmlFor={`${id}-phone`} error={err("phone")} hint="بالصيغة الدولية، أرقام فقط.">
          <input id={`${id}-phone`} dir="ltr" inputMode="tel" {...register("phone")} aria-invalid={Boolean(err("phone"))} className={cn(inputClass, "font-mono")} />
        </Field>
        <Field label="البريد" htmlFor={`${id}-email`} error={err("email")}>
          <input id={`${id}-email`} dir="ltr" type="email" {...register("email")} aria-invalid={Boolean(err("email"))} className={inputClass} />
        </Field>
      </div>
      <Field label="العنوان" htmlFor={`${id}-address`} error={err("address")}>
        <input id={`${id}-address`} {...register("address")} className={inputClass} />
      </Field>
      <Field label="الرقم الضريبي" htmlFor={`${id}-tax`} error={err("tax_number")}>
        <input id={`${id}-tax`} dir="ltr" {...register("tax_number")} className={cn(inputClass, "font-mono")} />
      </Field>
      <Field label="ملاحظات" htmlFor={`${id}-notes`} error={err("notes")}>
        <Textarea id={`${id}-notes`} rows={3} {...register("notes")} />
      </Field>
      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>نشط — يظهر في اختيار المورد لأوامر الشراء</span>
            <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="المورد نشط" />
          </label>
        )}
      />
      <div className="flex gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={save.isPending} className="h-11 lg:h-9" data-testid="supplier-save">
          {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} className="h-11 lg:h-9">
          إلغاء
        </Button>
      </div>
    </form>
  );
}
