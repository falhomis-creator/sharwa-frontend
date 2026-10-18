"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { AccessGate } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Field, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { useLoyaltySettings, useSaveLoyalty } from "@/features/marketing/api";
import { applyServerErrors, BackToHub, errorMessage, FormActions, FormSkeleton, OwnerGate } from "@/features/marketing/components/shared";
import type { LoyaltySettings } from "@/features/marketing/schemas";
import { formatNumber } from "@/lib/format";

/**
 * US-13.6.1 — loyalty settings on the shared `LoyaltyProgram` singleton (M35 reads it).
 * The live example line restates the three numbers in the merchant's own words.
 */
const inputSchema = z
  .object({ is_enabled: z.boolean(), riyals_per_point: z.string().trim(), points_per_riyal_redemption: z.string().trim(), min_points_to_redeem: z.string().trim() })
  .superRefine((v, ctx) => {
    for (const key of ["riyals_per_point", "points_per_riyal_redemption", "min_points_to_redeem"] as const) {
      const n = Number(v[key]);
      if (!Number.isInteger(n) || n < 0) ctx.addIssue({ code: "custom", path: [key], message: "عدد صحيح." });
      else if (v.is_enabled && key !== "min_points_to_redeem" && n <= 0) ctx.addIssue({ code: "custom", path: [key], message: "القيمة يجب أن تكون أكبر من صفر." });
    }
  });
type Input = z.infer<typeof inputSchema>;

export function LoyaltyScreen() {
  return (
    <AccessGate feature="loyalty_settings">
      <OwnerGate description="إعدادات نقاط الولاء مقصورة على مالك المتجر.">
        <Loader />
      </OwnerGate>
    </AccessGate>
  );
}

function Loader() {
  const q = useLoyaltySettings();
  if (q.isLoading) return <div className="flex flex-col gap-5"><BackToHub /><FormSkeleton /></div>;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <LoyaltyForm settings={q.data} />;
}

const toInput = (s: LoyaltySettings): Input => ({ is_enabled: s.is_enabled, riyals_per_point: String(s.riyals_per_point), points_per_riyal_redemption: String(s.points_per_riyal_redemption), min_points_to_redeem: String(s.min_points_to_redeem) });

function LoyaltyForm({ settings }: { settings: LoyaltySettings }) {
  const save = useSaveLoyalty();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Input>({ resolver: zodResolver(inputSchema), defaultValues: toInput(settings) });
  const { register, control, formState: { errors } } = form;
  const v = useWatch({ control });
  const rpp = Number(v.riyals_per_point) || 0;
  const ppr = Number(v.points_per_riyal_redemption) || 0;
  const example = rpp > 0 ? Math.floor(100 / rpp) : 0;
  const redeem = ppr > 0 ? Math.floor(100 / ppr) : 0;

  const onSubmit = form.handleSubmit(async (d) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync({ is_enabled: d.is_enabled, riyals_per_point: Number(d.riyals_per_point), points_per_riyal_redemption: Number(d.points_per_riyal_redemption), min_points_to_redeem: Number(d.min_points_to_redeem) });
      form.reset(toInput(saved));
      toast.success("حُفظت إعدادات الولاء");
    } catch (err) {
      if (!applyServerErrors(form, err)) setFormError(errorMessage(err));
    }
  });

  return (
    <div className="flex flex-col gap-5" data-testid="loyalty-screen">
      <BackToHub />
      <PageHeader title="نقاط الولاء" description="يكسب العميل نقاطاً مع كل طلب ويستبدلها عند الدفع." />
      <form onSubmit={onSubmit} noValidate className="flex max-w-xl flex-col gap-5">
        <Controller control={control} name="is_enabled" render={({ field }) => <ToggleRow id="is_enabled" label="تفعيل برنامج النقاط" description="عند الإيقاف تبقى أرصدة العملاء محفوظة دون كسب أو استبدال." checked={field.value} onCheckedChange={field.onChange} testId="is_enabled" />} />
        <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4" disabled={!v.is_enabled}>
          <legend className="px-1 text-xs text-muted-foreground">المعادلة</legend>
          <Field label="ريالات لكل نقطة" htmlFor="riyals_per_point" error={errors.riyals_per_point?.message} required hint="كل هذا المبلغ من الطلب يكسب نقطة واحدة.">
            <input id="riyals_per_point" {...register("riyals_per_point")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.riyals_per_point} data-testid="riyals_per_point" />
          </Field>
          <Field label="نقاط لكل ريال عند الاستبدال" htmlFor="points_per_riyal_redemption" error={errors.points_per_riyal_redemption?.message} required>
            <input id="points_per_riyal_redemption" {...register("points_per_riyal_redemption")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.points_per_riyal_redemption} data-testid="points_per_riyal_redemption" />
          </Field>
          <Field label="الحد الأدنى للاستبدال (نقاط)" htmlFor="min_points_to_redeem" error={errors.min_points_to_redeem?.message} required hint="0 = بلا حد.">
            <input id="min_points_to_redeem" {...register("min_points_to_redeem")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.min_points_to_redeem} />
          </Field>
          <p className="rounded-md bg-muted/50 px-3 py-2 text-sm" data-testid="loyalty-example">
            <span className="text-muted-foreground">مثال: </span>
            <Mono>100 ر.س</Mono> = <Mono>{formatNumber(example)}</Mono> {example === 1 ? "نقطة" : "نقاط"}
            <span className="text-muted-foreground"> · </span>
            <Mono>100</Mono> نقطة = <Mono>{formatNumber(redeem)} ر.س</Mono> خصماً
          </p>
        </fieldset>
        <FormActions pending={save.isPending} cancelHref="/dashboard/marketing" error={formError} />
      </form>
    </div>
  );
}
