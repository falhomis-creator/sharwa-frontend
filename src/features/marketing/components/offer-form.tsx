"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { AccessGate } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useDeleteOffer, useOffer, useSaveOffer } from "@/features/marketing/api";
import { applyServerErrors, BackToHub, CategorySelect, ConfirmDialog, errorMessage, FormActions, FormSkeleton, fromLocalInput, ProductPicker, StateText, toLocalInput } from "@/features/marketing/components/shared";
import { hasImageExtension, IMAGE_EXTENSIONS_MESSAGE } from "@/features/organization/schemas";
import { BUY_CONDITION_LABELS, BUY_CONDITIONS, DISCOUNT_TYPE_LABELS, DISCOUNT_TYPES, OFFER_TYPE_LABELS, OFFER_TYPES, offerInputSchema, offerState, type Offer, type OfferInput } from "@/features/marketing/schemas";
import { formatDate } from "@/lib/format";

/**
 * US-13.2.2 — create/edit an offer. Fields change with `offer_type` (hidden, not disabled);
 * an attached image goes as multipart; the right column previews the storefront's
 * `promotional_offers` card so the merchant sees what the shopper sees.
 */
const MAX_IMAGE = 5 * 1024 * 1024;

export function OfferFormScreen({ id }: { id: number | null }) {
  return (
    <AccessGate feature="promotions" permission="discounts.apply">
      {id === null ? <OfferForm offer={null} /> : <EditLoader id={id} />}
    </AccessGate>
  );
}

function EditLoader({ id }: { id: number }) {
  const q = useOffer(id);
  if (q.isLoading) return <div className="flex flex-col gap-5"><BackToHub href="/dashboard/marketing/offers" label="العروض الترويجية" /><FormSkeleton /></div>;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <OfferForm offer={q.data} />;
}

function toInput(o: Offer | null): OfferInput {
  return {
    name: o?.name ?? "",
    offer_type: o?.offer_type ?? "discount",
    discount_type: o?.discount_type ?? "percent",
    discount_value: o?.discount_value ?? "",
    min_order_amount: o?.min_order_amount ?? "",
    description: o?.description ?? "",
    cta_text: o?.cta_text ?? "",
    buy_quantity: o?.buy_quantity ? String(o.buy_quantity) : "",
    buy_condition_type: o?.buy_condition_type ?? "all",
    buy_category_id: o?.buy_category ? String(o.buy_category.id) : "",
    buy_product_id: o?.buy_product ? String(o.buy_product.id) : "",
    get_product_id: o?.get_product ? String(o.get_product.id) : "",
    get_quantity: o?.get_quantity ? String(o.get_quantity) : "",
    get_discount_percent: o?.get_discount_percent ? String(o.get_discount_percent) : "100",
    min_total_items: o?.min_total_items ? String(o.min_total_items) : "",
    priority: String(o?.priority ?? 10),
    valid_from: toLocalInput(o?.valid_from),
    valid_until: toLocalInput(o?.valid_until),
    is_active: o?.is_active ?? true,
  };
}

function OfferForm({ offer }: { offer: Offer | null }) {
  const router = useRouter();
  const { canPermission } = useAccess();
  const readOnly = !canPermission("discounts.manage");
  const save = useSaveOffer(offer?.id ?? null);
  const remove = useDeleteOffer();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const form = useForm<OfferInput>({ resolver: zodResolver(offerInputSchema), defaultValues: toInput(offer), disabled: readOnly || undefined });
  const { register, control, formState: { errors } } = form;
  const v = useWatch({ control });

  const onPickImage = (file: File | null) => {
    setImageError(null);
    if (!file) return setImageFile(null);
    if (!hasImageExtension(file.name)) return setImageError(IMAGE_EXTENSIONS_MESSAGE);
    if (file.size > MAX_IMAGE) return setImageError("حجم الصورة أكبر من 5MB.");
    setImageFile(file);
    setRemoveImage(false);
  };

  const onSubmit = form.handleSubmit(async (d) => {
    setFormError(null);
    const bx = d.offer_type === "buy_x_get_y";
    const fields: Record<string, string | boolean> = {
      name: d.name,
      offer_type: d.offer_type,
      description: d.description,
      cta_text: d.cta_text,
      priority: d.priority,
      min_order_amount: d.offer_type === "buy_x_get_y" ? "" : (d.min_order_amount ?? ""),
      valid_from: fromLocalInput(d.valid_from ?? "") ?? "",
      valid_until: fromLocalInput(d.valid_until ?? "") ?? "",
      is_active: d.is_active,
    };
    if (d.offer_type === "discount") Object.assign(fields, { discount_type: d.discount_type, discount_value: d.discount_value ?? "" });
    // The condition fields serve every type (INT-019): Django stores them as `condition_type`/`category`/`product`
    // for a discount or free shipping, and as the «buy X» condition for buy_x_get_y.
    Object.assign(fields, { buy_condition_type: d.buy_condition_type, buy_category_id: d.buy_category_id ?? "", buy_product_id: d.buy_product_id ?? "", min_total_items: d.min_total_items ?? "" });
    if (bx) Object.assign(fields, { buy_quantity: d.buy_quantity ?? "", get_product_id: d.get_product_id ?? "", get_quantity: d.get_quantity ?? "", get_discount_percent: d.get_discount_percent ?? "" });
    let payload: Record<string, unknown> | FormData = fields;
    if (imageFile) {
      const fd = new FormData();
      Object.entries(fields).forEach(([k, val]) => fd.append(k, String(val)));
      fd.append("image", imageFile);
      payload = fd;
    } else if (removeImage) {
      payload = { ...fields, image: "" };
    }
    try {
      const saved = await save.mutateAsync(payload);
      toast.success(offer ? "حُفظ العرض" : "أُنشئ العرض");
      if (!offer) router.replace(`/dashboard/marketing/offers/${saved.id}`);
      else { form.reset(toInput(saved)); setImageFile(null); setRemoveImage(false); }
    } catch (err) {
      if (!applyServerErrors(form, err)) setFormError(errorMessage(err));
    }
  });

  const objectUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  const previewImage = objectUrl ?? (removeImage ? null : (offer?.image ?? null));

  return (
    <div className="flex flex-col gap-5" data-testid="offer-form">
      <BackToHub href="/dashboard/marketing/offers" label="العروض الترويجية" />
      <PageHeader title={offer ? offer.name : "عرض جديد"} eyebrow={offer ? `#${offer.id}` : undefined} description={offer ? undefined : "يُطبَّق تلقائياً في السلة ويظهر في واجهة المتجر."} actions={offer ? <StateText state={offerState(offer)} /> : null} />
      {readOnly ? <p className="text-sm text-muted-foreground">لديك صلاحية التطبيق فقط — التعديل يحتاج «إدارة الخصومات».</p> : null}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <Field label="اسم العرض" htmlFor="name" error={errors.name?.message} required>
            <input id="name" {...register("name")} className={inputClass} aria-invalid={!!errors.name} data-testid="name" />
          </Field>
          <Field label="نوع العرض" htmlFor="offer_type" error={errors.offer_type?.message} required>
            <NativeSelect id="offer_type" {...register("offer_type")} className="h-11 lg:h-9" data-testid="offer_type">
              {OFFER_TYPES.map((t) => <option key={t} value={t}>{OFFER_TYPE_LABELS[t]}</option>)}
            </NativeSelect>
          </Field>

          {v.offer_type === "discount" ? (
            <fieldset className="grid gap-4 surface-card p-5 lg:p-6 md:grid-cols-2" data-testid="discount-fields">
              <legend className="px-1 text-xs text-muted-foreground">الخصم</legend>
              <Field label="النوع" htmlFor="discount_type" required>
                <NativeSelect id="discount_type" {...register("discount_type")} className="h-11 lg:h-9">
                  {DISCOUNT_TYPES.map((t) => <option key={t} value={t}>{DISCOUNT_TYPE_LABELS[t]}</option>)}
                </NativeSelect>
              </Field>
              <Field label={v.discount_type === "percent" ? "النسبة %" : "المبلغ (ر.س)"} htmlFor="discount_value" error={errors.discount_value?.message} required>
                <input id="discount_value" {...register("discount_value")} inputMode="decimal" className={numericInputClass} dir="ltr" aria-invalid={!!errors.discount_value} data-testid="discount_value" />
              </Field>
            </fieldset>
          ) : null}

          {v.offer_type !== "buy_x_get_y" ? (
            <Field label="الحد الأدنى للطلب (ر.س)" htmlFor="min_order_amount" error={errors.min_order_amount?.message} hint={v.offer_type === "free_shipping" ? "الشحن مجاني لكل طلب يتجاوز هذا المبلغ." : "اتركه فارغاً بلا حد."} required={v.offer_type === "free_shipping"}>
              <input id="min_order_amount" {...register("min_order_amount")} inputMode="decimal" className={numericInputClass} dir="ltr" aria-invalid={!!errors.min_order_amount} data-testid="min_order_amount" />
            </Field>
          ) : null}

          {v.offer_type !== "buy_x_get_y" ? (
            <fieldset className="flex flex-col gap-4 surface-card p-5 lg:p-6" data-testid="condition-fields">
              <legend className="px-1 text-xs text-muted-foreground">شرط التطبيق</legend>
              <Field label="يُطبَّق على" htmlFor="buy_condition_type" required>
                <NativeSelect id="buy_condition_type" {...register("buy_condition_type")} className="h-11 lg:h-9" data-testid="condition_type">
                  {BUY_CONDITIONS.map((c) => <option key={c} value={c}>{c === "all" ? "كامل الطلب" : BUY_CONDITION_LABELS[c]}</option>)}
                </NativeSelect>
              </Field>
              {v.buy_condition_type === "category" ? <Controller control={control} name="buy_category_id" render={({ field }) => <CategorySelect id="buy_category_id" value={field.value ?? ""} onChange={field.onChange} error={errors.buy_category_id?.message} required />} /> : null}
              {v.buy_condition_type === "product" ? <Controller control={control} name="buy_product_id" render={({ field }) => <ProductPicker id="buy_product_id" label="المنتج" value={field.value ?? ""} onChange={field.onChange} error={errors.buy_product_id?.message} required />} /> : null}
              {v.buy_condition_type === "min_items" ? (
                <Field label="الحد الأدنى من القطع في السلة" htmlFor="min_total_items" error={errors.min_total_items?.message} required>
                  <input id="min_total_items" {...register("min_total_items")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.min_total_items} />
                </Field>
              ) : null}
            </fieldset>
          ) : null}

          {v.offer_type === "buy_x_get_y" ? (
            <fieldset className="flex flex-col gap-4 surface-card p-5 lg:p-6" data-testid="bxgy-fields">
              <legend className="px-1 text-xs text-muted-foreground">اشترِ X</legend>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="الكمية المشتراة" htmlFor="buy_quantity" error={errors.buy_quantity?.message} required>
                  <input id="buy_quantity" {...register("buy_quantity")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.buy_quantity} data-testid="buy_quantity" />
                </Field>
                <Field label="شرط الشراء" htmlFor="buy_condition_type" required>
                  <NativeSelect id="buy_condition_type" {...register("buy_condition_type")} className="h-11 lg:h-9" data-testid="buy_condition_type">
                    {BUY_CONDITIONS.map((c) => <option key={c} value={c}>{BUY_CONDITION_LABELS[c]}</option>)}
                  </NativeSelect>
                </Field>
              </div>
              {v.buy_condition_type === "category" ? <Controller control={control} name="buy_category_id" render={({ field }) => <CategorySelect id="buy_category_id" value={field.value ?? ""} onChange={field.onChange} error={errors.buy_category_id?.message} required />} /> : null}
              {v.buy_condition_type === "product" ? <Controller control={control} name="buy_product_id" render={({ field }) => <ProductPicker id="buy_product_id" label="المنتج المشترى" value={field.value ?? ""} onChange={field.onChange} error={errors.buy_product_id?.message} required />} /> : null}
              {v.buy_condition_type === "min_items" ? (
                <Field label="الحد الأدنى من القطع في السلة" htmlFor="min_total_items" error={errors.min_total_items?.message} required>
                  <input id="min_total_items" {...register("min_total_items")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.min_total_items} />
                </Field>
              ) : null}
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">واحصل على Y</p>
              <Controller control={control} name="get_product_id" render={({ field }) => <ProductPicker id="get_product_id" label="المنتج الممنوح" value={field.value ?? ""} onChange={field.onChange} error={errors.get_product_id?.message} required />} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="الكمية الممنوحة" htmlFor="get_quantity" error={errors.get_quantity?.message} required>
                  <input id="get_quantity" {...register("get_quantity")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.get_quantity} data-testid="get_quantity" />
                </Field>
                <Field label="خصم على الممنوح %" htmlFor="get_discount_percent" error={errors.get_discount_percent?.message} required hint="100 = مجاناً.">
                  <input id="get_discount_percent" {...register("get_discount_percent")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.get_discount_percent} data-testid="get_discount_percent" />
                </Field>
              </div>
            </fieldset>
          ) : null}

          <Field label="الوصف" htmlFor="description" error={errors.description?.message} counter={{ value: (v.description ?? "").length, max: 300 }} hint="سطر يظهر تحت اسم العرض في المتجر.">
            <Textarea id="description" {...register("description")} rows={2} className="min-h-20" aria-invalid={!!errors.description} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="نص الزر" htmlFor="cta_text" error={errors.cta_text?.message} counter={{ value: (v.cta_text ?? "").length, max: 40 }} hint="فارغ = «تسوّق».">
              <input id="cta_text" {...register("cta_text")} className={inputClass} aria-invalid={!!errors.cta_text} />
            </Field>
            <Field label="الأولوية" htmlFor="priority" error={errors.priority?.message} required hint="الرقم الأكبر يظهر أولاً في واجهة المتجر.">
              <input id="priority" {...register("priority")} inputMode="numeric" className={numericInputClass} dir="ltr" aria-invalid={!!errors.priority} data-testid="priority" />
            </Field>
          </div>
          <Field label="الصورة" htmlFor="image" error={imageError ?? undefined} hint="jpg/png/webp حتى 5MB — اختيارية.">
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} id="image" type="file" accept="image/*" className="sr-only" disabled={readOnly} onChange={(e) => onPickImage(e.target.files?.[0] ?? null)} data-testid="image" />
              <Button type="button" variant="outline" className="h-11 lg:h-9" disabled={readOnly} onClick={() => fileRef.current?.click()}>
                {previewImage ? "تغيير الصورة" : "اختيار صورة"}
              </Button>
              {imageFile ? <span className="text-xs text-muted-foreground">{imageFile.name}</span> : null}
              {previewImage && !readOnly ? (
                <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => { setImageFile(null); setRemoveImage(true); if (fileRef.current) fileRef.current.value = ""; }}>
                  إزالة
                </button>
              ) : null}
            </div>
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="يبدأ في" htmlFor="valid_from" error={errors.valid_from?.message}>
              <input id="valid_from" type="datetime-local" {...register("valid_from")} className={inputClass} dir="ltr" />
            </Field>
            <Field label="ينتهي في" htmlFor="valid_until" error={errors.valid_until?.message} hint="فارغ = بلا نهاية.">
              <input id="valid_until" type="datetime-local" {...register("valid_until")} className={inputClass} dir="ltr" aria-invalid={!!errors.valid_until} />
            </Field>
          </div>
          <Controller control={control} name="is_active" render={({ field }) => <ToggleRow id="is_active" label="فعّال" description="العرض غير الفعّال لا يُطبَّق ولا يظهر في المتجر." checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} testId="is_active" />} />
          {!readOnly ? <FormActions pending={save.isPending} cancelHref="/dashboard/marketing/offers" error={formError} extra={offer ? <Button type="button" variant="ghost" className="ms-auto h-11 text-destructive lg:h-9" onClick={() => setConfirmDelete(true)} data-testid="delete">حذف</Button> : null} /> : null}
        </form>

        <aside className="flex flex-col gap-2 lg:sticky lg:top-20 lg:self-start" aria-label="معاينة في المتجر" data-testid="offer-preview">
          <p className="text-xs text-muted-foreground">كما يظهر في واجهة المتجر</p>
          <div className="flex flex-col gap-2 surface-card p-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob/data URL preview */}
            {previewImage ? <img src={previewImage} alt="" className="aspect-[3/2] w-full rounded-md object-cover" /> : null}
            <span className="text-xs font-medium text-muted-foreground">{v.offer_type === "buy_x_get_y" ? "اشترِ واحصل" : OFFER_TYPE_LABELS[v.offer_type ?? "discount"]}</span>
            <p className="text-lg font-bold leading-snug">{v.name || "اسم العرض"}</p>
            {v.description ? <p className="text-sm leading-7 text-muted-foreground">{v.description}</p> : null}
            <div className="mt-auto flex items-end justify-between gap-3 pt-2 text-sm">
              {v.valid_until ? <span className="text-xs text-muted-foreground">حتى {formatDate(new Date(v.valid_until), { dateStyle: "long" })}</span> : <span />}
              <span className="inline-flex min-h-11 items-center font-medium underline-offset-4">{v.cta_text || "تسوّق"}</span>
            </div>
          </div>
        </aside>
      </div>
      {offer ? (
        <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={`حذف العرض «${offer.name}»؟`} description="يختفي من المتجر ولا يُطبَّق على السلات الجديدة." confirmLabel="حذف" destructive pending={remove.isPending} onConfirm={() => remove.mutate(offer.id, { onSuccess: () => { toast.success("حُذف العرض"); router.replace("/dashboard/marketing/offers"); }, onError: (e) => toast.error(errorMessage(e)) })} testId="delete-dialog" />
      ) : null}
    </div>
  );
}
