"use client";

import { useState } from "react";
import Link from "next/link";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { isApiError } from "@/lib/api-error";
import { translateToString } from "@/lib/dnd";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { DEFAULT_FULFILLMENT_STATUSES, orderStatusDefInputSchema, type OrderStatusDef } from "@/features/orders/schemas";
import { orderKeys, ordersApi, useOrderStatuses } from "@/features/orders/api";

/**
 * `/dashboard/orders/statuses` (US-06.5, T078): the merchant's fulfilment workflow — name,
 * colour, order (drag), default, «تُحرّر المخزون», «تُكمِل الطلب». The default status cannot
 * be deleted (its delete button stays visible, disabled, with the reason — FR-06.07). A new
 * status shows up in the list filter and in every status menu at once (shared cache).
 */
const SUGGESTED_COLOR = DEFAULT_FULFILLMENT_STATUSES[1].color;

function StatusRow({
  status,
  canEdit,
  onEdit,
  onDelete,
  onMakeDefault,
}: {
  status: OrderStatusDef;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMakeDefault: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: status.id, disabled: !canEdit });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: translateToString(transform), transition }}
      className={`flex min-h-12 flex-wrap items-center gap-2 border-b border-border bg-background px-2 py-1.5 last:border-0 ${isDragging ? "relative z-10 border border-foreground" : ""}`}
      data-testid="status-row"
      data-name={status.name}
    >
      {canEdit ? (
        <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`اسحب «${status.name}»`} className="flex size-11 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8">
          <GripVertical className="size-4" aria-hidden />
        </button>
      ) : null}
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {status.name}
        {status.is_default ? <span className="ms-2 text-xs font-normal text-muted-foreground">· الافتراضية للطلبات الجديدة</span> : null}
      </span>
      <span className="flex gap-2 text-xs text-muted-foreground">
        {status.releases_stock ? <span>تُحرّر المخزون</span> : null}
        {status.marks_completed ? <span>تُكمِل الطلب</span> : null}
      </span>
      <Mono className="w-12 text-end text-xs text-muted-foreground" title="عدد الطلبات على هذه الحالة">
        {status.orders_count}
      </Mono>
      <Mono className="hidden w-20 text-xs text-muted-foreground md:block">{status.color}</Mono>
      {canEdit ? (
        <span className="flex items-center">
          {!status.is_default ? (
            <Button variant="ghost" size="sm" className="h-11 text-xs lg:h-8" onClick={onMakeDefault}>
              اجعلها افتراضية
            </Button>
          ) : null}
          <button type="button" onClick={onEdit} aria-label={`تحرير «${status.name}»`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8">
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={status.is_default}
            title={status.is_default ? "لا تُحذف الحالة الافتراضية؛ عيّن حالة افتراضية أخرى أولاً." : undefined}
            aria-label={`حذف «${status.name}»`}
            className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 lg:size-8"
            data-testid="delete-status"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </span>
      ) : null}
    </li>
  );
}

function StatusDialog({ status, onClose }: { status: OrderStatusDef | null; onClose: () => void }) {
  const store = useStore();
  const qc = useQueryClient();
  const [values, setValues] = useState({
    name: status?.name ?? "",
    color: status?.color ?? SUGGESTED_COLOR,
    is_default: status?.is_default ?? false,
    releases_stock: status?.releases_stock ?? false,
    marks_completed: status?.marks_completed ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    const parsed = orderStatusDefInputSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    if (values.releases_stock && values.marks_completed) {
      setErrors({ marks_completed: "لا تجمع بين «تُحرّر المخزون» و«تُكمِل الطلب»." });
      return;
    }
    setBusy(true);
    try {
      await ordersApi.saveStatus(status?.id ?? null, parsed.data);
      await qc.invalidateQueries({ queryKey: orderKeys(store).all });
      toast.success(status ? "حُفظت الحالة" : `أُضيفت «${parsed.data.name}»`);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
      else toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="status-dialog">
        <DialogTitle>{status ? `تحرير «${status.name}»` : "حالة تنفيذ جديدة"}</DialogTitle>
        <DialogDescription>تظهر في قائمة الحالات وفي فلاتر الطلبات فور الحفظ.</DialogDescription>
        <form
          id="status-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Field label="الاسم" htmlFor="status-name" required error={errors.name} counter={{ value: values.name.length, max: 60 }}>
            <input id="status-name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} className={inputClass} placeholder="مثال: جاهز للاستلام" />
          </Field>
          <Field label="اللون" htmlFor="status-color" error={errors.color}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(values.color) ? values.color : SUGGESTED_COLOR}
                onChange={(e) => setValues({ ...values, color: e.target.value })}
                aria-label="منتقي اللون"
                className="h-11 w-14 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1 md:h-8"
              />
              <input id="status-color" dir="ltr" value={values.color} onChange={(e) => setValues({ ...values, color: e.target.value.trim() })} className={`${inputClass} font-mono`} />
            </div>
          </Field>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border px-3">
            <ToggleRow
              id="status-default"
              label="الافتراضية"
              description="تأخذها الطلبات الجديدة تلقائياً."
              checked={values.is_default}
              disabled={status?.is_default}
              onCheckedChange={(v) => setValues({ ...values, is_default: v })}
            />
            <ToggleRow
              id="status-releases"
              label="تُحرّر المخزون"
              description="نقل الطلب إليها يلغيه ويعيد كمياته للمخزون."
              checked={values.releases_stock}
              onCheckedChange={(v) => setValues({ ...values, releases_stock: v, marks_completed: v ? false : values.marks_completed })}
            />
            <ToggleRow
              id="status-completes"
              label="تُكمِل الطلب"
              description="نقل الطلب إليها يجعله «مكتمل» مالياً."
              checked={values.marks_completed}
              onCheckedChange={(v) => setValues({ ...values, marks_completed: v, releases_stock: v ? false : values.releases_stock })}
            />
          </div>
          {errors.marks_completed || errors.is_default ? <p role="alert" className="text-xs text-destructive">{errors.marks_completed ?? errors.is_default}</p> : null}
        </form>
        <DialogFooter>
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" form="status-form" size="lg" className="h-11 lg:h-9" disabled={busy} data-testid="save-status">
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StatusesScreen() {
  const store = useStore();
  const qc = useQueryClient();
  const query = useOrderStatuses();
  const { canPermission } = useAccess();
  const canEdit = canPermission("orders.update_status");
  const [editing, setEditing] = useState<OrderStatusDef | "new" | null>(null);
  const [deleting, setDeleting] = useState<OrderStatusDef | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const key = orderKeys(store).statuses;

  async function onDragEnd(e: DragEndEvent) {
    const list = query.data;
    if (!list || !e.over || e.active.id === e.over.id) return;
    const ids = list.map((s) => s.id);
    const next = arrayMove(ids, ids.indexOf(Number(e.active.id)), ids.indexOf(Number(e.over.id)));
    const previous = qc.getQueryData<OrderStatusDef[]>(key);
    qc.setQueryData(key, next.map((id, i) => ({ ...list.find((s) => s.id === id)!, sort_order: i })));
    try {
      qc.setQueryData(key, await ordersApi.reorderStatuses(next));
      void qc.invalidateQueries({ queryKey: orderKeys(store).counters });
    } catch (err) {
      qc.setQueryData(key, previous);
      toast.error(isApiError(err) ? err.userMessage : "تعذّر حفظ الترتيب؛ أُعيد كما كان.");
    }
  }

  async function makeDefault(s: OrderStatusDef) {
    try {
      await ordersApi.saveStatus(s.id, { is_default: true });
      await qc.invalidateQueries({ queryKey: key });
      toast.success(`«${s.name}» الافتراضية الآن`);
    } catch (err) {
      toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/orders" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> الطلبات
      </Link>
      <PageHeader
        title="حالات التنفيذ"
        description="مراحل تجهيز الطلب كما تعمل في متجرك. اسحب لترتيبها كما تظهر في القوائم."
        actions={
          canEdit ? (
            <Button size="lg" className="h-11 gap-1.5 lg:h-9" onClick={() => setEditing("new")} data-testid="new-status">
              <Plus className="size-4" aria-hidden /> حالة جديدة
            </Button>
          ) : null
        }
      />
      {query.isLoading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
          <SortableContext items={(query.data ?? []).map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="max-w-3xl rounded-lg border border-border" aria-label="حالات التنفيذ">
              {(query.data ?? []).map((s) => (
                <StatusRow
                  key={s.id}
                  status={s}
                  canEdit={canEdit}
                  onEdit={() => setEditing(s)}
                  onDelete={() => setDeleting(s)}
                  onMakeDefault={() => void makeDefault(s)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {!canEdit ? <p className="text-sm text-muted-foreground">عرض فقط — تعديل الحالات يتطلب صلاحية «تحديث حالة الطلب».</p> : null}

      {editing ? <StatusDialog key={editing === "new" ? "new" : editing.id} status={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <Dialog open onOpenChange={(o) => !o && setDeleting(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogTitle>حذف «{deleting.name}»</DialogTitle>
            <DialogDescription>
              {deleting.orders_count > 0 ? `ينتقل ${deleting.orders_count} طلباً عليها إلى الحالة الافتراضية.` : "لا طلبات على هذه الحالة."}
            </DialogDescription>
            <DialogFooter>
              <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => setDeleting(null)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="h-11 lg:h-9"
                onClick={async () => {
                  try {
                    const res = await ordersApi.deleteStatus(deleting.id);
                    toast.success(res.moved ? `حُذفت الحالة ونُقل ${res.moved} طلباً` : "حُذفت الحالة");
                    await qc.invalidateQueries({ queryKey: orderKeys(store).all });
                    setDeleting(null);
                  } catch (err) {
                    toast.error(isApiError(err) ? err.userMessage : "تعذّر الحذف.");
                  }
                }}
              >
                حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
