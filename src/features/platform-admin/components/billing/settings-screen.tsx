"use client";

import { useState } from "react";
import Link from "next/link";
import { parseAsString, useQueryStates } from "nuqs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBillingSettings, useFeatures, usePatchBillingSettings, useResolve } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ConfirmDialog, ReadOnlyNote, StatusText, toastError, toastResult } from "@/features/platform-admin/components/bits";
import { FeatureSelect } from "@/features/platform-admin/components/billing/overrides-screen";
import { Field, StorePicker, clientFromSchema } from "@/features/platform-admin/components/billing/ui";
import { DECIDED_BY_STEP, RESOLUTION_STEPS, type ClientOption, type DecidedBy } from "@/features/platform-admin/schemas";

/**
 * `/billing-settings` (M46 US-46.4, FR-46.04/05/06, M20 US-20.3 a3/a4): the two master
 * switches, the resolution order as a numbered list, and «افحص متجراً» — the server's
 * verdict for one feature × one store, with the step that decided it highlighted.
 */
type Key = "subscriptions_enabled" | "commission_enabled";

const DECIDED_TEXT: Record<DecidedBy, string> = {
  override: "استثناء المتجر",
  global_kill: "الإيقاف العالمي",
  no_plan_required: "لا تتطلب باقة",
  subscriptions_disabled: "الباقات غير مفعّلة",
  plan_feature: "خلية الباقة الحالية",
  plan_feature_missing: "غياب الميزة عن الباقة الحالية",
};

export function BillingSettingsScreen() {
  const settings = useBillingSettings();
  const patch = usePatchBillingSettings();
  const canWrite = useCanWrite("billing");
  const [pending, setPending] = useState<{ key: Key; value: boolean } | null>(null);
  const s = settings.data;

  async function apply() {
    if (!pending) return;
    try {
      const next = await patch.mutateAsync({ [pending.key]: pending.value });
      toastResult({
        detail: `الباقات: ${next.subscriptions_enabled ? "مفعّلة" : "متوقفة"} · العمولة: ${next.commission_enabled ? "مفعّلة" : "متوقفة"}.`,
      });
      setPending(null);
    } catch (err) {
      toastError(err);
    }
  }

  const impact = (() => {
    if (!pending || !s) return null;
    const lines: string[] = [];
    if (pending.key === "subscriptions_enabled") {
      if (pending.value) {
        lines.push("ستُفعَّل بوابة الخطط على كل المتاجر: الميزات ذات requires_plan تُحسم من خلية الباقة الحالية.");
        if (s.stores_without_subscription > 0) lines.push(`${s.stores_without_subscription} متجراً بلا اشتراك ستُسند لها الباقة «${s.default_free_plan ?? "—"}».`);
      } else lines.push("تُعتبر كل الميزات ذات requires_plan متاحة لكل المتاجر.");
    } else lines.push(pending.value ? "ستبدأ سجلات العمولة على الطلبات الجديدة." : "تتوقف سجلات العمولة الجديدة؛ القائمة تبقى في المستحقات.");
    lines.push("لا يؤثر بأثر رجعي على المتاجر المسجَّلة.");
    return lines;
  })();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="المفاتيح الرئيسية والحسم" description={`PlatformBillingSettings — كلاهما متوقف افتراضياً.${s ? ` آخر تغيير: ${formatDateTime(s.updated_at)}.` : ""}`} />
      {!canWrite ? <ReadOnlyNote /> : null}
      {settings.error ? <ErrorState error={settings.error} onRetry={() => void settings.refetch()} /> : null}

      <section aria-label="المفتاحان" className="flex flex-col divide-y divide-border rounded-lg border border-border" data-testid="master-switches">
        {settings.isLoading ? <Skeleton className="m-4 h-16" /> : null}
        {s
          ? (
              [
                ["subscriptions_enabled", "الباقات والاشتراكات", "تفعيل بوابة الخطط: الميزات المشروطة بباقة تُحسم من مصفوفة الباقات."] as const,
                ["commission_enabled", "عمولة المبيعات", "تسجيل عمولة المنصة على كل طلب حسب باقة المتجر."] as const,
              ] satisfies ReadonlyArray<readonly [Key, string, string]>
            ).map(([key, title, desc]) => (
              <label key={key} className="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{title}</span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                  <Code className="text-muted-foreground">{key}</Code>
                </span>
                <span className="flex items-center gap-3">
                  {s[key] ? <StatusText tone="success">مفعّل</StatusText> : <StatusText tone="muted">متوقف</StatusText>}
                  <Switch checked={s[key]} disabled={!canWrite || patch.isPending} onCheckedChange={(v) => setPending({ key, value: v })} data-testid={`switch-${key}`} aria-label={title} />
                </span>
              </label>
            ))
          : null}
      </section>

      <ResolutionTool />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending ? `${pending.value ? "تفعيل" : "إيقاف"} ${pending.key === "subscriptions_enabled" ? "الباقات" : "العمولة"}` : ""}
        destructive={Boolean(pending?.value)}
        impact={impact ? <span className="flex flex-col gap-1">{impact.map((l) => <span key={l}>{l}</span>)}</span> : null}
        confirmLabel={pending?.value ? "تفعيل" : "إيقاف"}
        pending={patch.isPending}
        onConfirm={() => void apply()}
        testId="switch-dialog"
      />
    </div>
  );
}

const parsers = { feature: parseAsString.withDefault(""), schema: parseAsString.withDefault("") };

function ResolutionTool() {
  const [q, setQ] = useQueryStates(parsers, { history: "replace" });
  const features = useFeatures();
  const store: ClientOption[] = q.schema ? [clientFromSchema(q.schema)] : [];
  const resolve = useResolve(q.feature, q.schema);
  const r = resolve.data;
  const step = r ? DECIDED_BY_STEP[r.decided_by] : null;
  const featureName = features.data?.find((f) => f.code === q.feature)?.name;

  return (
    <section aria-labelledby="resolve-h" className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <h2 id="resolve-h" className="text-sm font-medium">
          ترتيب الحسم — «هل الميزة متاحة لهذا المتجر؟»
        </h2>
        <ol className="flex flex-col gap-1.5 text-sm" data-testid="resolution-steps">
          {RESOLUTION_STEPS.map((text, i) => (
            <li key={text} data-step={i + 1} data-active={step === i + 1 ? "true" : "false"} className={cn("flex gap-3 rounded-md border px-3 py-2", step === i + 1 ? "border-foreground" : "border-transparent text-muted-foreground")}>
              <Mono className="text-foreground">{i + 1}</Mono>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">الحسم يجري في الخادم فقط؛ هذه الصفحة تعرضه ولا تعيد حسابه.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4" data-testid="inspect-tool">
        <h2 className="text-sm font-medium">افحص متجراً</h2>
        <Field label="الميزة" htmlFor="inspect-feature">
          <FeatureSelect id="inspect-feature" features={features.data ?? []} value={q.feature} onChange={(v) => void setQ({ feature: v || null })} testId="inspect-feature" />
        </Field>
        <Field label="المتجر" htmlFor="inspect-store">
          <StorePicker id="inspect-store" value={store} onChange={(v) => void setQ({ schema: v[0]?.schema_name ?? null })} testId="inspect-store" />
        </Field>
        {resolve.isFetching && !r ? <Skeleton className="h-12" /> : null}
        {resolve.error ? <ErrorState error={resolve.error} /> : null}
        {r && q.feature && q.schema ? (
          <div role="status" data-testid="resolve-result" data-enabled={r.enabled ? "true" : "false"} data-decided-by={r.decided_by} className="flex flex-col gap-1.5 rounded-md bg-muted/40 px-3 py-3 text-sm">
            <span className="flex flex-wrap items-center gap-2">
              {r.enabled ? <StatusText tone="success">متاحة</StatusText> : <StatusText tone="destructive">غير متاحة</StatusText>}
              <span>
                «{featureName ?? r.feature_code}» لدى <Code>{r.schema_name}</Code>
              </span>
            </span>
            <span className="text-muted-foreground">
              حسمتها الخطوة <Mono className="text-foreground">{step}</Mono>: {DECIDED_TEXT[r.decided_by]}.
            </span>
            <span className="text-muted-foreground">الباقة الحالية: {r.plan ?? "بلا اشتراك"}</span>
            <Link href={`/stores/${encodeURIComponent(r.schema_name)}`} className="self-start text-xs underline underline-offset-4">
              ميزات المتجر كلها
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
