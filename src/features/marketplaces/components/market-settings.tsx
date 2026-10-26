"use client";

import { useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/shared/error-state";
import { Field, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { toWesternDigits } from "@/lib/format";
import { useMarketSettings, useSaveMarketSettings } from "@/features/marketplaces/api";
import { settingsFormSchema, type Market, type MarketSettings, type SettingsForm } from "@/features/marketplaces/schemas";

/**
 * Per-market settings (US-28.2, FR-28.03): only the real fields; after save the server's
 * price preview (markup + FX applied THERE) replaces the old one — nothing is computed here.
 */
export function MarketSettingsPanel({ market }: { market: Market }) {
  const q = useMarketSettings(market);
  if (q.isLoading) return <Skeleton className="h-72 w-full" />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <SettingsFormView key={market} market={market} data={q.data} />;
}

function toForm(d: MarketSettings): SettingsForm {
  return {
    currency: d.currency,
    markup_percent: d.markup_percent,
    fx_rate: d.fx_rate,
    auto_push: d.auto_push,
    inventory_sync: d.inventory_sync,
    stock_buffer: String(d.stock_buffer),
    order_pull: d.order_pull,
    import_marketplace_fulfilled: d.import_marketplace_fulfilled,
    default_order_status_id: d.default_order_status_id ? String(d.default_order_status_id) : "",
  };
}

function SettingsFormView({ market, data }: { market: Market; data: MarketSettings }) {
  const id = useId();
  const save = useSaveMarketSettings(market);
  const form = useForm<SettingsForm>({ resolver: zodResolver(settingsFormSchema), defaultValues: toForm(data) });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const autoPush = useWatch({ control, name: "auto_push" });
  const currency = useWatch({ control, name: "currency" });
  const err = (k: keyof SettingsForm) => formState.errors[k]?.message;
  const digits = { setValueAs: (v: string) => toWesternDigits(String(v)) };

  const submit = handleSubmit(async (v) => {
    try {
      const saved = await save.mutateAsync({ ...v, stock_buffer: Number(v.stock_buffer), default_order_status_id: v.default_order_status_id ? Number(v.default_order_status_id) : null });
      reset(toForm(saved));
      toast.success("حُفظت الإعدادات", { description: `سعر النموذج على السوق: ${saved.preview.display_sample_price}` });
    } catch (e) {
      if (isApiError(e) && e.fields) for (const [k, m] of Object.entries(e.fields)) setError(k as FieldPath<SettingsForm>, { message: m[0] });
      else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ");
    }
  });

  // Labels = Django's meaning of each flag (INT-038): auto_push re-sends price/stock changes of published listings.
  const toggles: Array<{ name: "auto_push" | "inventory_sync" | "order_pull" | "import_marketplace_fulfilled"; label: string }> = [
    { name: "auto_push", label: "دفع تغيّرات السعر والمخزون تلقائياً" },
    { name: "inventory_sync", label: "مزامنة المخزون" },
    { name: "order_pull", label: "سحب الطلبات تلقائياً" },
    { name: "import_marketplace_fulfilled", label: "استيراد طلبات يشحنها السوق (FBA/FBN) للتقارير" },
  ];

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="grid max-w-4xl gap-8 lg:grid-cols-[1fr_18rem]"
      data-testid="market-settings"
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="العملة" htmlFor={`${id}-cur`} error={err("currency")} hint={currency !== data.currency ? "سيُعاد حساب أسعار القوائم عند التحديث التالي." : undefined}>
            <NativeSelect id={`${id}-cur`} {...register("currency")} className="h-11 md:h-8" data-testid="settings-currency">
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
            </NativeSelect>
          </Field>
          <Field label="الهامش %" htmlFor={`${id}-mk`} error={err("markup_percent")}>
            <input id={`${id}-mk`} inputMode="decimal" dir="ltr" {...register("markup_percent", digits)} className={numericInputClass} data-testid="settings-markup" />
          </Field>
          <Field label="سعر الصرف" htmlFor={`${id}-fx`} error={err("fx_rate")}>
            <input id={`${id}-fx`} inputMode="decimal" dir="ltr" {...register("fx_rate", digits)} className={numericInputClass} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="احتياطي المخزون" htmlFor={`${id}-buf`} error={err("stock_buffer")} hint="وحدات تُحجب عن السوق من كل منتج.">
            <input id={`${id}-buf`} inputMode="numeric" dir="ltr" {...register("stock_buffer", digits)} className={numericInputClass} />
          </Field>
          <Field label="حالة الطلب الوارد" htmlFor={`${id}-st`} error={err("default_order_status_id")}>
            <NativeSelect id={`${id}-st`} {...register("default_order_status_id")} className="h-11 md:h-8">
              <option value="">الافتراضية للمتجر</option>
              {data.order_status_options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden">
          {toggles.map((t) => (
            <Controller
              key={t.name}
              control={control}
              name={t.name}
              render={({ field }) => (
                <label className="flex min-h-11 items-center justify-between gap-3 px-3 text-sm">
                  <span>{t.label}</span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={t.label} />
                </label>
              )}
            />
          ))}
        </div>
        {autoPush ? <p className="text-sm text-muted-foreground" data-testid="auto-push-note">تُدفع تغيّرات السعر والمخزون للقوائم المنشورة تلقائياً.</p> : null}
        <div>
          <Button type="submit" className="h-11 lg:h-9" disabled={save.isPending} data-testid="settings-save">
            {save.isPending ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
          </Button>
        </div>
      </div>
      <aside className="flex flex-col gap-2 surface-card p-5 lg:p-6 text-sm" aria-label="معاينة السعر" data-testid="price-preview">
        <span className="text-xs text-muted-foreground">معاينة سعر منتج نموذجي (من الخادم)</span>
        <span className="font-medium">{data.preview.sample_product}</span>
        <span className="flex justify-between gap-2">
          <span className="text-muted-foreground">في المتجر</span>
          <Money value={data.preview.display_store_price} />
        </span>
        <span className="flex justify-between gap-2">
          <span className="text-muted-foreground">على السوق</span>
          <Money value={data.preview.display_sample_price} className="font-medium" />
        </span>
        <span className="text-xs text-muted-foreground">تُحدَّث المعاينة بعد الحفظ.</span>
      </aside>
    </form>
  );
}
