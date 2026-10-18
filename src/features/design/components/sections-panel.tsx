"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowDown, ArrowUp, EyeOff, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { translateToString } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import { SECTION_TYPES_ORDER, useEditorHref } from "@/features/design/components/editor-links";
import { isDeletedCategory, isSingleton, SECTION_TYPE_LABELS, type DraftSection } from "@/features/design/schemas";
import { useDesignStore } from "@/features/design/store";
import type { SectionType } from "@/lib/schemas/store-config";

/**
 * «الأقسام» tab (US-08.3): the home sections in order. Drag by the handle (dnd-kit; Space +
 * arrows on the keyboard), or the up/down buttons on phones — no long-press drag (M08 §6).
 * Changes stay in the draft; «نشر» sends the writes and one `reorder` with every id.
 */
export function SectionsPanel({ categoryIds, compact }: { categoryIds: ReadonlySet<number> | null; compact: boolean }) {
  const sections = useDesignStore((s) => s.sections);
  const move = useDesignStore((s) => s.moveSection);
  const failed = useDesignStore((s) => s.failed);
  const [adding, setAdding] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const active = sections.filter((s) => s.is_active).length;

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = sections.findIndex((s) => s.id === e.active.id);
    const to = sections.findIndex((s) => s.id === e.over!.id);
    move(from, to);
  };

  return (
    <div className="flex flex-col gap-3" data-testid="sections-panel">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h3 className="text-sm font-medium">أقسام الصفحة الرئيسية</h3>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">{active}</span> مفعّل من <span className="font-mono tabular-nums">{sections.length}</span>
          </p>
        </div>
        <Button type="button" variant="outline" className="h-11 md:h-8" onClick={() => setAdding(true)} data-testid="add-section">
          <Plus aria-hidden />
          إضافة قسم
        </Button>
      </div>
      {failed?.step === "reorder" ? (
        <p className="text-xs text-warning" role="status" data-testid="reorder-failed">
          لم يُحفظ الترتيب — الترتيب المحلي باقٍ. أعد «نشر».
        </p>
      ) : null}
      {active === 0 ? <EmptyState title="لا أقسام مفعّلة — أضف قسماً أو فعّل البانر الرئيسي" className="p-4 md:p-4" /> : null}
      {sections.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col divide-y divide-border rounded-lg border border-border" data-testid="sections-list" aria-label="ترتيب الأقسام">
              {sections.map((s, i) => (
                <SectionRow
                  key={s.id}
                  section={s}
                  index={i}
                  count={sections.length}
                  compact={compact}
                  deletedCategory={isDeletedCategory(s, categoryIds)}
                  onMove={(to) => move(i, to)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      ) : null}
      <AddSectionDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}

function SectionRow({
  section,
  index,
  count,
  compact,
  deletedCategory,
  onMove,
}: {
  section: DraftSection;
  index: number;
  count: number;
  compact: boolean;
  deletedCategory: boolean;
  onMove: (to: number) => void;
}) {
  const update = useDesignStore((s) => s.updateSection);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const href = useEditorHref(`/dashboard/design/sections/${section.id}`);
  const name = section.label || SECTION_TYPE_LABELS[section.section_type];
  const hiddenOnMobile = section.settings.show_on_mobile === false;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: translateToString(transform), transition }}
      data-testid={`section-row-${section.id}`}
      data-section-type={section.section_type}
      className={cn("flex items-center gap-1 bg-background px-1.5 first:rounded-t-lg last:rounded-b-lg", isDragging && "relative z-10 border border-foreground")}
    >
      {compact ? null : (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`اسحب لإعادة ترتيب «${name}» — المسافة ثم الأسهم`}
          data-testid={`drag-${section.id}`}
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      )}
      <Link href={href} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center py-1.5 ps-1 md:min-h-10" data-testid={`edit-section-${section.id}`}>
        <span className={cn("truncate text-sm", !section.is_active && "text-muted-foreground")}>{name}</span>
        <span className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
          {SECTION_TYPE_LABELS[section.section_type]}
          {section.id < 0 ? <span>· جديد</span> : null}
          {!section.is_active ? <span>· معطّل</span> : null}
        </span>
        {deletedCategory ? <span className="text-[11px] text-destructive">تصنيف محذوف — اختر آخر</span> : null}
      </Link>
      {hiddenOnMobile ? (
        <span className="flex shrink-0 items-center text-muted-foreground" title="مخفي على الجوال" data-testid={`hidden-mobile-${section.id}`}>
          <EyeOff className="size-4" aria-hidden />
          <span className="sr-only">مخفي على الجوال</span>
        </span>
      ) : null}
      {compact ? (
        <span className="flex shrink-0">
          <Button type="button" variant="ghost" size="icon" className="size-11" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`نقل «${name}» للأعلى`}>
            <ArrowUp aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-11" disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={`نقل «${name}» للأسفل`}>
            <ArrowDown aria-hidden />
          </Button>
        </span>
      ) : null}
      <span className="flex min-h-11 shrink-0 items-center px-1 md:min-h-0">
        <Switch checked={section.is_active} onCheckedChange={(v) => update(section.id, { is_active: v })} aria-label={`تفعيل «${name}»`} data-testid={`toggle-${section.id}`} />
      </span>
    </li>
  );
}

function AddSectionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const sections = useDesignStore((s) => s.sections);
  const add = useDesignStore((s) => s.addSection);
  const router = useRouter();
  const editorBase = useEditorHref("/dashboard/design/sections/");
  const exists = (t: SectionType) => sections.some((s) => s.section_type === t);

  const pick = (t: SectionType) => {
    const id = add(t, SECTION_TYPE_LABELS[t]);
    onOpenChange(false);
    router.push(editorBase.replace("/sections/", `/sections/${id}`));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="add-section-dialog">
        <DialogHeader>
          <DialogTitle>إضافة قسم</DialogTitle>
          <DialogDescription>يُضاف في آخر الصفحة؛ رتّبه بالسحب ثم انشر.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {SECTION_TYPES_ORDER.map((t) => {
            const singleton = isSingleton(t);
            const disabled = singleton && exists(t);
            return (
              <li key={t}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(t)}
                  data-testid={`add-type-${t}`}
                  title={disabled ? "قسم مفرد موجود مسبقاً" : undefined}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
                >
                  <span className="flex flex-col">
                    {SECTION_TYPE_LABELS[t]}
                    <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                      {t}
                    </span>
                  </span>
                  {disabled ? <span className="text-xs">قسم مفرد موجود مسبقاً</span> : singleton ? <span className="text-xs text-muted-foreground">مفرد</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
