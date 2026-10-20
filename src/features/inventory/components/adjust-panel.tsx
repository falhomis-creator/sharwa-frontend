"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { UNIT_LABELS } from "@/features/products/schemas/enums";
import { useAdjustStock } from "@/features/inventory/api";
import { useIsPhone } from "@/features/inventory/hooks/use-inventory-filters";
import { adjustFormSchema, formatQty, MANUAL_REASONS, MOVEMENT_REASON_LABELS, type AdjustForm, type InventoryUnit } from "@/features/inventory/schemas";

/**
 * The adjust panel (M21 US-21.2): new quantity OR a signed difference, a reason from the
 * two manual ones, a note that is REQUIRED when the quantity goes down (checked here, before
 * the POST), the location when multi-location is on. A Sheet on desktop; on phones a bottom
 * drawer with ± buttons ≥ 44px. The row updates optimistically from the caller.
 */
export function AdjustPanel({
  unit,
  multi,
  locations,
  defaultLocation,
  onClose,
  onApplied,
}: {
  unit: InventoryUnit | null;
  multi: boolean;
  locations: Array<{ id: number; name: string }>;
  defaultLocation: string;
  onClose: () => void;
  onApplied: (unit: InventoryUnit, delta: string) => void;
}) {
  const phone = useIsPhone();
  const open = unit !== null;
  const title = unit ? `${unit.name}${unit.variant_label ? ` — ${unit.variant_label}` : ""}` : "";
  const body = unit ? <AdjustForm key={`${unit.product_id}:${unit.variant_id ?? 0}:${defaultLocation}`} unit={unit} multi={multi} locations={locations} defaultLocation={defaultLocation} onClose={onClose} onApplied={onApplied} /> : null;

  if (phone) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent data-testid="adjust-drawer">
          <DrawerHeader className="border-b border-border text-start">
            <DrawerTitle>تعديل المخزون</DrawerTitle>
            <DrawerDescription>{title}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 shadow-none data-[side=left]:sm:max-w-md" data-testid="adjust-sheet">
        <SheetTitle>تعديل المخزون</SheetTitle>
        <SheetDescription className="mb-4">{title}</SheetDescription>
        {body}
      </SheetContent>
    </Sheet>
  );
}

function AdjustForm({
  unit,
  multi,
  locations,
  defaultLocation,
  onClose,
  onApplied,
}: {
  unit: InventoryUnit;
  multi: boolean;
  locations: Array<{ id: number; name: string }>;
  defaultLocation: string;
  onClose: () => void;
  onApplied: (unit: InventoryUnit, delta: string) => void;
}) {
  const id = useId();
  const adjust = useAdjustStock();
  const [detail, setDetail] = useState<string | null>(null);
  const current = unit.location ? unit.location.on_hand : unit.stock;
  const form = useForm<AdjustForm>({
    resolver: zodResolver(adjustFormSchema),
    defaultValues: { mode: "delta", value: "", reason: "manual_adjust", note: "", location_id: defaultLocation || (locations[0] ? String(locations[0].id) : "") },
  });
  const { register, handleSubmit, setValue, setError, control, formState } = form;
  const [mode, value, note] = useWatch({ control, name: ["mode", "value", "note"] });
  const step = unit.unit === "piece" ? 1 : 0.5;
  const numeric = Number(value);
  const resultingDelta = mode === "delta" ? (Number.isFinite(numeric) ? numeric : 0) : Number.isFinite(numeric) ? numeric - Number(current) : 0;
  const decrease = resultingDelta < 0;
  const noteMissing = decrease && !note.trim();

  const nudge = (dir: 1 | -1) => {
    const base = Number.isFinite(numeric) && value !== "" ? numeric : mode === "delta" ? 0 : Number(current);
    const next = base + dir * step;
    setValue("value", unit.unit === "piece" ? String(Math.round(next)) : next.toFixed(3), { shouldValidate: true });
  };

  const submit = handleSubmit(async (values) => {
    setDetail(null);
    if (decrease && !values.note.trim()) {
      setError("note", { message: "الملاحظة مطلوبة عند تخفيض الكمية." });
      return;
    }
    const delta = mode === "delta" ? values.value : (Number(values.value) - Number(current)).toFixed(3);
    try {
      await adjust.mutateAsync({
        product_id: unit.product_id,
        variant_id: unit.variant_id,
        location_id: multi ? Number(values.location_id || (locations[0] ? String(locations[0].id) : "")) || null : null,
        ...(mode === "delta" ? { delta: values.value } : { new_quantity: values.value }),
        reason: values.reason,
        note: values.note,
      });
      onApplied(unit, delta);
      toast.success("تم تحديث المخزون");
      onClose();
    } catch (e) {
      if (isApiError(e)) {
        let placed = false;
        for (const [k, msgs] of Object.entries(e.fields ?? {})) {
          const key = k === "delta" || k === "new_quantity" ? "value" : k;
          if (["value", "reason", "note", "location_id"].includes(key)) {
            setError(key as keyof AdjustForm, { message: msgs[0] });
            placed = true;
          }
        }
        if (!placed) setDetail(e.status === 409 ? "تغيّرت الكمية من مستخدم آخر — أُعيد تحميل القيمة الحالية." : e.userMessage);
      } else setDetail("تعذّر الاتصال. أعد المحاولة.");
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate data-testid="adjust-form">
      <p className="text-sm text-muted-foreground">
        الكمية الحالية{unit.location ? " في الموقع" : ""}: <Mono className="text-foreground">{formatQty(current, unit.unit)}</Mono> {UNIT_LABELS[unit.unit]}
        {unit.location ? (
          <>
            {" "}
            · المحجوز <Mono>{formatQty(unit.location.reserved, unit.unit)}</Mono> · المتاح <Mono>{formatQty(unit.location.available, unit.unit)}</Mono>
          </>
        ) : null}
      </p>

      <div role="radiogroup" aria-label="طريقة التعديل" className="inline-flex rounded-lg border border-border p-1">
        {(["delta", "new_quantity"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setValue("mode", m)}
            className={cn("min-h-9 rounded-md px-3 text-sm", mode === m ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground")}
          >
            {m === "delta" ? "فرق (±)" : "كمية جديدة"}
          </button>
        ))}
      </div>

      <Field label={mode === "delta" ? "الفرق" : "الكمية الجديدة"} htmlFor={`${id}-value`} error={formState.errors.value?.message} hint={unit.unit === "piece" ? undefined : "حتى 3 خانات عشرية"} required>
        <div className="flex items-stretch gap-2">
          <Button type="button" variant="outline" className="h-11 w-11 shrink-0 p-0 md:h-9 md:w-9" aria-label="إنقاص" onClick={() => nudge(-1)}>
            <Minus className="size-4" aria-hidden />
          </Button>
          <input id={`${id}-value`} dir="ltr" inputMode="decimal" {...register("value")} aria-invalid={Boolean(formState.errors.value)} className={cn(numericInputClass, "h-11 md:h-9")} placeholder={mode === "delta" ? "+12" : formatQty(current, unit.unit)} data-testid="adjust-value" />
          <Button type="button" variant="outline" className="h-11 w-11 shrink-0 p-0 md:h-9 md:w-9" aria-label="زيادة" onClick={() => nudge(1)}>
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>
      </Field>
      {value && Number.isFinite(numeric) ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          النتيجة: <Mono className="text-foreground">{formatQty(String(Number(current) + resultingDelta), unit.unit)}</Mono>
          {decrease ? <span className="text-warning"> — تخفيض، الملاحظة مطلوبة</span> : null}
        </p>
      ) : null}

      <Field label="السبب" htmlFor={`${id}-reason`} error={formState.errors.reason?.message} required>
        <Controller
          control={control}
          name="reason"
          render={({ field }) => (
            <NativeSelect id={`${id}-reason`} value={field.value} onChange={(e) => field.onChange(e.target.value)} className="h-11 md:h-9" data-testid="adjust-reason">
              {MANUAL_REASONS.map((r) => (
                <option key={r} value={r}>
                  {MOVEMENT_REASON_LABELS[r]}
                </option>
              ))}
            </NativeSelect>
          )}
        />
      </Field>

      {multi ? (
        <Field label="الموقع" htmlFor={`${id}-location`} error={formState.errors.location_id?.message} required>
          <Controller
            control={control}
            name="location_id"
            render={({ field }) => (
              <NativeSelect id={`${id}-location`} value={field.value} onChange={(e) => field.onChange(e.target.value)} className="h-11 md:h-9" data-testid="adjust-location">
                {locations.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          />
        </Field>
      ) : null}

      <Field label={decrease ? "الملاحظة" : "ملاحظة (اختياري)"} htmlFor={`${id}-note`} error={formState.errors.note?.message} required={decrease}>
        <textarea id={`${id}-note`} rows={2} {...register("note")} aria-invalid={Boolean(formState.errors.note)} className={cn(inputClass, "h-auto py-2")} placeholder="سبب التغيير كما سيظهر في الدفتر" data-testid="adjust-note" />
      </Field>

      {detail ? (
        <p role="alert" className="text-sm text-destructive" data-testid="adjust-detail">
          {detail}
        </p>
      ) : null}

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="h-11 flex-1 md:h-9" disabled={adjust.isPending || noteMissing} data-testid="adjust-submit">
          حفظ التعديل
        </Button>
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
