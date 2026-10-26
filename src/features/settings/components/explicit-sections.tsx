"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Controller, useForm, useWatch, type FieldValues, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { compareDecimal, isDecimal } from "@/lib/decimal";
import {
  CURRENCIES,
  CURRENCY_LABELS,
  currencyInputSchema,
  multiLocationConflictSchema,
  shippingInputSchema,
  type CurrencyInput,
  type SettingsSection,
  type ShippingInput,
  type StoreSettings,
} from "@/features/settings/schemas";
import { useSaveSettings } from "@/features/settings/api";
import { applyFieldErrors, useExplicitSection } from "@/features/settings/hooks/use-section-save";
import { SectionLoader } from "@/features/settings/components/auto-sections";
import { z } from "zod";
import { DangerFrame, SectionHeader, SettingRow, useFocusHash, useSectionAccess } from "@/features/settings/components/section-frame";

/**
 * The four explicit sections (FR-34.04): shipping defaults, currency + exchange rates,
 * payment toggles, multi-location. Nothing here auto-saves (SC-34.4): «حفظ التغييرات» is
 * disabled until something changes, and every save passes a confirmation that says what
 * will happen. `⌘S` and the hub's unsaved bar open the same confirmation.
 */
function useExplicitForm<T extends FieldValues>(section: SettingsSection, form: UseFormReturn<T>) {
  const [confirming, setConfirming] = useState(false);
  const { afterSave } = useExplicitSection({ section, form, openConfirm: () => setConfirming(true) });
  return { confirming, setConfirming, afterSave };
}

function SaveBar({ dirty, disabled, onSave }: { dirty: boolean; disabled: boolean; onSave: () => void }) {
  return (
    <div className="flex items-center justify-end gap-3 py-5">
      {!dirty ? <span className="text-xs text-muted-foreground">لا تغييرات</span> : null}
      <Button size="lg" className="h-11 lg:h-9" disabled={!dirty || disabled} onClick={onSave} data-testid="save-section">
        حفظ التغييرات
      </Button>
    </div>
  );
}

function ConfirmSave({
  open,
  onOpenChange,
  title,
  children,
  onConfirm,
  busy,
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  busy: boolean;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="confirm-save">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription render={<div />} className="flex flex-col gap-2 text-sm text-muted-foreground">
          {children}
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button variant={destructive ? "destructive" : "default"} size="lg" className="h-11 lg:h-9" disabled={busy} onClick={onConfirm} data-testid="confirm-save-button">
            {busy ? "جارٍ الحفظ…" : "تأكيد الحفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shipping ─────────────────────────────────────────────────────────────────────────
export function ShippingSection() {
  return <SectionLoader section="shipping">{(s) => <ShippingForm settings={s} />}</SectionLoader>;
}

function ShippingForm({ settings }: { settings: StoreSettings }) {
  const { canEdit, readOnlyReason } = useSectionAccess("shipping");
  const save = useSaveSettings();
  const form = useForm<ShippingInput>({
    resolver: zodResolver(shippingInputSchema),
    defaultValues: { default_delivery_fee: settings.default_delivery_fee, free_shipping_threshold: settings.free_shipping_threshold },
  });
  const { confirming, setConfirming, afterSave } = useExplicitForm("shipping", form);
  const [busy, setBusy] = useState(false);
  const [fee, threshold] = useWatch({ control: form.control, name: ["default_delivery_fee", "free_shipping_threshold"] });
  const e = form.formState.errors;
  const lowThreshold = isDecimal(fee) && isDecimal(threshold) && compareDecimal(threshold, "0") > 0 && compareDecimal(threshold, fee) < 0;
  useFocusHash(true);

  async function confirm() {
    setBusy(true);
    try {
      const saved = await save("shipping", form.getValues());
      afterSave({ default_delivery_fee: saved.default_delivery_fee, free_shipping_threshold: saved.free_shipping_threshold });
      toast.success("حُفظت إعدادات الشحن");
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
      if (!applyFieldErrors(form, err)) toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(() => setConfirming(true))} data-testid="settings-shipping">
      <SectionHeader section="shipping" readOnlyReason={readOnlyReason} />
      <DangerFrame title="يمسّ ما يدفعه المشتري — يُحفظ بعد تأكيد.">
        <fieldset disabled={!canEdit} className="min-w-0">
          <SettingRow
            label={
              <>
                رسوم التوصيل الافتراضية <span className="font-normal text-muted-foreground">· ريال يمني (عدن) YER_NEW</span>
              </>
            }
            description={
              <>
                الحالية: <Money value={settings.display_default_delivery_fee} /> — تُطبَّق حين لا توجد طريقة توصيل بسعر خاص.
              </>
            }
            htmlFor="default_delivery_fee"
            error={e.default_delivery_fee?.message}
          >
            <input id="default_delivery_fee" inputMode="decimal" dir="ltr" {...form.register("default_delivery_fee")} className={numericInputClass} aria-invalid={Boolean(e.default_delivery_fee)} />
          </SettingRow>
          <SettingRow
            label={
              <>
                حد الشحن المجاني <span className="font-normal text-muted-foreground">· بعملة لوحة التحكم {settings.currency}</span>
              </>
            }
            description={
              lowThreshold ? (
                <span className="text-warning">الحد أقل من رسوم التوصيل — الشحن المجاني سيُطبَّق على معظم الطلبات.</span>
              ) : compareDecimal(settings.free_shipping_threshold, "0") > 0 ? (
                <span data-testid="free-shipping-preview">
                  في المتجر الآن: «الشحن مجاني للطلبات فوق <Money value={settings.display_free_shipping_threshold} />».
                </span>
              ) : (
                "صفر = بلا شحن مجاني."
              )
            }
            htmlFor="free_shipping_threshold"
            error={e.free_shipping_threshold?.message}
          >
            <input id="free_shipping_threshold" inputMode="decimal" dir="ltr" {...form.register("free_shipping_threshold")} className={numericInputClass} aria-invalid={Boolean(e.free_shipping_threshold)} />
          </SettingRow>
        </fieldset>
      </DangerFrame>
      {canEdit ? <SaveBar dirty={form.formState.isDirty} disabled={busy} onSave={() => void form.handleSubmit(() => setConfirming(true))()} /> : null}
      <ConfirmSave open={confirming} onOpenChange={setConfirming} title="حفظ إعدادات الشحن" onConfirm={() => void confirm()} busy={busy}>
        <p>
          رسوم التوصيل: <Mono dir="ltr">{fee}</Mono> · حد الشحن المجاني: <Mono dir="ltr">{threshold}</Mono> — بالريال اليمني (عدن).
        </p>
        <p>تُطبَّق على الطلبات الجديدة فوراً؛ الطلبات السابقة لا تتغيّر.</p>
      </ConfirmSave>
    </form>
  );
}

// ── Currency ─────────────────────────────────────────────────────────────────────────
export function CurrencySection() {
  return <SectionLoader section="currency">{(s) => <CurrencyForm settings={s} />}</SectionLoader>;
}

const RATES: Array<{ key: "usd_to_sar" | "sar_to_yer_old" | "sar_to_yer_new"; label: string; unit: string; def: string }> = [
  { key: "usd_to_sar", label: "الدولار ← الريال السعودي", unit: "1 USD =", def: "3.75" },
  { key: "sar_to_yer_old", label: "الريال السعودي ← اليمني (صنعاء)", unit: "1 SAR =", def: "140" },
  { key: "sar_to_yer_new", label: "الريال السعودي ← اليمني (عدن)", unit: "1 SAR =", def: "520" },
];

function CurrencyForm({ settings }: { settings: StoreSettings }) {
  const { canEdit, readOnlyReason } = useSectionAccess("currency");
  const save = useSaveSettings();
  const form = useForm<CurrencyInput>({
    resolver: zodResolver(currencyInputSchema),
    defaultValues: { currency: settings.currency, usd_to_sar: settings.usd_to_sar, sar_to_yer_old: settings.sar_to_yer_old, sar_to_yer_new: settings.sar_to_yer_new },
  });
  const { confirming, setConfirming, afterSave } = useExplicitForm("currency", form);
  const [busy, setBusy] = useState(false);
  const values = useWatch({ control: form.control });
  const e = form.formState.errors;
  useFocusHash(true);

  async function confirm() {
    setBusy(true);
    try {
      const saved = await save("currency", form.getValues());
      afterSave({ currency: saved.currency, usd_to_sar: saved.usd_to_sar, sar_to_yer_old: saved.sar_to_yer_old, sar_to_yer_new: saved.sar_to_yer_new });
      toast.success("حُفظت العملات وأسعار الصرف");
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
      if (!applyFieldErrors(form, err)) toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(() => setConfirming(true))} data-testid="settings-currency">
      <SectionHeader section="currency" readOnlyReason={readOnlyReason} />
      <DangerFrame title="يغيّر عرض كل الأسعار في المتجر — يُحفظ بعد تأكيد.">
        <fieldset disabled={!canEdit} className="min-w-0">
          <SettingRow label="عملة العرض" description="العملة التي يرى بها المشترون الأسعار أولاً." htmlFor="currency" error={e.currency?.message}>
            <NativeSelect id="currency" {...form.register("currency")} className="h-11 md:h-8">
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_LABELS[c]} — {c}
                </option>
              ))}
            </NativeSelect>
          </SettingRow>
          {RATES.map((r) => (
            <SettingRow
              key={r.key}
              label={r.label}
              description={
                <>
                  الافتراضي <Mono dir="ltr">{r.def}</Mono>
                </>
              }
              htmlFor={r.key}
              error={e[r.key]?.message}
            >
              <div className="flex items-center gap-2">
                <Mono dir="ltr" className="shrink-0 text-xs text-muted-foreground">
                  {r.unit}
                </Mono>
                <input id={r.key} inputMode="decimal" dir="ltr" {...form.register(r.key)} className={numericInputClass} aria-invalid={Boolean(e[r.key])} />
              </div>
            </SettingRow>
          ))}
        </fieldset>
        <section className="flex flex-col gap-2 py-5" aria-label="معاينة التحويل">
          <h3 className="text-sm font-medium">
            <Mono dir="ltr">100</Mono> ر.س في كل عملة
          </h3>
          <table className="w-full text-sm" data-testid="fx-preview">
            <tbody>
              {settings.fx_preview.map((row) => (
                <tr key={row.currency} className="border-b border-border last:border-0">
                  <td className="py-2 text-muted-foreground">{CURRENCY_LABELS[row.currency]}</td>
                  <td className="py-2 text-end">
                    <Money value={row.display_100_sar} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {form.formState.isDirty ? <p className="text-xs text-muted-foreground">المعاينة من الخادم وتتحدّث بعد الحفظ.</p> : null}
        </section>
      </DangerFrame>
      {canEdit ? <SaveBar dirty={form.formState.isDirty} disabled={busy} onSave={() => void form.handleSubmit(() => setConfirming(true))()} /> : null}
      <ConfirmSave open={confirming} onOpenChange={setConfirming} title="تغيير العملات وأسعار الصرف" onConfirm={() => void confirm()} busy={busy}>
        <p>سيتغيّر عرض الأسعار في المتجر فوراً؛ الطلبات السابقة لا تتأثر (سعر الصرف مثبَّت في كل طلب).</p>
        <p>
          عملة العرض: {CURRENCY_LABELS[values.currency ?? settings.currency]} · <Mono dir="ltr">1 USD = {values.usd_to_sar} SAR</Mono>
        </p>
      </ConfirmSave>
    </form>
  );
}

// ── Payments ─────────────────────────────────────────────────────────────────────────
export function PaymentsSection() {
  return <SectionLoader section="payments">{(s) => <PaymentsSummary settings={s} />}</SectionLoader>;
}

/**
 * Decision 2026-10-19 (Phase 5 open item 5): ONE editing surface for the payment toggles.
 * They are edited in `/dashboard/payments` (M14), next to the gateways and payout accounts
 * they depend on — turning manual payment on with no active account is only catchable
 * there. This section stays in the hub and in ⌘K as a read-only summary that links out,
 * so a merchant who looks for «الدفع» under الإعدادات still finds it.
 */
function PaymentsSummary({ settings }: { settings: StoreSettings }) {
  const { readOnlyReason } = useSectionAccess("payments");
  const codOnly = !settings.enable_manual_payment && !settings.enable_sharwa_pay;
  useFocusHash(true);
  const rows: Array<{ key: "enable_manual_payment" | "enable_sharwa_pay"; label: string; description: string }> = [
    { key: "enable_manual_payment", label: "الدفع اليدوي", description: "تحويل بنكي أو محفظة محلية يرفع المشتري إيصاله وتؤكّده من الطلب." },
    { key: "enable_sharwa_pay", label: "شروة باي", description: "محفظة شروة: دفع فوري يصل إلى رصيد متجرك." },
  ];

  return (
    <section data-testid="settings-payments">
      <SectionHeader section="payments" readOnlyReason={readOnlyReason} />
      <div className="surface-card px-4 md:px-5">
        {rows.map((r) => (
          <SettingRow key={r.key} label={r.label} description={r.description}>
            <span id={r.key} className="self-end text-sm" data-testid={`payments-state-${r.key}`}>
              {settings[r.key] ? "مفعّل" : "متوقف"}
            </span>
          </SettingRow>
        ))}
        <div className="flex flex-col items-start gap-2 py-4">
          <p className="text-xs text-muted-foreground">تُدار وسائل الدفع والبوابات وحسابات الاستلام من صفحة واحدة.</p>
          {readOnlyReason ? null : (
            <Link href="/dashboard/payments" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")} data-testid="manage-payments">
              إدارة وسائل الدفع
            </Link>
          )}
        </div>
      </div>
      {codOnly ? (
        <p role="note" className="pt-3 text-sm text-warning" data-testid="cod-only-warning">
          لن يستطيع المشترون الدفع إلا عند الاستلام.
        </p>
      ) : null}
    </section>
  );
}

// ── Locations (multi-location) ───────────────────────────────────────────────────────
export function LocationsSection() {
  return <SectionLoader section="locations">{(s) => <LocationsForm settings={s} />}</SectionLoader>;
}

const locationsFormSchema = z.object({ multi_location_enabled: z.boolean() });

function LocationsForm({ settings }: { settings: StoreSettings }) {
  const { canEdit, readOnlyReason } = useSectionAccess("locations");
  const save = useSaveSettings();
  const form = useForm<z.infer<typeof locationsFormSchema>>({
    resolver: zodResolver(locationsFormSchema),
    defaultValues: { multi_location_enabled: settings.multi_location_enabled },
  });
  const { confirming, setConfirming, afterSave } = useExplicitForm("locations", form);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<z.infer<typeof multiLocationConflictSchema> | null>(null);
  const enabled = useWatch({ control: form.control, name: "multi_location_enabled" });
  useFocusHash(true);

  async function confirm(merge = false) {
    setBusy(true);
    try {
      const saved = await save("locations", { enabled, ...(merge ? { merge: true } : {}) });
      afterSave({ multi_location_enabled: saved.multi_location_enabled });
      setConflict(null);
      toast.success(saved.multi_location_enabled ? "تعدد المواقع مفعّل" : merge ? "أُوقف تعدد المواقع ودُمجت الكميات" : "أُوقف تعدد المواقع");
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
      if (isApiError(err) && err.status === 409) {
        // A readable 409: the conflicting locations ride in the error body.
        setConflict({ detail: err.userMessage, conflicts: conflictsFrom(err) });
      } else toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(() => setConfirming(true))} data-testid="settings-locations">
      <SectionHeader section="locations" readOnlyReason={readOnlyReason} />
      <DangerFrame title="يغيّر بنية المخزون — يُحفظ بعد تأكيد.">
        <fieldset disabled={!canEdit} className="min-w-0">
          <SettingRow
            label="تعدد المواقع"
            description={
              <>
                مخزون مستقل لكل فرع أو مستودع. المواقع نفسها في{" "}
                <Link href="/dashboard/locations" className="text-foreground underline underline-offset-4">
                  المواقع
                </Link>
                .
              </>
            }
            htmlFor="multi_location_enabled"
          >
            <Controller
              control={form.control}
              name="multi_location_enabled"
              render={({ field }) => <Switch id="multi_location_enabled" checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} className="self-end" />}
            />
          </SettingRow>
        </fieldset>
      </DangerFrame>
      {conflict ? (
        <div role="alert" className="mt-4 flex flex-col gap-3 rounded-lg border border-warning/60 p-4 text-sm" data-testid="multi-location-conflict">
          <p className="font-medium">لم يُوقف تعدد المواقع</p>
          <p className="text-muted-foreground">{conflict.detail}</p>
          {conflict.conflicts.length ? (
            <ul className="flex flex-col">
              {conflict.conflicts.map((c) => (
                <li key={c.location} className="flex justify-between border-b border-border py-1.5 last:border-0">
                  <span>{c.location}</span>
                  <span className="text-muted-foreground">
                    <Mono className="text-foreground">{c.products_with_stock}</Mono> منتجاً بمخزون
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="destructive" className="h-11 lg:h-9" disabled={busy} onClick={() => void confirm(true)} data-testid="merge-and-disable">
              دمج الكميات وإيقاف
            </Button>
            <Link href="/dashboard/locations" className="inline-flex h-11 items-center rounded-lg border border-border px-3 hover:bg-muted lg:h-9">
              مراجعة المواقع أولاً
            </Link>
          </div>
        </div>
      ) : null}
      {canEdit ? <SaveBar dirty={form.formState.isDirty} disabled={busy} onSave={() => void form.handleSubmit(() => setConfirming(true))()} /> : null}
      <ConfirmSave open={confirming} onOpenChange={setConfirming} title={enabled ? "تفعيل تعدد المواقع" : "إيقاف تعدد المواقع"} onConfirm={() => void confirm()} busy={busy} destructive={!enabled}>
        {enabled ? (
          <p>سيُدار المخزون لكل موقع؛ المخزون الحالي يُنقل إلى الموقع الافتراضي، ثم توزّعه من «المواقع».</p>
        ) : (
          <p>ستُدمج كميات كل المواقع في مخزون واحد؛ لا يمكن فصلها تلقائياً بعد ذلك.</p>
        )}
      </ConfirmSave>
    </form>
  );
}

/** The 409 body's conflict list (`ApiError.body`), Zod-checked. */
function conflictsFrom(err: unknown): Array<{ location: string; products_with_stock: number }> {
  const parsed = multiLocationConflictSchema.safeParse(isApiError(err) ? err.body : undefined);
  return parsed.success ? parsed.data.conflicts : [];
}
