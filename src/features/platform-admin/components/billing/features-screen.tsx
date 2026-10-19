"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { useFeatures, usePatchFeature } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ConfirmDialog, ReadOnlyNote, toastError } from "@/features/platform-admin/components/bits";
import { groupFeatures } from "@/features/platform-admin/components/billing/feature-groups";
import { SkeletonRows, Table, Td, Th } from "@/features/platform-admin/components/billing/ui";
import type { Feature } from "@/features/platform-admin/schemas";

/**
 * `/features` (M46 US-46.2): the catalogue by module group with the global kill switch
 * and `requires_plan`. Both risky directions pass a confirmation that states the effect.
 */
type Pending = { feature: Feature; field: "is_active_globally" | "requires_plan"; value: boolean };

export function FeaturesScreen() {
  const features = useFeatures();
  const patch = usePatchFeature();
  const canWrite = useCanWrite("billing");
  const [pending, setPending] = useState<Pending | null>(null);

  async function apply(p: Pending) {
    try {
      await patch.mutateAsync({ code: p.feature.code, [p.field]: p.value });
      toast.success(
        p.field === "is_active_globally"
          ? `«${p.feature.name}»: ${p.value ? "أُعيد تشغيلها لكل المنصة" : "أُوقفت لكل المنصة"}.`
          : `«${p.feature.name}»: ${p.value ? "تتطلب باقة" : "متاحة لكل الباقات"}.`,
      );
      setPending(null);
    } catch (err) {
      toastError(err);
    }
  }

  // Risky directions confirm; the safe ones (re-enable, drop requires_plan) apply directly.
  const request = (p: Pending) => {
    const risky = (p.field === "is_active_globally" && !p.value) || (p.field === "requires_plan" && p.value);
    if (risky) setPending(p);
    else void apply(p);
  };

  const killing = pending?.field === "is_active_globally";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الميزات والإيقاف الطارئ" description="مفاتيح الميزات كما يرسلها الخادم، مجمَّعة بمجموعات الشريط الجانبي." />
      {!canWrite ? <ReadOnlyNote /> : null}
      {features.error ? <ErrorState error={features.error} onRetry={() => void features.refetch()} /> : null}
      <Table caption="الميزات" testId="features-table">
        <thead>
          <tr>
            <Th>الميزة</Th>
            <Th>الكود</Th>
            <Th>مفعّلة عالمياً</Th>
            <Th>تتطلب باقة</Th>
            <Th numeric>الاستثناءات</Th>
            <Th numeric>باقات تتيحها</Th>
          </tr>
        </thead>
        <tbody>
          {features.isLoading ? <SkeletonRows cols={6} rows={8} /> : null}
          {features.data
            ? groupFeatures(features.data).map((g) => (
                <Fragment key={g.key}>
                  <tr>
                    <th scope="colgroup" colSpan={6} className="h-9 border-b border-border bg-muted/40 px-3 text-start text-xs font-medium text-muted-foreground">
                      {g.label}
                    </th>
                  </tr>
                  {g.items.map((f) => (
                    <tr key={f.code} data-testid="feature-row" data-code={f.code}>
                      <Td className="font-medium">
                        {f.name}
                        {!f.is_active_globally ? <span className="ms-2 text-xs text-destructive">موقوفة</span> : null}
                      </Td>
                      <Td>
                        <Code>{f.code}</Code>
                      </Td>
                      <Td>
                        <span className="inline-flex size-11 items-center justify-center lg:size-8">
                          <Switch
                            checked={f.is_active_globally}
                            disabled={!canWrite || patch.isPending}
                            aria-label={`${f.name} — مفعّلة عالمياً`}
                            data-testid={`kill-${f.code}`}
                            onCheckedChange={(v) => request({ feature: f, field: "is_active_globally", value: v })}
                          />
                        </span>
                      </Td>
                      <Td>
                        <span className="inline-flex size-11 items-center justify-center lg:size-8">
                          <Switch
                            checked={f.requires_plan}
                            disabled={!canWrite || patch.isPending}
                            aria-label={`${f.name} — تتطلب باقة`}
                            data-testid={`requires-${f.code}`}
                            onCheckedChange={(v) => request({ feature: f, field: "requires_plan", value: v })}
                          />
                        </span>
                      </Td>
                      <Td numeric>
                        {f.override_count ? (
                          <Link href={`/features/overrides?feature=${encodeURIComponent(f.code)}`} className="hover:underline">
                            <Mono>{f.override_count}</Mono>
                          </Link>
                        ) : (
                          <Mono className="text-muted-foreground">0</Mono>
                        )}
                      </Td>
                      <Td numeric>
                        <Mono className={f.plans_enabled ? "" : "text-muted-foreground"}>{f.plans_enabled}</Mono>
                      </Td>
                    </tr>
                  ))}
                </Fragment>
              ))
            : null}
        </tbody>
      </Table>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        testId={killing ? "kill-dialog" : "requires-dialog"}
        title={killing ? `إيقاف «${pending?.feature.name ?? ""}» لكل المنصة` : `«${pending?.feature.name ?? ""}» تتطلب باقة`}
        destructive={killing}
        impact={
          killing
            ? "سيُوقف لكل التجار فوراً إلا من له استثناء صريح."
            : pending && pending.feature.plans_enabled === 0
              ? "ستُحجَب عن الجميع عند تفعيل الباقات — لا باقة تتيحها في المصفوفة."
              : "ستُحجَب عن المتاجر بلا صف PlanFeature صريح عند تفعيل الباقات."
        }
        confirmLabel={killing ? "أوقف الميزة" : "اجعلها تتطلب باقة"}
        pending={patch.isPending}
        onConfirm={() => pending && void apply(pending)}
      >
        {killing && pending ? (
          pending.feature.enabled_override_schemas.length ? (
            <div className="flex flex-col gap-1 text-sm" data-testid="kill-survivors">
              <p className="text-muted-foreground">تبقى تعمل لدى هذه المتاجر (استثناء مفعّل):</p>
              <ul className="flex flex-wrap gap-1.5">
                {pending.feature.enabled_override_schemas.map((s) => (
                  <li key={s} className="rounded-md border border-border px-2 py-0.5">
                    <Code>{s}</Code>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="kill-survivors">لا متجر له استثناء مفعّل — ستتوقف لدى الجميع.</p>
          )
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
