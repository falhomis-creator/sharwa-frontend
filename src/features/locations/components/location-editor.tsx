"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { toWesternDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSettings } from "@/features/settings/api";
import { useDeactivationImpact, useLocations, useSaveLocation } from "@/features/locations/api";
import {
  LOCATION_FLAGS,
  LOCATION_FLAG_LABELS,
  OWNERSHIPS,
  OWNERSHIP_LABELS,
  SUPPLIER_CHANNELS,
  SUPPLIER_CHANNEL_LABELS,
  WEEKDAY_LABELS,
  emptyLocationForm,
  formFromDetail,
  locationFormSchema,
  payloadFromForm,
  type LocationDetail,
  type LocationForm,
} from "@/features/locations/schemas";

function conditionalSections(flags: LocationForm["flags"], ownership: LocationForm["ownership"]): string[] {
  const out: string[] = [];
  if (flags.is_pickup_point || flags.serves_walk_in_customers) out.push("hours");
  if (flags.is_pickup_point) out.push("locker");
  if (ownership === "franchise") out.push("franchise");
  if (ownership === "dropship_supplier") out.push("supplier");
  if (flags.is_mobile) out.push("vehicle");
  return out;
}

/**
 * One form, sections that fold (US-22.3): identity · address · capabilities (the eight flags
 * as switches, no preset «type») · ownership · then the detail sections that exist only
 * while their trigger is on (operating hours, locker, franchise, dropship supplier,
 * vehicle, external refs — FR-22.03). `display_type` comes back from the server after save.
 */
export function LocationEditor({ initial }: { initial: LocationDetail | null }) {
  const router = useRouter();
  const id = useId();
  const save = useSaveLocation(initial?.id ?? null);
  const settings = useSettings();
  const weekStart = settings.data?.week_start_day ?? "sunday";
  const others = useLocations({ page_size: 100 });
  const [impactOpen, setImpactOpen] = useState(false);
  const form = useForm<LocationForm>({ resolver: zodResolver(locationFormSchema), defaultValues: initial ? formFromDetail(initial) : emptyLocationForm() });
  const { register, control, handleSubmit, setValue, setError, setFocus, formState } = form;
  const flags = useWatch({ control, name: "flags" });
  const ownership = useWatch({ control, name: "ownership" });
  const isActive = useWatch({ control, name: "is_active" });
  const refs = useFieldArray({ control, name: "external_refs" });
  const impact = useDeactivationImpact(initial && initial.is_active && !isActive ? initial.id : null);

  const showsHours = flags.is_pickup_point || flags.serves_walk_in_customers;

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(payloadFromForm(values));
      toast.success(initial ? "حُفظ الموقع" : "أُنشئ الموقع", { description: `نوع العرض: ${saved.display_type}` });
      if (!initial) router.push(`/dashboard/locations/${saved.id}`);
    } catch (e) {
      if (isApiError(e) && e.fields) {
        let first: FieldPath<LocationForm> | null = null;
        for (const [k, msgs] of Object.entries(e.fields)) {
          const key = k as FieldPath<LocationForm>;
          setError(key, { message: msgs[0] });
          first ??= key;
        }
        if (first) setFocus(first);
      } else {
        toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ");
      }
    }
  });

  const err = (name: FieldPath<LocationForm>) => {
    const parts = name.split(".");
    let node: unknown = formState.errors;
    for (const p of parts) node = node && typeof node === "object" ? (node as Record<string, unknown>)[p] : undefined;
    return node && typeof node === "object" && "message" in node ? String((node as { message?: unknown }).message ?? "") : undefined;
  };

  /** «lat,lng» pasted into either coordinate field fills both (FR-22.09). */
  const onCoordPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = toWesternDigits(e.clipboardData.getData("text")).trim();
    const m = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(text);
    if (!m) return;
    e.preventDefault();
    setValue("latitude", m[1]!, { shouldDirty: true, shouldValidate: true });
    setValue("longitude", m[2]!, { shouldDirty: true, shouldValidate: true });
  };

  const dayOrder = weekStart === "monday" ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  // Sections open by default; a conditional section opens itself the first time its trigger
  // turns it on (render-time latch — no effect, no flash).
  const [openSections, setOpenSections] = useState<string[]>(() => ["identity", "address", "capabilities", "ownership", ...(initial ? conditionalSections(initial.flags, initial.ownership) : [])]);
  const [seen, setSeen] = useState<string[]>(() => (initial ? conditionalSections(initial.flags, initial.ownership) : []));
  const newly = conditionalSections(flags, ownership).filter((k) => !seen.includes(k));
  if (newly.length) {
    setSeen([...seen, ...newly]);
    setOpenSections([...openSections, ...newly]);
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      onKeyDown={(e) => {
        // ⌘S / Ctrl+S saves while focus is in the form (spec §6 shortcuts).
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          void submit();
        }
      }}
      className="flex max-w-3xl flex-col gap-4"
      data-testid="location-form"
    >
      <Accordion multiple value={openSections} onValueChange={(v) => setOpenSections(v as string[])} className="divide-y divide-border/60 surface-card px-4 overflow-hidden">
        <AccordionItem value="identity">
          <AccordionTrigger className="min-h-11">الهوية</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 pb-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="الاسم" htmlFor={`${id}-name`} required error={err("name")}>
                <input id={`${id}-name`} {...register("name")} aria-invalid={Boolean(err("name"))} className={inputClass} />
              </Field>
              <Field label="الكود" htmlFor={`${id}-code`} required error={err("code")} hint="مثل WH-01 أو BR-JED-02؛ يُتحقق من تفرده عند الحفظ">
                <input id={`${id}-code`} dir="ltr" {...register("code")} aria-invalid={Boolean(err("code"))} className={cn(inputClass, "font-mono uppercase")} />
              </Field>
            </div>
            <Field label="الموقع الأب" htmlFor={`${id}-parent`} error={err("parent_location")} hint="اختياري — خزانة تحت فرع مثلاً">
              <NativeSelect id={`${id}-parent`} {...register("parent_location")} className="h-11 md:h-8">
                <option value="">بلا أب</option>
                {(others.data?.results ?? []).filter((l) => l.id !== initial?.id).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <label htmlFor={`${id}-active`} className="flex min-h-11 cursor-pointer items-center gap-3">
                  <Switch id={`${id}-active`} checked={field.value} onCheckedChange={(on) => (initial && initial.is_active && !on ? setImpactOpen(true) : field.onChange(on))} data-testid="toggle-active" />
                  <span className="text-sm font-medium">نشط</span>
                </label>
              )}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="address">
          <AccordionTrigger className="min-h-11">العنوان</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 pb-4">
            <Field label="العنوان النصي" htmlFor={`${id}-address`} error={err("address_text")}>
              <input id={`${id}-address`} {...register("address_text")} className={inputClass} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="المدينة" htmlFor={`${id}-city`} error={err("city")}>
                <input id={`${id}-city`} {...register("city")} className={inputClass} />
              </Field>
              <Field label="الهاتف" htmlFor={`${id}-phone`} error={err("phone")}>
                <input id={`${id}-phone`} dir="ltr" inputMode="tel" {...register("phone")} className={cn(inputClass, "font-mono")} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="خط العرض" htmlFor={`${id}-lat`} error={err("latitude")} hint={flags.is_virtual ? "موقع افتراضي — لا إحداثيات" : "الصق «lat,lng» في أي حقل لتعبئة الاثنين"}>
                <input id={`${id}-lat`} dir="ltr" inputMode="decimal" {...register("latitude")} onPaste={onCoordPaste} disabled={flags.is_virtual} className={numericInputClass} />
              </Field>
              <Field label="خط الطول" htmlFor={`${id}-lng`} error={err("longitude")}>
                <input id={`${id}-lng`} dir="ltr" inputMode="decimal" {...register("longitude")} onPaste={onCoordPaste} disabled={flags.is_virtual} className={numericInputClass} />
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="capabilities">
          <AccordionTrigger className="min-h-11">القدرات</AccordionTrigger>
          <AccordionContent className="pb-4">
            <p className="mb-2 text-xs text-muted-foreground">لا «نوع» مسبق — فعّل ما يستطيع الموقع فعله، ويحسب الخادم نوع العرض.</p>
            <div className="flex flex-col divide-y divide-border" role="group" aria-label="قدرات الموقع">
              {LOCATION_FLAGS.map((f) => (
                <Controller
                  key={f}
                  control={control}
                  name={`flags.${f}`}
                  render={({ field }) => (
                    <label htmlFor={`${id}-${f}`} className="flex min-h-11 cursor-pointer items-center gap-3 py-1.5">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium">{LOCATION_FLAG_LABELS[f].label}</span>
                        <span className="text-xs text-muted-foreground">{LOCATION_FLAG_LABELS[f].hint}</span>
                      </span>
                      <Switch id={`${id}-${f}`} checked={field.value} onCheckedChange={field.onChange} data-testid={`flag-${f}`} />
                    </label>
                  )}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ownership">
          <AccordionTrigger className="min-h-11">الملكية</AccordionTrigger>
          <AccordionContent className="pb-4">
            <div role="radiogroup" aria-label="الملكية" className="flex flex-col gap-1">
              {OWNERSHIPS.map((o) => (
                <label key={o} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                  <input type="radio" value={o} {...register("ownership")} className="size-4 accent-[var(--foreground)]" data-testid={`ownership-${o}`} />
                  {OWNERSHIP_LABELS[o]}
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {showsHours ? (
          <AccordionItem value="hours">
            <AccordionTrigger className="min-h-11">ساعات العمل</AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="mb-2 text-xs text-muted-foreground">الأيام بترتيب أسبوعك ({weekStart === "monday" ? "يبدأ بالاثنين" : "يبدأ بالأحد"})؛ يُرسل الترميز 0 = الأحد دائماً.</p>
              {err("operating_hours") ? <p className="mb-2 text-xs text-destructive">{err("operating_hours")}</p> : null}
              <div className="flex flex-col divide-y divide-border" data-testid="operating-hours">
                {dayOrder.map((weekday) => (
                  <Controller
                    key={weekday}
                    control={control}
                    name={`operating_hours.${weekday}`}
                    render={({ field }) => {
                      const v = field.value;
                      return (
                        <div className="grid min-h-11 grid-cols-[6rem_1fr_1fr_auto] items-center gap-2 py-1.5 text-sm">
                          <span className="flex items-center gap-2">
                            <Mono className="text-xs text-muted-foreground">{weekday}</Mono>
                            {WEEKDAY_LABELS[weekday]}
                          </span>
                          <input type="time" dir="ltr" aria-label={`${WEEKDAY_LABELS[weekday]} من`} value={v.opens_at ?? ""} disabled={v.is_closed} onChange={(e) => field.onChange({ ...v, opens_at: e.target.value })} className={cn(inputClass, "font-mono")} />
                          <input type="time" dir="ltr" aria-label={`${WEEKDAY_LABELS[weekday]} إلى`} value={v.closes_at ?? ""} disabled={v.is_closed} onChange={(e) => field.onChange({ ...v, closes_at: e.target.value })} className={cn(inputClass, "font-mono")} />
                          <Button type="button" variant={v.is_closed ? "default" : "outline"} className="h-11 px-3 lg:h-8" aria-pressed={v.is_closed} onClick={() => field.onChange(v.is_closed ? { weekday, opens_at: "09:00", closes_at: "22:00", is_closed: false } : { weekday, opens_at: null, closes_at: null, is_closed: true })}>
                            مغلق
                          </Button>
                        </div>
                      );
                    }}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {flags.is_pickup_point ? (
          <AccordionItem value="locker">
            <AccordionTrigger className="min-h-11">تفاصيل الخزانة</AccordionTrigger>
            <AccordionContent className="grid gap-4 pb-4 md:grid-cols-3">
              <Field label="المزوّد" htmlFor={`${id}-locker-provider`}>
                <input id={`${id}-locker-provider`} {...register("locker.provider")} className={inputClass} />
              </Field>
              <Field label="رمز الخزانة" htmlFor={`${id}-locker-code`}>
                <input id={`${id}-locker-code`} dir="ltr" {...register("locker.locker_code")} className={cn(inputClass, "font-mono")} />
              </Field>
              <Field label="السعة" htmlFor={`${id}-locker-cap`}>
                <input id={`${id}-locker-cap`} dir="ltr" inputMode="numeric" {...register("locker.capacity")} className={numericInputClass} />
              </Field>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {ownership === "franchise" ? (
          <AccordionItem value="franchise">
            <AccordionTrigger className="min-h-11">الامتياز</AccordionTrigger>
            <AccordionContent className="grid gap-4 pb-4 md:grid-cols-2">
              <Field label="صاحب الامتياز" htmlFor={`${id}-fr-name`}>
                <input id={`${id}-fr-name`} {...register("franchise.franchisee_name")} className={inputClass} />
              </Field>
              <Field label="نهاية العقد" htmlFor={`${id}-fr-end`}>
                <input id={`${id}-fr-end`} type="date" dir="ltr" {...register("franchise.contract_ends_at")} className={cn(inputClass, "font-mono")} />
              </Field>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {ownership === "dropship_supplier" ? (
          <AccordionItem value="supplier">
            <AccordionTrigger className="min-h-11">مورد الدروبشيبينج</AccordionTrigger>
            <AccordionContent className="grid gap-4 pb-4 md:grid-cols-2">
              <Field label="قناة التواصل" htmlFor={`${id}-ds-channel`} error={err("dropship_supplier")}>
                <NativeSelect id={`${id}-ds-channel`} {...register("dropship_supplier.channel")} className="h-11 md:h-8" data-testid="supplier-channel">
                  {SUPPLIER_CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {SUPPLIER_CHANNEL_LABELS[c]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="جهة الاتصال" htmlFor={`${id}-ds-contact`} hint="رقم واتساب أو بريد أو رابط Webhook">
                <input id={`${id}-ds-contact`} dir="ltr" {...register("dropship_supplier.contact")} className={cn(inputClass, "font-mono")} />
              </Field>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {flags.is_mobile ? (
          <AccordionItem value="vehicle">
            <AccordionTrigger className="min-h-11">المركبة</AccordionTrigger>
            <AccordionContent className="grid gap-4 pb-4 md:grid-cols-2">
              <Field label="رقم اللوحة" htmlFor={`${id}-plate`}>
                <input id={`${id}-plate`} {...register("vehicle.plate_number")} className={inputClass} />
              </Field>
              <Field label="هاتف السائق" htmlFor={`${id}-driver`}>
                <input id={`${id}-driver`} dir="ltr" inputMode="tel" {...register("vehicle.driver_phone")} className={cn(inputClass, "font-mono")} />
              </Field>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        <AccordionItem value="refs">
          <AccordionTrigger className="min-h-11">المراجع الخارجية</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 pb-4">
            {refs.fields.length === 0 ? <p className="text-xs text-muted-foreground">لا مراجع — أضف معرّف الموقع في نظام خارجي (WMS، شركة شحن…).</p> : null}
            {refs.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <Field label="النظام" htmlFor={`${id}-ref-sys-${i}`}>
                  <input id={`${id}-ref-sys-${i}`} {...register(`external_refs.${i}.system`)} className={inputClass} />
                </Field>
                <Field label="المرجع" htmlFor={`${id}-ref-${i}`}>
                  <input id={`${id}-ref-${i}`} dir="ltr" {...register(`external_refs.${i}.ref`)} className={cn(inputClass, "font-mono")} />
                </Field>
                <Button type="button" variant="ghost" className="h-11 lg:h-8" onClick={() => refs.remove(i)}>
                  حذف
                </Button>
              </div>
            ))}
            <div>
              <Button type="button" variant="outline" className="h-11 lg:h-8" onClick={() => refs.append({ system: "", ref: "" })}>
                إضافة مرجع
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" className="h-11 lg:h-9" disabled={save.isPending} data-testid="save-location">
          {initial ? "حفظ" : "إنشاء الموقع"}
        </Button>
        <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={() => router.push("/dashboard/locations")}>
          إلغاء
        </Button>
        <span className="text-xs text-muted-foreground">⌘S للحفظ</span>
      </div>

      <Dialog open={impactOpen} onOpenChange={setImpactOpen}>
        <DialogContent>
          <DialogTitle>تعطيل الموقع؟</DialogTitle>
          <DialogDescription>
            {impact.isLoading || !impact.data ? (
              "يُحسب أثر التعطيل…"
            ) : (
              <>
                يحمل هذا الموقع <Mono>{impact.data.on_hand_total}</Mono> وحدة مخزون و<Mono>{impact.data.open_fulfillments}</Mono> طلبات مفتوحة. بعد التعطيل لن تُوجَّه إليه طلبات جديدة وسيبقى مخزونه حتى تنقله.
              </>
            )}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" className="h-11 lg:h-9" onClick={() => setImpactOpen(false)}>
              إبقاء الموقع نشطاً
            </Button>
            <Button
              variant="destructive"
              className="h-11 lg:h-9"
              onClick={() => {
                setValue("is_active", false, { shouldDirty: true });
                setImpactOpen(false);
              }}
              data-testid="confirm-deactivate"
            >
              تعطيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
