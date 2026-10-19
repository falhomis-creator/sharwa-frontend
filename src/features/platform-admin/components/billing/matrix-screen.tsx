"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBillingSettings, useFeatures, useMatrix, usePlans, useToggleCell } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ReadOnlyNote, toastError } from "@/features/platform-admin/components/bits";
import { groupFeatures } from "@/features/platform-admin/components/billing/feature-groups";

/**
 * `/plans/matrix` (M46 US-46.1 a2/a3): features × plans with a small switch per cell,
 * saved on toggle (optimistic, rolled back on error). Feature column sticky at the logical
 * start; the table scrolls horizontally inside its own container on a phone.
 */
export function MatrixScreen() {
  const plans = usePlans();
  const features = useFeatures();
  const matrix = useMatrix();
  const billing = useBillingSettings();
  const toggle = useToggleCell();
  const canWrite = useCanWrite("billing");

  const cells = new Map((matrix.data ?? []).map((c) => [`${c.plan_id}:${c.feature_code}`, c.is_enabled]));
  const orderedPlans = [...(plans.data ?? [])].sort((a, b) => a.display_order - b.display_order);
  const loading = plans.isLoading || features.isLoading || matrix.isLoading;
  const error = plans.error ?? features.error ?? matrix.error;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="مصفوفة الميزات" description="أي ميزة تتيحها كل باقة (PlanFeature). يُحفظ التبديل فوراً." actions={<Link href="/plans" className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-8">الباقات</Link>} />
      {billing.data && !billing.data.subscriptions_enabled ? (
        <p role="note" data-testid="subscriptions-off-note" className="rounded-lg border border-border px-4 py-3 text-sm">
          الباقات غير مفعَّلة — كل الميزات ذات <Code>requires_plan</Code> تُعتبر متاحة.{" "}
          <Link href="/billing-settings" className="text-muted-foreground underline underline-offset-4">
            المفاتيح الرئيسية
          </Link>
        </p>
      ) : null}
      {!canWrite ? <ReadOnlyNote /> : null}
      {error ? <ErrorState error={error} onRetry={() => void Promise.all([plans.refetch(), features.refetch(), matrix.refetch()])} /> : null}
      {loading ? <Skeleton className="h-96 w-full" /> : null}
      {!loading && features.data && plans.data ? (
        <div className="max-h-[75vh] overflow-auto rounded-lg border border-border" data-testid="matrix-scroll">
          <table className="w-full border-collapse text-sm" data-testid="matrix">
            <caption className="sr-only">الباقات × الميزات</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky start-0 top-0 z-[3] h-11 min-w-56 border-b border-e border-border bg-background px-3 text-start text-xs font-normal text-muted-foreground">
                  الميزة
                </th>
                {orderedPlans.map((p) => (
                  <th key={p.id} scope="col" className="sticky top-0 z-[2] h-11 border-b border-border bg-background px-3 text-center text-xs font-normal whitespace-nowrap">
                    <span className={cn("block text-foreground", !p.is_active && "text-muted-foreground")}>{p.name}</span>
                    <Code className="text-muted-foreground">{p.code}</Code>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupFeatures(features.data).map((g) => (
                <Fragment key={g.key}>
                  <tr>
                    <th scope="colgroup" colSpan={orderedPlans.length + 1} className="sticky start-0 h-9 border-b border-border bg-muted/40 px-3 text-start text-xs font-medium text-muted-foreground">
                      {g.label}
                    </th>
                  </tr>
                  {g.items.map((f) => {
                    const free = !f.requires_plan;
                    return (
                      <tr key={f.code} data-testid="matrix-row" data-code={f.code} data-free={free ? "true" : "false"} className={cn(free && "text-muted-foreground")}>
                        <th scope="row" className="sticky start-0 z-[1] h-11 border-b border-e border-border bg-background px-3 text-start font-normal">
                          <span className="flex flex-col">
                            <span className={free ? "text-muted-foreground" : "text-foreground"}>{f.name}</span>
                            <span className="flex flex-wrap items-center gap-x-2">
                              <Code className="text-muted-foreground">{f.code}</Code>
                              {free ? <span className="text-[11px]">متاحة لكل الباقات — لا أثر للمفاتيح</span> : null}
                              {!f.is_active_globally ? <span className="text-[11px] text-destructive">موقوفة عالمياً</span> : null}
                            </span>
                          </span>
                        </th>
                        {orderedPlans.map((p) => {
                          const on = cells.get(`${p.id}:${f.code}`) ?? false;
                          return (
                            <td key={p.id} className="h-11 border-b border-border px-3 text-center">
                              <span className="inline-flex size-11 items-center justify-center lg:size-8">
                                <Switch
                                  checked={on}
                                  disabled={!canWrite}
                                  aria-label={`${f.name} في ${p.name}`}
                                  data-testid={`cell-${p.code}-${f.code}`}
                                  onCheckedChange={(v) => toggle.mutate({ plan_id: p.id, feature_code: f.code, is_enabled: v }, { onError: (err) => toastError(err, "تعذّر حفظ الخلية — أُعيدت كما كانت.") })}
                                />
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
