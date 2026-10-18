"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Field, inputClass } from "@/components/shared/field";
import { ToggleRow } from "@/components/shared/toggle-row";
import { Ltr } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { normalizePhone, prettyPhone, toWesternDigits } from "@/lib/format";
import { applyFieldErrors } from "@/features/settings/hooks/use-section-save";
import { staffFormSchema, type StaffForm, type StaffMember } from "@/features/staff/schemas";
import { useStaffWrites } from "@/features/staff/api";
import { outlineButton, primaryButton } from "@/features/staff/components/bits";

const EMPTY: StaffForm = { full_name: "", phone: "", is_active: true, enforce_ip_whitelist: false, enforce_roster_schedule: false };

/**
 * Add / edit a member (FR-18.01). The phone preview shows what the server will store
 * (`0770841802 → 967770841802`); a duplicate comes back as a 400 under the field.
 */
export function StaffFormSheet({ open, onOpenChange, staff }: { open: boolean; onOpenChange: (o: boolean) => void; staff?: StaffMember }) {
  const router = useRouter();
  const writes = useStaffWrites();
  const form = useForm<StaffForm>({ resolver: zodResolver(staffFormSchema), defaultValues: EMPTY });
  const { register, control, handleSubmit, reset, formState } = form;

  useEffect(() => {
    if (open) reset(staff ? { full_name: staff.full_name, phone: staff.phone, is_active: staff.is_active, enforce_ip_whitelist: staff.enforce_ip_whitelist, enforce_roster_schedule: staff.enforce_roster_schedule } : EMPTY);
  }, [open, staff, reset]);

  const phoneRaw = useWatch({ control, name: "phone" });
  const digits = toWesternDigits(phoneRaw).replace(/\D/g, "");
  const normalized = digits.length >= 9 ? normalizePhone(phoneRaw) : "";
  const ipOn = useWatch({ control, name: "enforce_ip_whitelist" });

  const submit = handleSubmit(async (values) => {
    const body = { ...values, phone: normalizePhone(values.phone) };
    try {
      if (staff) {
        await writes.patchStaff.mutateAsync({ id: staff.id, body });
        toast.success("حُفظت بيانات الموظف.");
      } else {
        const created = await writes.createStaff.mutateAsync(body);
        toast.success(`أُضيف ${created.full_name} — عيّنه على موقع ليبدأ العمل.`);
        router.push(`/dashboard/staff/${created.id}?tab=assignments`);
      }
      onOpenChange(false);
    } catch (e) {
      if (!applyFieldErrors(form, e)) toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 data-[side=left]:w-full data-[side=left]:sm:max-w-md" data-testid="staff-form">
        <SheetHeader className="p-0 pb-4 text-start">
          <SheetTitle>{staff ? "تعديل الموظف" : "إضافة موظف"}</SheetTitle>
          <SheetDescription>يدخل الموظف برقم هاتفه ورمز تحقق — لا كلمة مرور.</SheetDescription>
        </SheetHeader>
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
          <Field label="الاسم الكامل" htmlFor="staff-name" required error={formState.errors.full_name?.message}>
            <input id="staff-name" className={inputClass} autoComplete="off" aria-invalid={Boolean(formState.errors.full_name)} {...register("full_name")} />
          </Field>
          <Field
            label="رقم الهاتف"
            htmlFor="staff-phone"
            required
            error={formState.errors.phone?.message}
            hint={
              normalized ? (
                <>
                  سيُحفظ كـ <Ltr className="font-mono">{prettyPhone(normalized)}</Ltr>
                </>
              ) : (
                "يمني أو سعودي، بالصيغة المحلية أو الدولية."
              )
            }
          >
            <input id="staff-phone" dir="ltr" inputMode="tel" autoComplete="off" placeholder="0770841802" className={`${inputClass} font-mono text-start`} aria-invalid={Boolean(formState.errors.phone)} {...register("phone")} />
          </Field>
          <div className="divide-y divide-border rounded-lg border border-border px-3">
            <Controller control={control} name="is_active" render={({ field }) => <ToggleRow id="staff-active" label="نشط" description="المعطّل لا يستطيع الدخول لكن سجله يبقى." checked={field.value} onCheckedChange={field.onChange} />} />
            <Controller
              control={control}
              name="enforce_ip_whitelist"
              render={({ field }) => (
                <ToggleRow id="staff-ip" label="تقييد عناوين IP" description="يدخل فقط من العناوين المسموح بها في إعدادات الأمان." checked={field.value} onCheckedChange={field.onChange} testId="staff-ip">
                  {ipOn ? <p className="text-xs text-warning">سيُمنع الدخول حتى تُضاف عناوين.</p> : null}
                </ToggleRow>
              )}
            />
            <Controller control={control} name="enforce_roster_schedule" render={({ field }) => <ToggleRow id="staff-roster" label="الالتزام بجدول العمل" description="يُرفض الدخول خارج أوقات الجدول الأسبوعي." checked={field.value} onCheckedChange={field.onChange} />} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={outlineButton} onClick={() => onOpenChange(false)}>
              إلغاء
            </button>
            <button type="submit" className={primaryButton} disabled={formState.isSubmitting} data-testid="staff-form-submit">
              {staff ? "حفظ" : "إضافة"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
