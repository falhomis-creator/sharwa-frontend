"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCarrier, useCarrierWrites, useCarriers } from "@/features/shipping/api";
import type { Carrier, CarrierCode } from "@/features/shipping/schemas";
import { ConnectionText, OwnerGate, ShippingSubnav, outlineButton, primaryButton } from "@/features/shipping/components/bits";

/**
 * `/dashboard/shipping/carriers` and `/[code]` (US-15.4): the carrier name as text (no
 * coloured logos, §11 I), its connection state, the form built from the adapter's
 * `credential_fields` (FR-15.02 — secrets write-only and masked, never echoed back), the
 * inbound webhook URL to copy with its signature header, and the last inbound event.
 */
export function CarriersScreen() {
  return (
    <AccessGate feature="shipping_companies">
      <OwnerGate>
        <CarriersList />
      </OwnerGate>
    </AccessGate>
  );
}

function CarriersList() {
  const query = useCarriers();
  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="carriers-screen">
      <PageHeader title="الناقلون الخارجيون" description="اربط حساب أرامكس أو سمسا ليصدر متجرك البوالص ويستقبل أحداث التتبع تلقائياً." />
      <ShippingSubnav />
      {query.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="carriers-list">
          {query.data.map((c) => (
            <li key={c.carrier_code}>
              <Link href={`/dashboard/shipping/carriers/${c.carrier_code}`} className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 p-3 hover:bg-muted/50" data-testid={`carrier-${c.carrier_code}`}>
                <span className="flex min-w-0 flex-1 basis-40 flex-col">
                  <span className="font-medium">{c.name}</span>
                  <Mono className="self-start text-xs text-muted-foreground">{c.carrier_code}</Mono>
                </span>
                <ConnectionText connection={c.connection} />
                <LastEvent carrier={c} compact />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LastEvent({ carrier, compact = false }: { carrier: Carrier; compact?: boolean }) {
  if (carrier.connection === "not_connected") return compact ? <span className="text-xs text-muted-foreground">أدخل بيانات الاعتماد للبدء</span> : null;
  return (
    <span className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", compact ? "text-xs" : "text-sm")} data-testid="last-event">
      {carrier.last_event_at ? (
        <span className="text-muted-foreground">
          آخر حدث وارد <Mono className="text-foreground">{formatDateTime(carrier.last_event_at)}</Mono>
          {carrier.last_event_waybill ? (
            <>
              {" "}
              · بوليصة <Mono className="text-foreground">{carrier.last_event_waybill}</Mono>
            </>
          ) : null}
        </span>
      ) : (
        <span className="text-muted-foreground">لم يصل أي حدث بعد</span>
      )}
      {carrier.no_events_warning ? (
        <span className="inline-flex items-center gap-1 text-warning" data-testid="no-events-warning">
          <span aria-hidden className="size-1.5 rounded-full bg-warning" />
          لا أحداث واردة منذ أكثر من 7 أيام
        </span>
      ) : null}
    </span>
  );
}

export function CarrierScreen({ code }: { code: CarrierCode }) {
  return (
    <AccessGate feature="shipping_companies">
      <OwnerGate>
        <CarrierBody code={code} />
      </OwnerGate>
    </AccessGate>
  );
}

function CarrierBody({ code }: { code: CarrierCode }) {
  const query = useCarrier(code);
  const back = (
    <Link href="/dashboard/shipping/carriers" className="inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:min-h-8">
      <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> كل الناقلين
    </Link>
  );
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        {back}
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (!query.data) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }
  const c = query.data;
  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="carrier-page">
      {back}
      <PageHeader eyebrow={c.carrier_code} title={c.name} description="بيانات الاعتماد تُحفظ مشفّرة على الخادم ولا تُعرض مرة أخرى." actions={<ConnectionText connection={c.connection} />} />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <CredentialsForm key={`${c.fields.map((f) => f.value ?? (f.has_value ? "•" : "")).join("|")}`} carrier={c} />
        <WebhookPanel carrier={c} />
      </div>
    </div>
  );
}

function CredentialsForm({ carrier }: { carrier: Carrier }) {
  const { saveCredentials, test } = useCarrierWrites(carrier.carrier_code);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(carrier.fields.map((f) => [f.name, f.is_secret ? "" : (f.value ?? "")])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(carrier.last_error ? { ok: false, message: carrier.last_error } : null);

  const save = () => {
    setErrors({});
    saveCredentials.mutate(values, {
      onSuccess: () => {
        toast.success("حُفظت بيانات الاعتماد — جرّب الاتصال.");
        setResult(null);
      },
      onError: (e) => {
        if (isApiError(e) && e.fields) {
          setErrors(Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, v[0] ?? ""])));
          document.getElementById(`cred-${Object.keys(e.fields)[0]}`)?.focus();
        } else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
      },
    });
  };
  const runTest = () =>
    test.mutate(undefined, {
      onSuccess: (r) => setResult(r),
      onError: (e) => setResult({ ok: false, message: isApiError(e) ? e.userMessage : "تعذّر اختبار الاتصال." }),
    });

  return (
    <section className="flex min-w-0 flex-col gap-4 surface-card p-5 lg:p-6 md:p-5" aria-labelledby="cred-h" data-testid="credentials-form">
      <h2 id="cred-h" className="text-base font-semibold">
        بيانات الاعتماد
      </h2>
      {carrier.platform_enabled === false ? (
        <p className="text-sm text-warning" data-testid="carrier-platform-disabled">
          {carrier.name} غير مفعّلة على مستوى المنصة بعد — لا يمكن حفظ بيانات الاعتماد حتى يفعّلها دعم شروة.
        </p>
      ) : carrier.credential_source === "platform_shared" && carrier.connection !== "not_connected" ? (
        <p className="text-sm text-muted-foreground" data-testid="carrier-shared">
          يعمل الربط حالياً بحساب شروة المشترك — أدخل بيانات حسابك الخاص واحفظها لاستخدامه بدلاً منه.
        </p>
      ) : null}
      <form
        className="flex flex-col gap-4"
        noValidate
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {carrier.fields.map((f) => (
          <Field
            key={f.name}
            label={f.label}
            htmlFor={`cred-${f.name}`}
            required={f.required}
            error={errors[f.name]}
            hint={f.is_secret ? (f.has_value ? "محفوظ — اتركه فارغاً للإبقاء عليه، أو اكتب قيمة جديدة لاستبداله." : "سرّي — يُكتب مرة ولا يُعرض بعد الحفظ.") : undefined}
          >
            <input
              id={`cred-${f.name}`}
              type={f.is_secret ? "password" : "text"}
              dir="ltr"
              autoComplete={f.is_secret ? "new-password" : "off"}
              placeholder={f.is_secret && f.has_value ? "••••••••" : undefined}
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              className={`${inputClass} font-mono text-start`}
              aria-invalid={Boolean(errors[f.name])}
              data-testid={`cred-${f.name}`}
              data-secret={f.is_secret ? "true" : undefined}
            />
          </Field>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={primaryButton} disabled={saveCredentials.isPending || carrier.platform_enabled === false} data-testid="credentials-save">
            حفظ
          </button>
          <button type="button" className={outlineButton} disabled={test.isPending || carrier.connection === "not_connected"} title={carrier.connection === "not_connected" ? "احفظ بيانات الاعتماد أولاً" : undefined} onClick={runTest} data-testid="carrier-test">
            {test.isPending ? "جارٍ الاختبار…" : "اختبار الاتصال"}
          </button>
        </div>
        <p role="status" aria-live="polite" className={cn("text-sm", result ? (result.ok ? "text-success" : "text-destructive") : "sr-only")} data-testid="carrier-test-result">
          {result?.message ?? ""}
        </p>
      </form>
    </section>
  );
}

function WebhookPanel({ carrier }: { carrier: Carrier }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(carrier.webhook_url);
      toast.success("نُسخ الرابط.");
    } catch {
      toast.error("تعذّر النسخ — حدّد الرابط وانسخه يدوياً.");
    }
  };
  return (
    <section className="flex h-fit min-w-0 flex-col gap-3 surface-card p-5 lg:p-6" aria-labelledby="hook-h" data-testid="webhook-panel">
      <h2 id="hook-h" className="text-base font-semibold">
        الأحداث الواردة
      </h2>
      <p className="text-sm text-muted-foreground">أضف هذا الرابط في لوحة {carrier.name} لاستقبال تحديثات التتبع:</p>
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
        <span className="min-w-0 flex-1 break-all font-mono text-xs" dir="ltr" data-testid="webhook-url">
          <span className="text-muted-foreground">POST </span>
          {carrier.webhook_url}
        </span>
        <button type="button" onClick={() => void copy()} aria-label="نسخ الرابط" className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-muted lg:size-8" data-testid="copy-webhook">
          <Copy className="size-4" aria-hidden />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        يُوقَّع بـ <Mono className="text-foreground">{carrier.signature_header}</Mono> — السرّ محفوظ على الخادم ولا يظهر هنا.
      </p>
      <LastEvent carrier={carrier} />
    </section>
  );
}
