"use client";

import { useState } from "react";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/schemas/money";
import { isApiError } from "@/lib/api-error";
import { useDeletePlan, usePlans, useSavePlan } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ConfirmDialog, ReadOnlyNote, StatusText, toastError } from "@/features/platform-admin/components/bits";
import { BTN, Field, INPUT, Limit, SkeletonRows, Table, Td, Th, YesNo } from "@/features/platform-admin/components/billing/ui";
import {
  BILLING_INTERVALS,
  BILLING_INTERVAL_LABELS,
  COMMISSION_TYPES,
  COMMISSION_TYPE_LABELS,
  planInputSchema,
  type Plan,
  type PlanInput,
} from "@/features/platform-admin/schemas";
import { toast } from "sonner";

/**
 * `/plans` (M46 US-46.1, M20 US-20.3 a1): the plans as one dense table + a side-sheet
 * editor with exactly the model fields (FR-46.02). No plan cards, no «الأكثر شيوعاً».
 */
export function PlansScreen() {
  const plans = usePlans();
  const canWrite = useCanWrite("billing");
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const [deleteError, setDeleteError] = useState<{ detail: string; code: string } | null>(null);
  const del = useDeletePlan();

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success(`حُذفت الباقة «${deleting.name}».`);
      setDeleting(null);
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        setDeleteError({ detail: err.userMessage, code: deleting.code });
        setDeleting(null);
      } else toastError(err);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="الباقات"
        description="الأسعار والحدود والعمولة لكل باقة. ميزات كل باقة في المصفوفة."
        actions={
          <>
            <Link href="/plans/matrix" className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-8">
              مصفوفة الميزات
            </Link>
            <Button className={BTN} disabled={!canWrite} onClick={() => setEditing("new")} data-testid="plan-new">
              باقة جديدة
            </Button>
          </>
        }
      />
      {!canWrite ? <ReadOnlyNote /> : null}
      {deleteError ? (
        <div role="alert" data-testid="plan-delete-error" className="flex flex-col gap-2 rounded-lg border border-destructive/40 p-4 text-sm">
          <p className="text-destructive">{deleteError.detail}</p>
          <Link href={`/subscriptions?plan=${encodeURIComponent(deleteError.code)}&current=true`} className="self-start underline underline-offset-4">
            نقل إلى باقة أخرى
          </Link>
        </div>
      ) : null}
      {plans.error ? <ErrorState error={plans.error} onRetry={() => void plans.refetch()} /> : null}
      {plans.data && plans.data.length === 0 ? (
        <EmptyState title="لا باقات — أنشئ الباقة المجانية الافتراضية أولاً" action={canWrite ? <Button className={BTN} onClick={() => setEditing("new")}>باقة جديدة</Button> : undefined} />
      ) : (
        <Table caption="الباقات" testId="plans-table">
          <thead>
            <tr>
              <Th>الكود</Th>
              <Th>الاسم</Th>
              <Th numeric>السعر</Th>
              <Th>الفترة</Th>
              <Th numeric>العمولة</Th>
              <Th numeric>حد المنتجات</Th>
              <Th numeric>حد الطلبات/شهر</Th>
              <Th>افتراضية مجانية</Th>
              <Th>الحالة</Th>
              <Th numeric>الترتيب</Th>
              <Th numeric>اشتراكات حالية</Th>
              <Th>
                <span className="sr-only">إجراءات</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {plans.isLoading ? <SkeletonRows cols={12} /> : null}
            {plans.data?.map((p) => (
              <tr key={p.id} data-testid="plan-row" data-code={p.code}>
                <Td>
                  <Code>{p.code}</Code>
                </Td>
                <Td className="whitespace-nowrap font-medium">{p.name}</Td>
                <Td numeric>
                  <Money value={p.display_price} />
                </Td>
                <Td className="whitespace-nowrap">{BILLING_INTERVAL_LABELS[p.billing_interval]}</Td>
                <Td numeric>
                  <bdi>
                    <Mono>{p.display_commission}</Mono>
                  </bdi>
                </Td>
                <Td numeric>
                  <Limit value={p.max_products} />
                </Td>
                <Td numeric>
                  <Limit value={p.max_orders_per_month} />
                </Td>
                <Td>
                  <YesNo value={p.is_default_free} />
                </Td>
                <Td>{p.is_active ? <StatusText tone="success">نشطة</StatusText> : <StatusText tone="muted">غير نشطة</StatusText>}</Td>
                <Td numeric>
                  <Mono>{p.display_order}</Mono>
                </Td>
                <Td numeric>
                  <Link href={`/subscriptions?plan=${encodeURIComponent(p.code)}&current=true`} className="hover:underline">
                    <Mono>{p.current_subscriptions}</Mono>
                  </Link>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" className={BTN} onClick={() => setEditing(p)} data-testid="plan-edit">
                      {canWrite ? "تعديل" : "عرض"}
                    </Button>
                    <Button variant="ghost" className={`${BTN} text-destructive`} disabled={!canWrite} onClick={() => { setDeleteError(null); setDeleting(p); }} data-testid="plan-delete">
                      حذف
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <PlanSheet key={editing === "new" ? "new" : (editing?.id ?? "none")} plan={editing} canWrite={canWrite} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`حذف الباقة «${deleting?.name ?? ""}»`}
        impact="تُحذف الباقة وخلاياها في المصفوفة. الباقة التي عليها اشتراكات حالية لا تُحذف."
        confirmLabel="حذف الباقة"
        destructive
        pending={del.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

type PlanForm = z.input<typeof planInputSchema>;

function toForm(p: Plan | null): PlanForm {
  if (!p)
    return { code: "", name: "", description: "", is_free: false, price: "0.00", currency: "SAR", billing_interval: "monthly", commission_type: "none", commission_value: "0.00", max_products: "", max_orders_per_month: "", is_active: true, is_default_free: false, display_order: 10 };
  return {
    code: p.code,
    name: p.name,
    description: p.description,
    is_free: p.is_free,
    price: p.price,
    currency: p.currency,
    billing_interval: p.billing_interval,
    commission_type: p.commission_type,
    commission_value: p.commission_value,
    max_products: p.max_products === null ? "" : String(p.max_products),
    max_orders_per_month: p.max_orders_per_month === null ? "" : String(p.max_orders_per_month),
    is_active: p.is_active,
    is_default_free: p.is_default_free,
    display_order: p.display_order,
  };
}

function PlanSheet({ plan, canWrite, onClose }: { plan: Plan | "new" | null; canWrite: boolean; onClose: () => void }) {
  const existing = plan && plan !== "new" ? plan : null;
  const save = useSavePlan(existing?.id ?? null);
  const form = useForm<PlanForm, unknown, PlanInput>({ resolver: zodResolver(planInputSchema), defaultValues: toForm(existing) });
  const { errors } = form.formState;
  const [isFree] = useWatch({ control: form.control, name: ["is_free"] });

  const submit = form.handleSubmit(async (v) => {
    try {
      const saved = await save.mutateAsync(v);
      toast.success(existing ? `حُفظت الباقة «${saved.name}».` : `أُنشئت الباقة «${saved.name}».`);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.fields) {
        for (const [k, msgs] of Object.entries(err.fields)) form.setError(k as keyof PlanForm, { message: msgs[0] });
      }
      toastError(err);
    }
  });

  const sw = (name: "is_free" | "is_active" | "is_default_free", label: string) => (
    <label className="flex min-h-11 items-center justify-between gap-3 lg:min-h-8">
      <span className="text-sm">{label}</span>
      <Controller control={form.control} name={name} render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={(v) => { field.onChange(v); if (name !== "is_active") void form.trigger(["is_default_free", "price"]); }} disabled={!canWrite} data-testid={`plan-${name}`} />} />
    </label>
  );

  return (
    <Sheet open={plan !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-lg" data-testid="plan-sheet">
        <SheetHeader>
          <SheetTitle>{existing ? `الباقة «${existing.name}»` : "باقة جديدة"}</SheetTitle>
          <SheetDescription>الحقول كما في نموذج Plan — لا حقول إضافية.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4 px-4" id="plan-form">
          <fieldset disabled={!canWrite} className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="الكود" htmlFor="code" error={errors.code?.message}>
                <Input id="code" dir="ltr" className={`${INPUT} font-mono`} readOnly={Boolean(existing)} {...form.register("code")} />
              </Field>
              <Field label="الاسم" htmlFor="name" error={errors.name?.message}>
                <Input id="name" className={INPUT} {...form.register("name")} />
              </Field>
            </div>
            <Field label="الوصف" htmlFor="description" error={errors.description?.message}>
              <Textarea id="description" rows={2} {...form.register("description")} />
            </Field>
            {sw("is_free", "مجانية")}
            <div className="grid grid-cols-2 gap-3">
              <Field label="السعر" htmlFor="price" error={errors.price?.message}>
                <Input id="price" dir="ltr" inputMode="decimal" className={`${INPUT} font-mono`} readOnly={Boolean(isFree)} {...form.register("price")} />
              </Field>
              <Field label="العملة" htmlFor="currency">
                <NativeSelect id="currency" className={INPUT} {...form.register("currency")}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABELS[c]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="فترة الفوترة" htmlFor="billing_interval">
              <NativeSelect id="billing_interval" className={INPUT} {...form.register("billing_interval")}>
                {BILLING_INTERVALS.map((i) => (
                  <option key={i} value={i}>
                    {BILLING_INTERVAL_LABELS[i]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="نوع العمولة" htmlFor="commission_type">
                <NativeSelect id="commission_type" className={INPUT} {...form.register("commission_type")}>
                  {COMMISSION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {COMMISSION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="قيمة العمولة" htmlFor="commission_value" error={errors.commission_value?.message}>
                <Input id="commission_value" dir="ltr" inputMode="decimal" className={`${INPUT} font-mono`} {...form.register("commission_value")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="حد المنتجات" htmlFor="max_products" error={errors.max_products?.message} hint="فارغ = بلا حد">
                <Input id="max_products" dir="ltr" inputMode="numeric" className={`${INPUT} font-mono`} {...form.register("max_products")} />
              </Field>
              <Field label="حد الطلبات/شهر" htmlFor="max_orders_per_month" error={errors.max_orders_per_month?.message} hint="فارغ = بلا حد">
                <Input id="max_orders_per_month" dir="ltr" inputMode="numeric" className={`${INPUT} font-mono`} {...form.register("max_orders_per_month")} />
              </Field>
            </div>
            <Field label="ترتيب العرض" htmlFor="display_order" error={errors.display_order?.message}>
              <Input id="display_order" dir="ltr" inputMode="numeric" className={`${INPUT} font-mono`} {...form.register("display_order")} />
            </Field>
            {sw("is_active", "نشطة")}
            <div className="flex flex-col gap-1">
              {sw("is_default_free", "الباقة المجانية الافتراضية")}
              {errors.is_default_free ? (
                <p className="text-xs text-destructive" data-testid="error-is_default_free">
                  {errors.is_default_free.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">تُسند للمتاجر الجديدة عند تفعيل الباقات. واحدة فقط.</p>
              )}
            </div>
          </fieldset>
        </form>
        <SheetFooter className="flex-row justify-end border-t border-border">
          <Button variant="outline" className={BTN} onClick={onClose}>
            إغلاق
          </Button>
          {canWrite ? (
            <Button type="submit" form="plan-form" className={BTN} disabled={save.isPending} data-testid="plan-save">
              {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
