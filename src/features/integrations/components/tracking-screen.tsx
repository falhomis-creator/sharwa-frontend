"use client";

import Link from "next/link";
import { useState } from "react";
import { Controller, useForm, useWatch, type Control, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessGate } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { useSaveTracking, useTracking } from "@/features/integrations/api";
import { applyServerErrors, errorMessage, OwnerGate, PendingContractTag } from "@/features/integrations/components/shared";
import {
  TRACKING_ID_FIELDS,
  TRACKING_LABELS,
  TRACKING_PLACEHOLDERS,
  trackingFormatWarning,
  trackingInputSchema,
  type Tracking,
  type TrackingIdField,
  type TrackingInput,
  type TrackingTokenField,
} from "@/features/integrations/schemas";
import { formatDateTime } from "@/lib/format";

/**
 * `/dashboard/marketing/tracking` — M19 US-19.2 (feature `tracking_tools`, owner only). The ten
 * fields; the two `*_api_token` are write-only («اتركه فارغاً للإبقاء», `has_*` only —
 * FR-19.04). Format warnings never block. This page loads NO tracking script (FR-19.05):
 * pixels are injected by the storefront (M09) only.
 */
export function TrackingScreen() {
  return (
    <div className="flex flex-col gap-6" data-testid="tracking-screen">
      <Link href="/dashboard/marketing" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:min-h-0">
        <ChevronRight aria-hidden className="size-4 rtl:rotate-0 ltr:rotate-180" />
        التسويق
      </Link>
      <PageHeader title="أدوات التتبع" description="معرّفات البكسل والتحليلات الإعلانية. تُحمَّل في متجرك فقط — لا في لوحة التحكم." actions={<PendingContractTag />} />
      <AccessGate feature="tracking_tools">
        <OwnerGate what="أدوات التتبع">
          <TrackingLoader />
        </OwnerGate>
      </AccessGate>
    </div>
  );
}

function TrackingLoader() {
  const q = useTracking();
  if (q.isLoading)
    return (
      <div className="flex max-w-2xl flex-col gap-4" aria-busy="true">
        <Skeleton className="h-14" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <TrackingForm data={q.data} />;
}

function toInput(t: Tracking): TrackingInput {
  return {
    is_tracking_enabled: t.is_tracking_enabled,
    meta_pixel_id: t.meta_pixel_id,
    tiktok_pixel_id: t.tiktok_pixel_id,
    snapchat_pixel_id: t.snapchat_pixel_id,
    gtm_container_id: t.gtm_container_id,
    ga4_measurement_id: t.ga4_measurement_id,
    google_ads_conversion_id: t.google_ads_conversion_id,
    google_ads_conversion_label: t.google_ads_conversion_label,
    meta_conversions_api_token: "",
    tiktok_events_api_token: "",
  };
}

const GROUPS: Array<{ title: string; ids: TrackingIdField[]; token?: TrackingTokenField }> = [
  { title: "Meta (فيسبوك وإنستغرام)", ids: ["meta_pixel_id"], token: "meta_conversions_api_token" },
  { title: "TikTok", ids: ["tiktok_pixel_id"], token: "tiktok_events_api_token" },
  { title: "Snapchat", ids: ["snapchat_pixel_id"] },
  { title: "Google", ids: ["gtm_container_id", "ga4_measurement_id", "google_ads_conversion_id", "google_ads_conversion_label"] },
];

function TrackingForm({ data }: { data: Tracking }) {
  const save = useSaveTracking();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<TrackingInput>({ resolver: zodResolver(trackingInputSchema), defaultValues: toInput(data) });
  const { register, control, formState } = form;
  const { errors, isDirty } = formState;
  const values = useWatch({ control });
  const enabled = values.is_tracking_enabled ?? data.is_tracking_enabled;
  const anyId = TRACKING_ID_FIELDS.some((f) => (values[f] ?? "").trim());

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    const body: Record<string, unknown> = { is_tracking_enabled: v.is_tracking_enabled };
    for (const f of TRACKING_ID_FIELDS) body[f] = v[f].trim();
    // Write-only: an empty token keeps the stored one (FR-19.04).
    if (v.meta_conversions_api_token.trim()) body.meta_conversions_api_token = v.meta_conversions_api_token.trim();
    if (v.tiktok_events_api_token.trim()) body.tiktok_events_api_token = v.tiktok_events_api_token.trim();
    try {
      const saved = await save.mutateAsync(body);
      form.reset(toInput(saved));
      toast.success("حُفظت أدوات التتبع");
    } catch (err) {
      if (!applyServerErrors(form, err)) setFormError(errorMessage(err));
    }
  });

  async function clearToken(field: TrackingTokenField) {
    try {
      await save.mutateAsync({ [field]: null });
      toast.success("أُزيل الرمز");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-6" data-testid="tracking-form">
      <section className="flex flex-col gap-2 border-b border-border pb-4">
        <Controller
          control={control}
          name="is_tracking_enabled"
          render={({ field }) => <ToggleRow id="is_tracking_enabled" label="تفعيل التتبع في المتجر" description="عند الإيقاف تبقى المعرّفات محفوظة ولا يُحمَّل أي سكربت." checked={field.value} onCheckedChange={field.onChange} testId="tracking-enabled" />}
        />
        {!enabled ? (
          <p className="inline-flex items-center gap-1.5 self-start rounded-md border border-border px-2 py-1 text-xs text-muted-foreground" role="status" data-testid="tracking-disabled-badge">
            <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/60" />
            معطّل — لن تُحمَّل أي سكربتات في المتجر
          </p>
        ) : !anyId ? (
          <p className="text-sm text-warning" role="status" data-testid="tracking-no-id">
            لن يعمل التتبع بلا معرّف واحد على الأقل.
          </p>
        ) : null}
      </section>

      {GROUPS.map((g) => (
        <fieldset key={g.title} className="flex flex-col gap-4 border-b border-border pb-6">
          <legend className="pb-3 text-sm font-semibold">{g.title}</legend>
          <div className="grid gap-4 md:grid-cols-2">
            {g.ids.map((f) => (
              <IdField key={f} field={f} control={control} register={register} error={errors[f]?.message} />
            ))}
          </div>
          {g.token ? (
            <TokenField
              field={g.token}
              has={g.token === "meta_conversions_api_token" ? data.has_meta_conversions_api_token : data.has_tiktok_events_api_token}
              register={register}
              error={errors[g.token]?.message}
              onClear={() => void clearToken(g.token!)}
              clearing={save.isPending}
            />
          ) : null}
        </fieldset>
      ))}

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="h-11 lg:h-9" disabled={save.isPending || !isDirty} data-testid="tracking-save">
          {save.isPending ? "يُحفظ…" : "حفظ التغييرات"}
        </Button>
        {data.updated_at ? <span className="text-xs text-muted-foreground">آخر حفظ: {formatDateTime(data.updated_at)}</span> : null}
      </div>
    </form>
  );
}

type Register = UseFormRegister<TrackingInput>;

function IdField({ field, control, register, error }: { field: TrackingIdField; control: Control<TrackingInput>; register: Register; error?: string }) {
  const value = useWatch({ control, name: field });
  const warning = trackingFormatWarning(field, value ?? "");
  return (
    <Field label={TRACKING_LABELS[field]} htmlFor={field} error={error} hint={warning ? <span className="text-warning" data-testid={`warn-${field}`}>{warning}</span> : undefined}>
      <input id={field} {...register(field)} dir="ltr" autoComplete="off" spellCheck={false} placeholder={TRACKING_PLACEHOLDERS[field]} className={`${inputClass} font-mono`} aria-invalid={!!error} data-testid={field} />
    </Field>
  );
}

function TokenField({ field, has, register, error, onClear, clearing }: { field: TrackingTokenField; has: boolean; register: Register; error?: string; onClear: () => void; clearing: boolean }) {
  return (
    <Field
      label={TRACKING_LABELS[field]}
      htmlFor={field}
      error={error}
      hint={
        <span className="flex flex-wrap items-center gap-x-2" data-testid={`${field}-state`}>
          {has ? "محفوظ — اتركه فارغاً للإبقاء، أو أدخل رمزاً جديداً لاستبداله." : "غير محفوظ. يُرسل من الخادم فقط ولا يُعرض بعد الحفظ."}
          {has ? (
            <button type="button" onClick={onClear} disabled={clearing} className="inline-flex min-h-11 items-center text-foreground underline underline-offset-4 lg:min-h-0" data-testid={`${field}-clear`}>
              إزالة الرمز
            </button>
          ) : null}
        </span>
      }
    >
      <input id={field} type="password" {...register(field)} dir="ltr" autoComplete="new-password" spellCheck={false} placeholder={has ? "•••••••• محفوظ" : ""} className={`${inputClass} font-mono`} aria-invalid={!!error} data-testid={field} />
    </Field>
  );
}
