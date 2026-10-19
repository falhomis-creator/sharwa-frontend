"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { toWesternDigits } from "@/lib/format";
import { applyServerErrors, errorMessage } from "@/features/marketing/components/shared";
import { useSavePartner } from "@/features/affiliates/api";
import { affiliateInputSchema, COMMISSION_TYPE_LABELS, COMMISSION_TYPES, influencerInputSchema, PARTNER_KIND_LABELS, type Affiliate, type CommissionType, type Influencer, type PartnerKind } from "@/features/affiliates/schemas";
import { useIsDesktop } from "@/features/affiliates/components/bits";

/**
 * FR-17.07 — create/edit as a side sheet from the list (a bottom sheet on the phone),
 * React Hook Form + Zod with the model's real fields only; DRF field errors land under
 * their field (US-17.1.2 «هاتف مكرر»).
 */
interface Values {
  name: string;
  phone: string;
  contact: string;
  commission_type: CommissionType;
  commission_value: string;
}

function toValues(row: Affiliate | Influencer | null): Values {
  return {
    name: row?.name ?? "",
    phone: row && "phone" in row ? row.phone : "",
    contact: row && "contact" in row ? row.contact : "",
    commission_type: row?.commission_type ?? "percent",
    commission_value: row?.commission_value ?? "",
  };
}

export function PartnerFormSheet({
  kind,
  open,
  onOpenChange,
  row,
  onSaved,
}: {
  kind: PartnerKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: Affiliate | Influencer | null;
  onSaved?: (saved: Affiliate | Influencer) => void;
}) {
  const desktop = useIsDesktop();
  const labels = PARTNER_KIND_LABELS[kind];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "left" : "bottom"}
        className="max-h-[92dvh] gap-0 overflow-y-auto p-5 data-[side=left]:w-full data-[side=left]:sm:max-w-md"
        data-testid="partner-sheet"
      >
        <SheetTitle className="text-lg font-semibold">{row ? `تعديل ${labels.one}` : `${labels.one} جديد`}</SheetTitle>
        <SheetDescription className="mt-1 text-sm text-muted-foreground">
          {kind === "affiliates" ? "يحصل المسوّق على رمز ورابط للمتجر يُنسب له كل طلب يأتي منه." : "تُنسب للمؤثر الطلبات التي تستخدم كوبوناً مرتبطاً به."}
        </SheetDescription>
        {open ? <PartnerForm key={row?.id ?? "new"} kind={kind} row={row} onDone={(saved) => { onOpenChange(false); onSaved?.(saved); }} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function PartnerForm({ kind, row, onDone }: { kind: PartnerKind; row: Affiliate | Influencer | null; onDone: (saved: Affiliate | Influencer) => void }) {
  const save = useSavePartner(kind, row?.id ?? null);
  const [formError, setFormError] = useState<string | null>(null);
  const schema = kind === "affiliates" ? affiliateInputSchema : influencerInputSchema;
  const form = useForm<Values>({
    // The kind's own schema validates its fields; the other kind's field is simply ignored.
    resolver: zodResolver(schema as never) as never,
    defaultValues: toValues(row),
  });
  const { register, control, formState: { errors, isSubmitting } } = form;
  const type = useWatch({ control, name: "commission_type" });
  useEffect(() => form.setFocus("name"), [form]);

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    const body: Record<string, unknown> = { name: v.name.trim(), commission_type: v.commission_type, commission_value: toWesternDigits(v.commission_value.trim()) };
    if (kind === "affiliates") body.phone = toWesternDigits(v.phone).replace(/\D/g, "");
    else body.contact = v.contact.trim();
    try {
      const saved = await save.mutateAsync(body);
      toast.success(row ? "حُفظت التغييرات." : kind === "affiliates" ? "أُضيف المسوّق — انسخ رابطه وشاركه." : "أُضيف المؤثر — اربط به كوبوناً.");
      onDone(saved);
    } catch (err) {
      if (!applyServerErrors(form, err)) setFormError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-4" data-testid="partner-form">
      <Field label="الاسم" htmlFor="partner-name" error={errors.name?.message} required>
        <input id="partner-name" {...register("name")} className={inputClass} autoComplete="off" aria-invalid={!!errors.name} data-testid="partner-name" />
      </Field>
      {kind === "affiliates" ? (
        <Field label="الهاتف" htmlFor="partner-phone" error={errors.phone?.message} required hint="بصيغة دولية بلا +، مثل 967771234567 — يُرسَل له الرابط عبر واتساب.">
          <input id="partner-phone" {...register("phone")} inputMode="tel" dir="ltr" className={`${inputClass} font-mono`} autoComplete="off" aria-invalid={!!errors.phone} data-testid="partner-phone" />
        </Field>
      ) : (
        <Field label="وسيلة التواصل" htmlFor="partner-contact" error={errors.contact?.message} required hint="حساب التواصل أو الهاتف أو البريد — نص فقط.">
          <input id="partner-contact" {...register("contact")} dir="auto" className={inputClass} autoComplete="off" aria-invalid={!!errors.contact} data-testid="partner-contact" />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="نوع العمولة" htmlFor="commission_type" error={errors.commission_type?.message} required>
          <NativeSelect id="commission_type" {...register("commission_type")} className="h-11 lg:h-9" data-testid="commission-type">
            {COMMISSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {COMMISSION_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={type === "percent" ? "النسبة %" : "المبلغ (ر.س)"} htmlFor="commission_value" error={errors.commission_value?.message} required>
          <input id="commission_value" {...register("commission_value")} inputMode="decimal" dir="ltr" className={numericInputClass} aria-invalid={!!errors.commission_value} data-testid="commission-value" />
        </Field>
      </div>
      {formError ? (
        <p role="alert" className="text-sm text-destructive" data-testid="partner-form-error">
          {formError}
        </p>
      ) : null}
      <div className="flex gap-2 border-t border-border pt-4">
        <Button type="submit" className="h-11 lg:h-9" disabled={isSubmitting} data-testid="partner-save">
          {isSubmitting ? "جارٍ الحفظ…" : row ? "حفظ" : "إضافة"}
        </Button>
      </div>
    </form>
  );
}
