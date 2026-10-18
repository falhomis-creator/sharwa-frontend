"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { AccessGate } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useCoupon, useDeleteCoupon, useSaveCoupon } from "@/features/marketing/api";
import { applyServerErrors, BackToHub, CategorySelect, ConfirmDialog, errorMessage, FormActions, FormSkeleton, fromLocalInput, ProductPicker, StateText, toLocalInput } from "@/features/marketing/components/shared";
import { APPLY_TO, APPLY_TO_LABELS, couponInputSchema, couponState, DISCOUNT_TYPE_LABELS, DISCOUNT_TYPES, type Coupon, type CouponInput } from "@/features/marketing/schemas";
import { formatDateTime, formatNumber } from "@/lib/format";

/**
 * US-13.2.1 — create/edit a coupon. RHF + Zod (client), then DRF field errors under their
 * fields (FR-13.02). An influencer-linked coupon keeps its code locked (M14 owns it).
 */
export function CouponFormScreen({ id }: { id: number | null }) {
  return (
    <AccessGate feature="coupon" permission="discounts.apply">
      {id === null ? <CouponForm coupon={null} /> : <EditLoader id={id} />}
    </AccessGate>
  );
}

function EditLoader({ id }: { id: number }) {
  const q = useCoupon(id);
  if (q.isLoading) return <div className="flex flex-col gap-5"><BackToHub href="/dashboard/marketing/coupons" label="الكوبونات" /><FormSkeleton /></div>;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <CouponForm coupon={q.data} />;
}

function toInput(c: Coupon | null): CouponInput {
  return {
    code: c?.code ?? "",
    discount_type: c?.discount_type ?? "percent",
    discount_value: c?.discount_value ?? "",
    apply_to: c?.apply_to ?? "all",
    category_id: c?.category?.id ? String(c.category.id) : "",
    product_id: c?.product?.id ? String(c.product.id) : "",
    min_order_amount: c?.min_order_amount ?? "",
    max_uses: c?.max_uses === null || c?.max_uses === undefined ? "" : String(c.max_uses),
    start_date: toLocalInput(c?.start_date),
    expires_at: toLocalInput(c?.expires_at),
    is_active: c?.is_active ?? true,
  };
}

function CouponForm({ coupon }: { coupon: Coupon | null }) {
  const router = useRouter();
  const { canPermission } = useAccess();
  const canManage = canPermission("discounts.manage");
  const readOnly = !canManage;
  const save = useSaveCoupon(coupon?.id ?? null);
  const remove = useDeleteCoupon();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CouponInput>({ resolver: zodResolver(couponInputSchema), defaultValues: toInput(coupon), disabled: readOnly || undefined });
  const { register, control, formState: { errors } } = form;
  const applyTo = useWatch({ control, name: "apply_to" });
  const discountType = useWatch({ control, name: "discount_type" });
  const locked = !!coupon?.influencer;

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    const body = {
      code: v.code.toUpperCase(),
      discount_type: v.discount_type,
      discount_value: v.discount_value,
      apply_to: v.apply_to,
      category_id: v.apply_to === "category" ? Number(v.category_id) : null,
      product_id: v.apply_to === "product" ? Number(v.product_id) : null,
      min_order_amount: v.min_order_amount || "",
      max_uses: v.max_uses || "",
      start_date: fromLocalInput(v.start_date ?? "") ?? "",
      expires_at: fromLocalInput(v.expires_at ?? "") ?? "",
      is_active: v.is_active,
    };
    try {
      const saved = await save.mutateAsync(body);
      toast.success(coupon ? "حُفظ الكوبون" : "أُنشئ الكوبون");
      if (!coupon) router.replace(`/dashboard/marketing/coupons/${saved.id}`);
      else form.reset(toInput(saved));
    } catch (err) {
      if (!applyServerErrors(form, err)) setFormError(errorMessage(err));
    }
  });

  return (
    <div className="flex flex-col gap-5" data-testid="coupon-form">
      <BackToHub href="/dashboard/marketing/coupons" label="الكوبونات" />
      <PageHeader
        title={coupon ? coupon.code : "كوبون جديد"}
        eyebrow={coupon ? `#${coupon.id}` : undefined}
        description={coupon ? undefined : "كود يدخله العميل عند الدفع ليحصل على الخصم."}
        actions={coupon ? <StateText state={couponState(coupon)} /> : null}
      />
      {coupon ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-border pb-4 text-sm md:grid-cols-4" data-testid="coupon-usage">
          <div><dt className="text-xs text-muted-foreground">مرات الاستخدام</dt><dd><Mono>{formatNumber(coupon.used_count)}</Mono>{coupon.max_uses !== null ? <Mono className="text-muted-foreground">/{formatNumber(coupon.max_uses)}</Mono> : <span className="ms-1 text-xs text-muted-foreground">غير محدود</span>}</dd></div>
          <div><dt className="text-xs text-muted-foreground">أُنشئ</dt><dd className="text-xs">{formatDateTime(coupon.created_at)}</dd></div>
          {coupon.influencer ? <div className="col-span-2"><dt className="text-xs text-muted-foreground">مرتبط بالمؤثر</dt><dd><Link href={`/dashboard/influencers/${coupon.influencer.id}`} className="hover:underline">{coupon.influencer.name}</Link><span className="ms-2 text-xs text-muted-foreground">الكود يُدار من صفحة المؤثرين</span></dd></div> : null}
        </dl>
      ) : null}
      {readOnly ? <p className="text-sm text-muted-foreground">لديك صلاحية التطبيق فقط — التعديل يحتاج «إدارة الخصومات».</p> : null}

      <form onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-5">
        <Field label="الكود" htmlFor="code" error={errors.code?.message} required hint={locked ? "كود المؤثر لا يُغيَّر." : "أحرف لاتينية وأرقام، يُحفظ بأحرف كبيرة."}>
          <input id="code" {...register("code")} className={`${inputClass} font-mono uppercase read-only:bg-muted read-only:text-muted-foreground`} dir="ltr" autoComplete="off" readOnly={locked} aria-readonly={locked || undefined} aria-invalid={!!errors.code} data-testid="code" />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="نوع الخصم" htmlFor="discount_type" error={errors.discount_type?.message} required>
            <NativeSelect id="discount_type" {...register("discount_type")} className="h-11 lg:h-9">
              {DISCOUNT_TYPES.map((t) => <option key={t} value={t}>{DISCOUNT_TYPE_LABELS[t]}</option>)}
            </NativeSelect>
          </Field>
          <Field label={discountType === "percent" ? "النسبة %" : "المبلغ (ر.س)"} htmlFor="discount_value" error={errors.discount_value?.message} required hint={discountType === "percent" ? "بين 1 و100." : undefined}>
            <input id="discount_value" {...register("discount_value")} inputMode="decimal" className={numericInputClass} dir="ltr" aria-invalid={!!errors.discount_value} data-testid="discount_value" />
          </Field>
        </div>
        <Field label="يطبَّق على" htmlFor="apply_to" error={errors.apply_to?.message} required>
          <NativeSelect id="apply_to" {...register("apply_to")} className="h-11 lg:h-9" data-testid="apply_to">
            {APPLY_TO.map((a) => <option key={a} value={a}>{APPLY_TO_LABELS[a]}</option>)}
          </NativeSelect>
        </Field>
        {applyTo === "category" ? <Controller control={control} name="category_id" render={({ field }) => <CategorySelect id="category_id" value={field.value ?? ""} onChange={field.onChange} error={errors.category_id?.message} required />} /> : null}
        {applyTo === "product" ? <Controller control={control} name="product_id" render={({ field }) => <ProductPicker id="product_id" value={field.value ?? ""} onChange={field.onChange} error={errors.product_id?.message} required />} /> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="الحد الأدنى للطلب (ر.س)" htmlFor="min_order_amount" error={errors.min_order_amount?.message} hint="اتركه فارغاً بلا حد.">
            <input id="min_order_amount" {...register("min_order_amount")} inputMode="decimal" className={numericInputClass} dir="ltr" aria-invalid={!!errors.min_order_amount} />
          </Field>
          <Field label="الحد الأقصى للاستخدام" htmlFor="max_uses" error={errors.max_uses?.message} hint="فارغ = غير محدود.">
            <input id="max_uses" {...register("max_uses")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.max_uses} data-testid="max_uses" />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="يبدأ في" htmlFor="start_date" error={errors.start_date?.message}>
            <input id="start_date" type="datetime-local" {...register("start_date")} className={inputClass} dir="ltr" />
          </Field>
          <Field label="ينتهي في" htmlFor="expires_at" error={errors.expires_at?.message} hint="فارغ = بلا نهاية.">
            <input id="expires_at" type="datetime-local" {...register("expires_at")} className={inputClass} dir="ltr" aria-invalid={!!errors.expires_at} data-testid="expires_at" />
          </Field>
        </div>
        <Controller control={control} name="is_active" render={({ field }) => <ToggleRow id="is_active" label="فعّال" description="الكوبون غير الفعّال لا يُقبل عند الدفع مهما كانت صلاحيته." checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} testId="is_active" />} />
        {!readOnly ? (
          <FormActions
            pending={save.isPending}
            cancelHref="/dashboard/marketing/coupons"
            error={formError}
            extra={coupon && !locked ? <Button type="button" variant="ghost" className="ms-auto h-11 text-destructive lg:h-9" onClick={() => setConfirmDelete(true)} data-testid="delete">حذف</Button> : null}
          />
        ) : null}
      </form>
      {coupon ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`حذف الكوبون ${coupon.code}؟`}
          description="لن يُقبل بعد الآن؛ الطلبات التي استخدمته لا تتأثر."
          confirmLabel="حذف"
          destructive
          pending={remove.isPending}
          onConfirm={() => remove.mutate(coupon.id, { onSuccess: () => { toast.success("حُذف الكوبون"); router.replace("/dashboard/marketing/coupons"); }, onError: (e) => toast.error(errorMessage(e)) })}
          testId="delete-dialog"
        />
      ) : null}
    </div>
  );
}
