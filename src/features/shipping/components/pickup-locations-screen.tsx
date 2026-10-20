"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowDown, ArrowUp, GripVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Ltr, Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { translateToString } from "@/lib/dnd";
import { normalizePhone, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { applyFieldErrors } from "@/features/settings/hooks/use-section-save";
import { usePickupWrites, usePickups, useReorderPickups } from "@/features/shipping/api";
import { pickupFormSchema, type Pickup, type PickupForm } from "@/features/shipping/schemas";
import { ActiveDot, ConfirmDelete, FormSheet, OwnerGate, SheetActions, ShippingSubnav, ghostButton, primaryButton } from "@/features/shipping/components/bits";

/**
 * `/dashboard/shipping/pickup-locations` (US-15.2): name, address, phone (LTR Mono),
 * active, `sort_order` — reordered by drag (dnd-kit, keyboard sensor too) or the ↑↓
 * buttons → `POST …/reorder {ordered_ids}`. M22 locations flagged `is_pickup_point` get
 * the hint «هذا الموقع نقطة استلام أيضاً» with a link — never copied in (§3 US-15.2.2).
 */
export function PickupLocationsScreen() {
  return (
    <AccessGate feature="pickuplocation">
      <OwnerGate>
        <PickupsBody />
      </OwnerGate>
    </AccessGate>
  );
}

function PickupsBody() {
  const query = usePickups({ page_size: 100 });
  const reorder = useReorderPickups();
  const writes = usePickupWrites();
  const [openId, setOpenId] = useQueryState("pickup", parseAsString.withOptions({ history: "replace" }));
  const [deleting, setDeleting] = useState<Pickup | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const list = query.data?.results ?? [];
  const editing = openId && openId !== "new" ? list.find((p) => String(p.id) === openId) : undefined;

  const move = (ids: number[]) => reorder.mutate(ids, { onSuccess: () => toast.success("حُفظ الترتيب."), onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الترتيب؛ أُعيدت القائمة كما كانت.") });
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = list.map((p) => p.id);
    move(arrayMove(ids, ids.indexOf(Number(e.active.id)), ids.indexOf(Number(e.over.id))));
  };
  const step = (index: number, dir: -1 | 1) => {
    const ids = list.map((p) => p.id);
    const to = index + dir;
    if (to >= 0 && to < ids.length) move(arrayMove(ids, index, to));
  };
  const add = (
    <button type="button" className={primaryButton} onClick={() => void setOpenId("new")} data-testid="add-pickup">
      <Plus className="size-4" aria-hidden /> نقطة استلام
    </button>
  );

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="pickups-screen">
      <PageHeader title="نقاط الاستلام" description="أماكن يستلم منها العميل طلبه بنفسه؛ الترتيب هنا هو ترتيبها في صفحة الدفع." actions={list.length > 0 ? add : undefined} />
      <ShippingSubnav />

      {query.data && query.data.pickup_point_locations.length > 0 ? (
        <ul className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3 text-sm" data-testid="pickup-point-hint">
          {query.data.pickup_point_locations.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-2">
              <Mono className="text-xs text-muted-foreground">{l.code}</Mono>
              <span className="font-medium">{l.name}</span>
              <span className="text-muted-foreground">— هذا الموقع نقطة استلام أيضاً</span>
              <Link href={`/dashboard/locations/${l.id}`} className="inline-flex min-h-11 items-center underline underline-offset-4 lg:min-h-8">
                عرض الموقع
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {query.isPending ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title="لا نقاط استلام — أضف نقطة ليختار العميل الاستلام بنفسه" description="اسم وعنوان ورقم هاتف يراه العميل بعد الطلب." action={add} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ol className="surface-card" aria-label="نقاط الاستلام بالترتيب" data-testid="pickups-list">
              {list.map((p, i) => (
                <SortablePickup key={p.id} pickup={p} index={i} count={list.length} onUp={() => step(i, -1)} onDown={() => step(i, 1)} onEdit={() => void setOpenId(String(p.id))} onDelete={() => setDeleting(p)} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <PickupSheet open={openId === "new" || Boolean(editing)} pickup={editing} onOpenChange={(o) => (o ? null : void setOpenId(null))} />
      <ConfirmDelete
        open={deleting !== null}
        title={`حذف «${deleting?.name ?? ""}»؟`}
        description="تختفي من صفحة الدفع، وتُعاد ترقيم النقاط التالية."
        pending={writes.remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          writes.remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("حُذفت نقطة الاستلام.");
              setDeleting(null);
            },
            onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف."),
          })
        }
      />
    </div>
  );
}

function SortablePickup({ pickup, index, count, onUp, onDown, onEdit, onDelete }: { pickup: Pickup; index: number; count: number; onUp: () => void; onDown: () => void; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: pickup.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: translateToString(transform), transition }}
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-card p-2 last:border-0 motion-reduce:transition-none", isDragging && "relative z-10 border border-primary ring-1 ring-primary/20")}
      data-testid="pickup-row"
    >
      <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`اسحب «${pickup.name}»`} className="flex size-11 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8">
        <GripVertical className="size-4" aria-hidden />
      </button>
      <Mono className="w-6 shrink-0 text-center text-xs text-muted-foreground" data-testid="pickup-order">
        {pickup.sort_order}
      </Mono>
      <span className="flex min-w-0 flex-1 basis-48 flex-col text-sm">
        <span className="truncate font-medium" data-testid="pickup-name">
          {pickup.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">{pickup.address}</span>
      </span>
      {pickup.phone ? <Ltr className="font-mono text-xs tabular-nums text-muted-foreground">{prettyPhone(pickup.phone)}</Ltr> : null}
      <ActiveDot active={pickup.is_active} />
      <span className="ms-auto flex shrink-0 items-center">
        <button type="button" className={`${ghostButton} w-11 px-0 lg:w-8`} aria-label="رفع" disabled={index === 0} onClick={onUp} data-testid="pickup-up">
          <ArrowUp className="size-4" aria-hidden />
        </button>
        <button type="button" className={`${ghostButton} w-11 px-0 lg:w-8`} aria-label="خفض" disabled={index === count - 1} onClick={onDown} data-testid="pickup-down">
          <ArrowDown className="size-4" aria-hidden />
        </button>
        <button type="button" className={ghostButton} onClick={onEdit} data-testid="pickup-edit">
          تعديل
        </button>
        <button type="button" className={`${ghostButton} text-destructive`} onClick={onDelete} data-testid="pickup-delete">
          حذف
        </button>
      </span>
    </li>
  );
}

const EMPTY: PickupForm = { name: "", address: "", phone: "", is_active: true };

function PickupSheet({ open, pickup, onOpenChange }: { open: boolean; pickup?: Pickup; onOpenChange: (o: boolean) => void }) {
  const writes = usePickupWrites();
  const form = useForm<PickupForm>({ resolver: zodResolver(pickupFormSchema), defaultValues: EMPTY });
  const { register, control, handleSubmit, reset, formState, setValue } = form;
  useEffect(() => {
    if (open) reset(pickup ? { name: pickup.name, address: pickup.address, phone: pickup.phone, is_active: pickup.is_active } : EMPTY);
  }, [open, pickup, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await writes.save.mutateAsync({ id: pickup?.id ?? null, body: values });
      toast.success(pickup ? "حُفظت نقطة الاستلام." : "أُضيفت نقطة الاستلام في آخر الترتيب.");
      onOpenChange(false);
    } catch (e) {
      if (!applyFieldErrors(form, e)) toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  });

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={pickup ? "تعديل نقطة الاستلام" : "نقطة استلام جديدة"} description="تظهر للعميل في صفحة الدفع وفي رسالة الطلب." testId="pickup-form">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
        <Field label="الاسم" htmlFor="pickup-name" required error={formState.errors.name?.message}>
          <input id="pickup-name" className={inputClass} aria-invalid={Boolean(formState.errors.name)} {...register("name")} />
        </Field>
        <Field label="العنوان" htmlFor="pickup-address" required error={formState.errors.address?.message}>
          <input id="pickup-address" className={inputClass} aria-invalid={Boolean(formState.errors.address)} {...register("address")} />
        </Field>
        <Field label="الهاتف" htmlFor="pickup-phone" error={formState.errors.phone?.message} hint="بالصيغة الدولية؛ يُحوَّل الرقم المحلي تلقائياً عند الخروج من الحقل.">
          <input
            id="pickup-phone"
            dir="ltr"
            inputMode="tel"
            placeholder="967770000000"
            className={`${inputClass} font-mono text-start`}
            aria-invalid={Boolean(formState.errors.phone)}
            {...register("phone", { onBlur: (e: React.FocusEvent<HTMLInputElement>) => e.target.value.trim() && setValue("phone", normalizePhone(e.target.value), { shouldValidate: true }) })}
          />
        </Field>
        <div className="surface-card px-3">
          <Controller control={control} name="is_active" render={({ field }) => <ToggleRow id="pickup-active" label="نشطة" description="المعطّلة لا تظهر للعميل ولا في التحويل إلى استلام." checked={field.value} onCheckedChange={field.onChange} />} />
        </div>
        <SheetActions onCancel={() => onOpenChange(false)} submitLabel={pickup ? "حفظ" : "إضافة"} pending={formState.isSubmitting} testId="pickup-submit" />
      </form>
    </FormSheet>
  );
}
