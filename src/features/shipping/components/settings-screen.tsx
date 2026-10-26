"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Field, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { applyFieldErrors } from "@/features/settings/hooks/use-section-save";
import { useSaveShippingSettings, useShippingSettings } from "@/features/shipping/api";
import { feesFormSchema, type FeesForm, type ShippingSettings } from "@/features/shipping/schemas";
import { OwnerGate, ShippingSubnav, primaryButton } from "@/features/shipping/components/bits";
import { DeliveryMethodsPanel } from "@/features/shipping/components/delivery-methods";

/**
 * `/dashboard/shipping` (US-15.1): the two fee fields with the STORED currency written
 * next to them (YER_NEW, FR-15.01) and the M34 conversion hint, then the delivery methods
 * with the «كما يراها العميل» preview beside them.
 */
export function ShippingSettingsScreen() {
  return (
    <AccessGate feature="shipping_settings">
      <OwnerGate>
        <div className="flex min-w-0 flex-col gap-6" data-testid="shipping-settings">
          <PageHeader title="الشحن والتوصيل" description="رسوم التوصيل وطرقه كما يراها العميل في صفحة الدفع." />
          <ShippingSubnav />
          <FeesSection />
          <DeliveryMethodsPanel withPreview />
        </div>
      </OwnerGate>
    </AccessGate>
  );
}

/** `/dashboard/shipping/delivery-methods` — the same table as a page of its own. */
export function DeliveryMethodsScreen() {
  return (
    <AccessGate feature="shipping_settings">
      <OwnerGate>
        <div className="flex min-w-0 flex-col gap-6" data-testid="delivery-methods-screen">
          <PageHeader title="طرق التوصيل" description="الأسعار بالريال اليمني الجديد كما يرسلها الخادم؛ طرق شروة شيب الرسمية للقراءة فقط." />
          <ShippingSubnav />
          <DeliveryMethodsPanel withPreview />
        </div>
      </OwnerGate>
    </AccessGate>
  );
}

function FeesSection() {
  const query = useShippingSettings();
  if (query.isPending) return <Skeleton className="h-44 w-full" />;
  if (!query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <FeesForm key={`${query.data.default_delivery_fee}|${query.data.free_shipping_threshold}`} settings={query.data} />;
}

function FeesForm({ settings }: { settings: ShippingSettings }) {
  const save = useSaveShippingSettings();
  const form = useForm<FeesForm>({ resolver: zodResolver(feesFormSchema), defaultValues: { default_delivery_fee: settings.default_delivery_fee, free_shipping_threshold: settings.free_shipping_threshold } });
  const { register, handleSubmit, formState } = form;

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(values);
      toast.success(`حُفظت الرسوم: ${saved.display_default_delivery_fee}`);
    } catch (e) {
      if (!applyFieldErrors(form, e)) toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  });

  const converted = settings.store_display_currency !== settings.currency;
  return (
    <section className="flex flex-col gap-4 surface-card p-5 lg:p-6 md:p-5" aria-labelledby="fees-h" data-testid="fees-section">
      <div className="flex flex-col gap-1">
        <h2 id="fees-h" className="text-base font-semibold">
          الرسوم العامة
        </h2>
        <p className="text-sm text-muted-foreground">
          تُخزَّن بـ <Mono className="text-foreground">YER_NEW</Mono>
          {converted ? (
            <>
              {" "}
              — عملة العرض في متجرك <Mono className="text-foreground">{settings.store_display_currency}</Mono>؛ تُحوَّل للعميل حسب أسعار الصرف (الإعدادات › العملة).
            </>
          ) : (
            " — تُحوَّل للعميل حسب أسعار الصرف."
          )}
        </p>
      </div>
      <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="رسوم التوصيل الافتراضية"
            htmlFor="fee-default"
            error={formState.errors.default_delivery_fee?.message}
            hint={
              <>
                المحفوظ الآن <Money value={settings.display_default_delivery_fee} className="text-foreground" /> · تُحوَّل للعميل حسب أسعار الصرف
              </>
            }
          >
            <div className="flex items-center gap-2">
              <input id="fee-default" dir="ltr" inputMode="decimal" className={numericInputClass} aria-invalid={Boolean(formState.errors.default_delivery_fee)} data-testid="fee-default" {...register("default_delivery_fee")} />
              <Mono className="shrink-0 text-xs text-muted-foreground" data-testid="fee-currency">
                YER_NEW
              </Mono>
            </div>
          </Field>
          <Field
            label="حد الشحن المجاني"
            htmlFor="fee-free"
            error={formState.errors.free_shipping_threshold?.message}
            hint={
              Number(settings.free_shipping_threshold) > 0 ? (
                <>
                  مجاني من <Money value={settings.display_free_shipping_threshold} className="text-foreground" /> · <Mono>0</Mono> = بلا شحن مجاني
                </>
              ) : (
                <>
                  <Mono>0</Mono> = بلا شحن مجاني
                </>
              )
            }
          >
            <div className="flex items-center gap-2">
              <input id="fee-free" dir="ltr" inputMode="decimal" className={numericInputClass} aria-invalid={Boolean(formState.errors.free_shipping_threshold)} data-testid="fee-free" {...register("free_shipping_threshold")} />
              {/* The threshold is compared in the dashboard currency (Django `build_order_invoice`). */}
              <Mono className="shrink-0 text-xs text-muted-foreground">{settings.store_display_currency}</Mono>
            </div>
          </Field>
        </div>
        <div>
          <button type="submit" className={primaryButton} disabled={formState.isSubmitting || !formState.isDirty} data-testid="fees-save">
            حفظ الرسوم
          </button>
        </div>
      </form>
    </section>
  );
}
