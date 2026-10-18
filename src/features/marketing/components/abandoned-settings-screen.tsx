"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { AccessGate } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Field, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { useAbandonedSettings, useSaveAbandonedSettings } from "@/features/marketing/api";
import { applyServerErrors, BackToHub, errorMessage, FormActions, FormSkeleton, OwnerGate } from "@/features/marketing/components/shared";
import { abandonedSettingsInputSchema, REMINDER_1_VARS, REMINDER_2_VARS, type AbandonedSettings, type AbandonedSettingsInput } from "@/features/marketing/schemas";

/**
 * US-13.3.2 — reminder settings: channels (WhatsApp on; email/SMS «قريباً»), two reminders
 * with delay + message (unknown `{var}` → «متغير غير معروف»), the recovery coupon.
 */
export function AbandonedSettingsScreen() {
  return (
    <AccessGate feature="abandoned_carts">
      <OwnerGate description="إعدادات السلات المتروكة مقصورة على مالك المتجر.">
        <Loader />
      </OwnerGate>
    </AccessGate>
  );
}

function Loader() {
  const q = useAbandonedSettings();
  if (q.isLoading) return <div className="flex flex-col gap-5"><BackToHub href="/dashboard/marketing/abandoned-carts" label="السلات المتروكة" /><FormSkeleton /></div>;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <SettingsForm settings={q.data} />;
}

function toInput(s: AbandonedSettings): AbandonedSettingsInput {
  return {
    is_enabled: s.is_enabled,
    min_cart_value: s.min_cart_value,
    channel_whatsapp: s.channel_whatsapp,
    channel_conversational_enabled: s.channel_conversational_enabled,
    reminder_1_delay_hours: String(s.reminder_1_delay_hours),
    reminder_1_message: s.reminder_1_message,
    reminder_2_delay_hours: String(s.reminder_2_delay_hours),
    reminder_2_message: s.reminder_2_message,
    discount_percent: String(s.discount_percent),
    discount_validity_hours: String(s.discount_validity_hours),
  };
}

function Vars({ names }: { names: readonly string[] }) {
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
      <span>المتغيرات:</span>
      {names.map((n) => <Mono key={n} className="text-[11px]">{`{${n}}`}</Mono>)}
    </span>
  );
}

function SettingsForm({ settings }: { settings: AbandonedSettings }) {
  const save = useSaveAbandonedSettings();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<AbandonedSettingsInput>({ resolver: zodResolver(abandonedSettingsInputSchema), defaultValues: toInput(settings) });
  const { register, control, formState: { errors } } = form;
  const enabled = useWatch({ control, name: "is_enabled" });
  const pct = useWatch({ control, name: "discount_percent" });

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync({ ...v });
      form.reset(toInput(saved));
      toast.success("حُفظت الإعدادات");
    } catch (err) {
      if (!applyServerErrors(form, err)) setFormError(errorMessage(err));
    }
  });

  return (
    <div className="flex flex-col gap-5" data-testid="abandoned-settings">
      <BackToHub href="/dashboard/marketing/abandoned-carts" label="السلات المتروكة" />
      <PageHeader title="إعدادات تذكير السلات" description="متى يُرسل التذكير، وبأي نص، وما كوبون الاسترداد." />
      <form onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-5">
        <Controller control={control} name="is_enabled" render={({ field }) => <ToggleRow id="is_enabled" label="تفعيل تذكيرات السلات المتروكة" description="عند الإيقاف تبقى السلات مرصودة في القائمة دون إرسال." checked={field.value} onCheckedChange={field.onChange} testId="is_enabled" />} />

        <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4" disabled={!enabled} data-testid="settings-fields">
          <legend className="px-1 text-xs text-muted-foreground">القنوات</legend>
          <Controller control={control} name="channel_whatsapp" render={({ field }) => <ToggleRow id="channel_whatsapp" label="واتساب" description="عبر رقم المتجر المربوط." checked={field.value} onCheckedChange={field.onChange} testId="channel_whatsapp" />} />
          <ToggleRow id="channel_email" label="البريد الإلكتروني" description="قريباً" checked={false} onCheckedChange={() => undefined} disabled testId="channel_email" />
          <ToggleRow id="channel_sms" label="رسائل SMS" description="قريباً" checked={false} onCheckedChange={() => undefined} disabled testId="channel_sms" />
          <Controller control={control} name="channel_conversational_enabled" render={({ field }) => <ToggleRow id="channel_conversational_enabled" label="التذكير في المحادثة أيضاً" description="إن كانت السلة بدأت من محادثة (واتساب/تيليجرام) يُرسل التذكير في نفس المحادثة." checked={field.value} onCheckedChange={field.onChange} />} />
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4" disabled={!enabled}>
          <legend className="px-1 text-xs text-muted-foreground">متى تُعدّ السلة متروكة</legend>
          <Field label="الحد الأدنى لقيمة السلة (ر.س)" htmlFor="min_cart_value" error={errors.min_cart_value?.message} hint="السلات الأقل لا تُذكَّر. 0 = الكل.">
            <input id="min_cart_value" {...register("min_cart_value")} inputMode="decimal" className={numericInputClass} dir="ltr" aria-invalid={!!errors.min_cart_value} />
          </Field>
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4" disabled={!enabled}>
          <legend className="px-1 text-xs text-muted-foreground">التذكير الأول</legend>
          <Field label="بعد (ساعات)" htmlFor="reminder_1_delay_hours" error={errors.reminder_1_delay_hours?.message} required className="max-w-40">
            <input id="reminder_1_delay_hours" {...register("reminder_1_delay_hours")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.reminder_1_delay_hours} data-testid="reminder_1_delay_hours" />
          </Field>
          <Field label="نص الرسالة" htmlFor="reminder_1_message" error={errors.reminder_1_message?.message} required hint={<Vars names={REMINDER_1_VARS} />}>
            <Textarea id="reminder_1_message" {...register("reminder_1_message")} rows={3} aria-invalid={!!errors.reminder_1_message} data-testid="reminder_1_message" />
          </Field>
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4" disabled={!enabled}>
          <legend className="px-1 text-xs text-muted-foreground">التذكير الثاني — مع كوبون</legend>
          <Field label="بعد (ساعات)" htmlFor="reminder_2_delay_hours" error={errors.reminder_2_delay_hours?.message} required className="max-w-40" hint="من وقت ترك السلة.">
            <input id="reminder_2_delay_hours" {...register("reminder_2_delay_hours")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.reminder_2_delay_hours} />
          </Field>
          <Field label="نص الرسالة" htmlFor="reminder_2_message" error={errors.reminder_2_message?.message} required hint={<Vars names={REMINDER_2_VARS} />}>
            <Textarea id="reminder_2_message" {...register("reminder_2_message")} rows={3} aria-invalid={!!errors.reminder_2_message} data-testid="reminder_2_message" />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="نسبة خصم الكوبون %" htmlFor="discount_percent" error={errors.discount_percent?.message} required hint={Number(pct) === 0 ? "0 = بلا كوبون." : undefined}>
              <input id="discount_percent" {...register("discount_percent")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.discount_percent} data-testid="discount_percent" />
            </Field>
            <Field label="صلاحية الكوبون (ساعات)" htmlFor="discount_validity_hours" error={errors.discount_validity_hours?.message} required>
              <input id="discount_validity_hours" {...register("discount_validity_hours")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.discount_validity_hours} />
            </Field>
          </div>
        </fieldset>

        <FormActions pending={save.isPending} cancelHref="/dashboard/marketing/abandoned-carts" error={formError} />
      </form>
    </div>
  );
}
