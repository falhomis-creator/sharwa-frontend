"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowDown, ArrowLeft, ArrowUp, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { inputClass } from "@/components/shared/field";
import { isApiError } from "@/lib/api-error";
import { translateToString } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useCategories } from "@/features/organization/api";
import { useDeleteRule, useLocations, useReorderRules, useRoutingPreview, useRoutingRules, useSaveRule } from "@/features/locations/api";
import type { RoutingRule } from "@/features/locations/schemas";

/**
 * `/dashboard/locations/routing` (US-22.5): the ordered list of rules — top wins — dragged
 * or moved with the ↑↓ buttons (keyboard-first, no motion when the user prefers none), a
 * live «preview» sentence for a city + category, inline create/edit, delete with confirm.
 * A rule pointing at an inactive location gets the amber dot. Owner only (M22 §2).
 */
export function RoutingScreen() {
  return (
    <AccessGate feature="multi_location">
      <RoutingBody />
    </AccessGate>
  );
}

function RoutingBody() {
  const { session } = useAccess();
  const isOwner = session.kind === "merchant";
  const rules = useRoutingRules();
  const locations = useLocations({ page_size: 100 });
  const categories = useCategories();
  const reorder = useReorderRules();
  const del = useDeleteRule();
  const [editing, setEditing] = useState<RoutingRule | "new" | null>(null);
  const [deleting, setDeleting] = useState<RoutingRule | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const list = rules.data ?? [];
  const move = (ids: number[]) =>
    reorder.mutate(ids, { onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الترتيب؛ أُعيدت القائمة كما كانت.") });
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = list.map((r) => r.id);
    move(arrayMove(ids, ids.indexOf(Number(e.active.id)), ids.indexOf(Number(e.over.id))));
  };
  const step = (index: number, dir: -1 | 1) => {
    const ids = list.map((r) => r.id);
    const to = index + dir;
    if (to < 0 || to >= ids.length) return;
    move(arrayMove(ids, index, to));
  };

  return (
    <div className="flex flex-col gap-6" data-testid="routing-screen">
      <Link href="/dashboard/locations" className="inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:min-h-8">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> كل المواقع
      </Link>
      <PageHeader
        title="قواعد التوجيه"
        description="عند وصول طلب تُفحص القواعد من الأعلى؛ أول قاعدة تطابق المدينة والتصنيف تحدد الموقع الذي يُنفّذ منه."
        actions={
          isOwner ? (
            <Button className="h-11 lg:h-9" onClick={() => setEditing("new")} data-testid="new-rule">
              قاعدة جديدة
            </Button>
          ) : undefined
        }
      />

      <RoutingPreview categories={categories.data ?? []} />

      {rules.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rules.error && !rules.data ? (
        <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title="لا قواعد — كل الطلبات تذهب إلى أول موقع نشط يشحن" description="أضف قاعدة لتوجيه مدينة أو تصنيف إلى موقع محدد." />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <ol className="surface-card" aria-label="قواعد التوجيه بالترتيب" data-testid="rules-list">
              {list.map((r, i) => (
                <SortableRule
                  key={r.id}
                  rule={r}
                  index={i}
                  count={list.length}
                  canManage={isOwner}
                  onUp={() => step(i, -1)}
                  onDown={() => step(i, 1)}
                  onEdit={() => setEditing(r)}
                  onDelete={() => setDeleting(r)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {editing ? (
        <RuleDialog
          rule={editing === "new" ? null : editing}
          locations={(locations.data?.results ?? []).map((l) => ({ id: l.id, code: l.code, name: l.name, is_active: l.is_active }))}
          categories={categories.data ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <Dialog open={deleting !== null} onOpenChange={(o) => (o ? null : setDeleting(null))}>
        <DialogContent>
          <DialogTitle>حذف القاعدة؟</DialogTitle>
          <DialogDescription>{deleting ? ruleSentence(deleting) : ""} — تُعاد ترقيم القواعد التالية تلقائياً.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" className="h-11 lg:h-9" onClick={() => setDeleting(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              className="h-11 lg:h-9"
              disabled={del.isPending}
              onClick={() =>
                deleting &&
                del.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success("حُذفت القاعدة");
                    setDeleting(null);
                  },
                  onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف"),
                })
              }
              data-testid="confirm-delete-rule"
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ruleSentence(r: RoutingRule) {
  const scope = [r.applies_to_city ? `مدينة ${r.applies_to_city}` : null, r.category_name ? `تصنيف «${r.category_name}»` : null].filter(Boolean).join(" و");
  return `${scope || "كل الطلبات"} → ${r.location ? r.location.name : "موقع محذوف"}`;
}

function SortableRule({ rule, index, count, canManage, onUp, onDown, onEdit, onDelete }: { rule: RoutingRule; index: number; count: number; canManage: boolean; onUp: () => void; onDown: () => void; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id, disabled: !canManage });
  const inactive = rule.location ? !rule.location.is_active : true;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: translateToString(transform), transition }}
      className={cn("flex min-h-12 items-center gap-2 border-b border-border bg-card px-2 last:border-0 motion-reduce:transition-none", isDragging && "relative z-10 border border-primary ring-1 ring-primary/20")}
      data-testid="rule-row"
      data-inactive={inactive ? "true" : undefined}
    >
      {canManage ? (
        <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`اسحب القاعدة ${rule.priority}`} className="flex size-11 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8">
          <GripVertical className="size-4" aria-hidden />
        </button>
      ) : null}
      <Mono className="w-6 shrink-0 text-center text-xs text-muted-foreground">{rule.priority}</Mono>
      <span className="flex min-w-0 flex-1 flex-col text-sm">
        <span className="truncate">
          {rule.applies_to_city ? <>مدينة <span className="font-medium">{rule.applies_to_city}</span></> : <span className="text-muted-foreground">كل المدن</span>}
          {" · "}
          {rule.category_name ? <>تصنيف <span className="font-medium">{rule.category_name}</span></> : <span className="text-muted-foreground">كل التصنيفات</span>}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden>→</span>
          {inactive ? <span aria-hidden className="size-2 rounded-full bg-warning" data-testid="inactive-target" /> : null}
          {rule.location ? (
            <>
              <Mono>{rule.location.code}</Mono> {rule.location.name}
              {inactive ? <span className="text-warning">(موقع معطّل — تُتجاوز القاعدة)</span> : null}
            </>
          ) : (
            "موقع محذوف"
          )}
        </span>
      </span>
      {canManage ? (
        <span className="flex shrink-0 items-center">
          <Button type="button" variant="ghost" className="size-11 p-0 lg:size-8" aria-label="رفع القاعدة" disabled={index === 0} onClick={onUp} data-testid="rule-up">
            <ArrowUp className="size-4" aria-hidden />
          </Button>
          <Button type="button" variant="ghost" className="size-11 p-0 lg:size-8" aria-label="خفض القاعدة" disabled={index === count - 1} onClick={onDown} data-testid="rule-down">
            <ArrowDown className="size-4" aria-hidden />
          </Button>
          <Button type="button" variant="ghost" className="h-11 px-2 lg:h-8" onClick={onEdit} data-testid="rule-edit">
            تعديل
          </Button>
          <Button type="button" variant="ghost" className="h-11 px-2 text-destructive lg:h-8" onClick={onDelete} data-testid="rule-delete">
            حذف
          </Button>
        </span>
      ) : null}
    </li>
  );
}

function RoutingPreview({ categories }: { categories: { id: number; name: string }[] }) {
  const id = useId();
  const [city, setCity] = useState("الرياض");
  const [category, setCategory] = useState("");
  const preview = useRoutingPreview(city, category);
  const p = preview.data;
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4" aria-labelledby={`${id}-h`} data-testid="routing-preview">
      <h2 id={`${id}-h`} className="text-sm font-medium">
        جرّب التوجيه
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <label htmlFor={`${id}-city`} className="flex flex-col gap-1 text-xs">
          المدينة
          <input id={`${id}-city`} value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} data-testid="preview-city" />
        </label>
        <label htmlFor={`${id}-cat`} className="flex flex-col gap-1 text-xs">
          التصنيف
          <NativeSelect id={`${id}-cat`} value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 md:h-8" data-testid="preview-category">
            <option value="">أي تصنيف</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      <p className="text-sm" aria-live="polite" data-testid="preview-sentence">
        {!p ? (
          <span className="text-muted-foreground">…</span>
        ) : p.single_location ? (
          "موقع واحد نشط فقط — تذهب كل الطلبات إليه بلا قواعد."
        ) : p.location ? (
          <>
            طلب من <span className="font-medium">{p.city || "أي مدينة"}</span>
            {p.category_name ? <> لتصنيف <span className="font-medium">{p.category_name}</span></> : null} يُنفَّذ من <Mono>{p.location.code}</Mono> <span className="font-medium">{p.location.name}</span>
            {p.rule_id ? <span className="text-muted-foreground"> (القاعدة {p.rule_id})</span> : <span className="text-muted-foreground"> (الافتراضي — لا قاعدة تطابق)</span>}
          </>
        ) : (
          <span className="text-warning">لا موقع نشط يشحن للعميل — الطلب سيتعطل.</span>
        )}
      </p>
    </section>
  );
}

function RuleDialog({ rule, locations, categories, onClose }: { rule: RoutingRule | null; locations: { id: number; code: string; name: string; is_active: boolean }[]; categories: { id: number; name: string }[]; onClose: () => void }) {
  const id = useId();
  const save = useSaveRule();
  const [city, setCity] = useState(rule?.applies_to_city ?? "");
  const [category, setCategory] = useState(rule?.applies_to_category ? String(rule.applies_to_category) : "");
  const [location, setLocation] = useState(rule?.preferred_location ? String(rule.preferred_location) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const target = locations.find((l) => String(l.id) === location);

  const submit = () => {
    setErrors({});
    save.mutate(
      { id: rule?.id ?? null, body: { applies_to_city: city.trim() || null, applies_to_category: category ? Number(category) : null, preferred_location: Number(location) } },
      {
        onSuccess: () => {
          toast.success(rule ? "حُفظت القاعدة" : "أُضيفت القاعدة في آخر الترتيب");
          onClose();
        },
        onError: (e) => {
          if (isApiError(e) && e.fields) setErrors(Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, v[0] ?? ""])));
          else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ");
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogTitle>{rule ? "تعديل القاعدة" : "قاعدة توجيه جديدة"}</DialogTitle>
        <DialogDescription>اترك المدينة أو التصنيف فارغاً ليطابق الكل. القاعدة الجديدة تُضاف في النهاية؛ اسحبها لأعلى لترفع أولويتها.</DialogDescription>
        <div className="flex flex-col gap-3" data-testid="rule-form">
          <label htmlFor={`${id}-city`} className="flex flex-col gap-1 text-xs">
            المدينة
            <input id={`${id}-city`} value={city} onChange={(e) => setCity(e.target.value)} placeholder="كل المدن" className={inputClass} data-testid="rule-city" />
            {errors.applies_to_city ? <span className="text-destructive">{errors.applies_to_city}</span> : null}
          </label>
          <label htmlFor={`${id}-cat`} className="flex flex-col gap-1 text-xs">
            التصنيف
            <NativeSelect id={`${id}-cat`} value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 md:h-8" data-testid="rule-category">
              <option value="">كل التصنيفات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label htmlFor={`${id}-loc`} className="flex flex-col gap-1 text-xs">
            الموقع المفضّل
            <NativeSelect id={`${id}-loc`} value={location} onChange={(e) => setLocation(e.target.value)} className="h-11 md:h-8" aria-invalid={Boolean(errors.preferred_location)} data-testid="rule-location">
              <option value="">اختر موقعاً</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} — {l.name}
                  {l.is_active ? "" : " (معطّل)"}
                </option>
              ))}
            </NativeSelect>
            {errors.preferred_location ? <span className="text-destructive">{errors.preferred_location}</span> : null}
            {target && !target.is_active ? <span className="text-warning">هذا الموقع معطّل؛ ستُتجاوز القاعدة حتى يُفعَّل.</span> : null}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" className="h-11 lg:h-9" onClick={onClose}>
            إلغاء
          </Button>
          <Button className="h-11 lg:h-9" disabled={!location || save.isPending} onClick={submit} data-testid="rule-save">
            {rule ? "حفظ" : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
