"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowDown, ArrowLeft, ArrowUp, GripVertical, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { translateToString } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import { useEditorHref } from "@/features/design/components/editor-links";
import { checkImage, formatBytes, readAsDataUrl } from "@/features/design/image-file";
import {
  ALLOWED_FORMATS_MESSAGE,
  isSingleton,
  SECTION_TYPE_LABELS,
  sectionErrors,
  type DesignCategory,
  type DraftSection,
  type SectionItem,
} from "@/features/design/schemas";
import { useDesignStore } from "@/features/design/store";

/**
 * `/dashboard/design/sections/[id]` — the section editor that slides over the start panel
 * (M08 §6). One form per `section_type`, validated locally with the same `content_data`
 * shape the server checks (FR-08.06); every keystroke updates the draft (and the preview).
 * Esc closes it (handled by the editor shell).
 */
export function SectionEditor({ sectionId, categories }: { sectionId: number; categories: DesignCategory[] | null }) {
  const section = useDesignStore((s) => s.sections.find((r) => r.id === sectionId));
  const serverErrors = useDesignStore((s) => s.serverErrors.sections[sectionId]);
  const update = useDesignStore((s) => s.updateSection);
  const remove = useDesignStore((s) => s.removeSection);
  const back = useEditorHref("/dashboard/design");
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  if (!section) {
    return (
      <div className="flex flex-col items-start gap-3 p-4" data-testid="section-editor-missing">
        <p className="text-sm">هذا القسم غير موجود في المسودة — ربما حُذف أو لم يُنشر بعد.</p>
        <Link href={back} className={cn(buttonVariants({ variant: "outline" }), "h-11 md:h-8")}>
          العودة إلى الأقسام
        </Link>
      </div>
    );
  }

  const ids = categories ? new Set(categories.map((c) => c.id)) : null;
  const errors = { ...serverErrors, ...sectionErrors(section, ids) };
  const name = section.label || SECTION_TYPE_LABELS[section.section_type];
  const setSettings = (patch: Record<string, unknown>) => update(section.id, { settings: { ...section.settings, ...patch } });
  const setContent = (patch: Record<string, unknown>) => update(section.id, { content_data: { ...section.content_data, ...patch } });
  const singleton = isSingleton(section.section_type);

  return (
    <div className="flex flex-col gap-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-start-4 motion-safe:duration-200" data-testid="section-editor">
      <div className="flex items-center gap-2">
        <Link href={back} aria-label="العودة إلى الأقسام (Esc)" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11 md:size-8")} data-testid="section-editor-back">
          <ArrowLeft className="rtl:rotate-180" aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-sm font-medium">{name}</h3>
          <p className="text-[11px] text-muted-foreground">
            {SECTION_TYPE_LABELS[section.section_type]} · <Mono>{section.section_type}</Mono>
          </p>
        </div>
      </div>

      <Field label="الاسم في اللوحة" htmlFor="section_label" error={errors.label} hint="لا يظهر للزوار.">
        <input id="section_label" className={inputClass} value={section.label} onChange={(e) => update(section.id, { label: e.target.value })} />
      </Field>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        <label className="flex min-h-11 items-center justify-between gap-3 px-3 text-sm">
          مفعّل في المتجر
          <Switch checked={section.is_active} onCheckedChange={(v) => update(section.id, { is_active: v })} data-testid="editor-active" />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3 px-3 text-sm">
          يظهر على الجوال
          <Switch checked={section.settings.show_on_mobile !== false} onCheckedChange={(v) => setSettings({ show_on_mobile: v })} data-testid="editor-mobile" />
        </label>
      </div>

      <TypeForm section={section} errors={errors} categories={categories} setSettings={setSettings} setContent={setContent} />

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="destructive"
          className="h-11 self-start md:h-8"
          disabled={singleton}
          title={singleton ? "عطّله بدلاً من حذفه" : undefined}
          onClick={() => setConfirm(true)}
          data-testid="delete-section"
        >
          <Trash2 aria-hidden />
          حذف القسم
        </Button>
        {singleton ? (
          <p className="text-xs text-muted-foreground" data-testid="singleton-hint">
            قسم مفرد — عطّله بدلاً من حذفه.
          </p>
        ) : null}
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف «{name}»؟</DialogTitle>
            <DialogDescription>يُحذف من المسودة الآن، ومن المتجر عند «نشر».</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="h-11 md:h-8" />}>إلغاء</DialogClose>
            <Button
              variant="destructive"
              className="h-11 md:h-8"
              data-testid="confirm-delete-section"
              onClick={() => {
                setConfirm(false);
                remove(section.id);
                router.push(back);
              }}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TypeForm({
  section,
  errors,
  categories,
  setSettings,
  setContent,
}: {
  section: DraftSection;
  errors: Record<string, string>;
  categories: DesignCategory[] | null;
  setSettings: (p: Record<string, unknown>) => void;
  setContent: (p: Record<string, unknown>) => void;
}) {
  const c = section.content_data;
  const s = section.settings;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  switch (section.section_type) {
    case "product_grid": {
      const id = Number(c.category_id) || "";
      const known = categories?.some((cat) => cat.id === id);
      return (
        <div className="flex flex-col gap-4">
          <Field label="العنوان" htmlFor="pg_title" error={errors.title}>
            <input id="pg_title" className={inputClass} value={str(c.title)} onChange={(e) => setContent({ title: e.target.value })} />
          </Field>
          <Field label="التصنيف" htmlFor="pg_category" error={errors.category_id}>
            <NativeSelect
              id="pg_category"
              className="h-11 md:h-8"
              value={known || !id ? String(id) : "__deleted"}
              onChange={(e) => setContent({ category_id: e.target.value && e.target.value !== "__deleted" ? Number(e.target.value) : null })}
              aria-invalid={Boolean(errors.category_id)}
              data-testid="category-picker"
            >
              <option value="">اختر تصنيفاً</option>
              {id && !known && categories ? <option value="__deleted">تصنيف محذوف (#{id})</option> : null}
              {(categories ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.parent_id ? `— ${cat.name}` : cat.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="عدد المنتجات" htmlFor="pg_limit" error={errors.limit}>
            <input id="pg_limit" inputMode="numeric" dir="ltr" className={numericInputClass} value={String(c.limit ?? "")} onChange={(e) => setContent({ limit: e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")) })} />
          </Field>
        </div>
      );
    }
    case "slider":
    case "banner_grid":
      return <ItemsEditor items={(c.items as SectionItem[] | undefined) ?? []} errors={errors} onChange={(items) => setContent({ items })} />;
    case "hero":
      return (
        <div className="flex flex-col gap-4">
          <Field label="العنوان" htmlFor="hero_title" error={errors.title} hint="فارغ = اسم المتجر.">
            <input id="hero_title" className={inputClass} value={str(c.title)} onChange={(e) => setContent({ title: e.target.value })} />
          </Field>
          <Field label="النص الفرعي" htmlFor="hero_subtitle" error={errors.subtitle}>
            <textarea id="hero_subtitle" rows={2} className={cn(inputClass, "h-auto py-2")} value={str(c.subtitle)} onChange={(e) => setContent({ subtitle: e.target.value })} />
          </Field>
          <Field label="نص الزر" htmlFor="hero_cta" error={errors.cta_text}>
            <input id="hero_cta" className={inputClass} value={str(c.cta_text)} onChange={(e) => setContent({ cta_text: e.target.value })} />
          </Field>
          <Field label="رابط الزر" htmlFor="hero_link" error={errors.link} hint="مثال: /c/5 أو https://…">
            <input id="hero_link" dir="ltr" className={cn(inputClass, "font-mono")} value={str(c.link)} onChange={(e) => setContent({ link: e.target.value })} />
          </Field>
        </div>
      );
    default: {
      const withLimit = section.section_type === "featured_products" || section.section_type === "latest_products";
      return (
        <div className="flex flex-col gap-4">
          <Field label="العنوان" htmlFor="sec_title" error={errors.title}>
            <input id="sec_title" className={inputClass} value={str(s.title)} onChange={(e) => setSettings({ title: e.target.value })} />
          </Field>
          {withLimit ? (
            <Field label="عدد المنتجات" htmlFor="sec_limit" error={errors.limit}>
              <input id="sec_limit" inputMode="numeric" dir="ltr" className={numericInputClass} value={String(s.limit ?? "")} onChange={(e) => setSettings({ limit: e.target.value === "" ? undefined : Number(e.target.value.replace(/\D/g, "")) })} />
            </Field>
          ) : null}
        </div>
      );
    }
  }
}

function ItemsEditor({ items, errors, onChange }: { items: SectionItem[]; errors: Record<string, string>; onChange: (items: SectionItem[]) => void }) {
  // Items carry no id upstream: the sortable ids are their positions, stable during a drag
  // (the move is applied on drop) and every field is controlled from the draft.
  const ids = items.map((_, i) => `item-${i}`);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const move = (from: number, to: number) => onChange(arrayMove(items, from, to));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
  };

  return (
    <div className="flex flex-col gap-3" data-testid="items-editor">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">العناصر</h4>
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-8"
          disabled={items.length >= 12}
          onClick={() => onChange([...items, { image: null, title: "", link: "" }])}
          data-testid="add-item"
        >
          <Plus aria-hidden />
          إضافة عنصر
        </Button>
      </div>
      {errors.items ? <p className="text-xs text-destructive">{errors.items}</p> : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-2">
            {items.map((it, i) => (
              <ItemRow
                key={ids[i]}
                id={ids[i]!}
                item={it}
                index={i}
                count={items.length}
                errors={errors}
                onMove={(to) => move(i, to)}
                onChange={(patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
                onRemove={() => onChange(items.filter((_, j) => j !== i))}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function ItemRow({
  id,
  item,
  index,
  count,
  errors,
  onMove,
  onChange,
  onRemove,
}: {
  id: string;
  item: SectionItem;
  index: number;
  count: number;
  errors: Record<string, string>;
  onMove: (to: number) => void;
  onChange: (patch: Partial<SectionItem>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const file = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const n = index + 1;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: translateToString(transform), transition }}
      className={cn("flex flex-col gap-2 rounded-lg border border-border bg-background p-2", isDragging && "relative z-10 border-foreground")}
      data-testid={`item-${index}`}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`اسحب لإعادة ترتيب العنصر ${n}`}
          className="hidden size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:flex"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <span className="flex-1 text-xs text-muted-foreground">
          العنصر <Mono>{n}</Mono>
        </span>
        <Button type="button" variant="ghost" size="icon" className="size-11 md:size-8" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`نقل العنصر ${n} للأعلى`}>
          <ArrowUp aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-11 md:size-8" disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={`نقل العنصر ${n} للأسفل`}>
          <ArrowDown aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-11 md:size-8" onClick={onRemove} aria-label={`حذف العنصر ${n}`}>
          <Trash2 aria-hidden />
        </Button>
      </div>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => file.current?.click()}
          aria-label={`صورة العنصر ${n}`}
          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border text-muted-foreground hover:bg-muted"
        >
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local data URL / remote preview
            <img src={item.image} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-4" aria-hidden />
          )}
        </button>
        <input
          ref={file}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif"
          className="sr-only"
          aria-label={`رفع صورة العنصر ${n}`}
          data-testid={`item-image-${index}`}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const r = checkImage(f);
            if (!r.ok) {
              setImgError(r.message);
              return;
            }
            setImgError(null);
            setSize(r.size);
            onChange({ image: await readAsDataUrl(r.file) });
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input aria-label={`عنوان العنصر ${n}`} placeholder="العنوان" className={inputClass} value={item.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} aria-invalid={Boolean(errors[`items.${index}.title`])} />
          <input aria-label={`رابط العنصر ${n}`} placeholder="/c/5" dir="ltr" className={cn(inputClass, "font-mono")} value={item.link ?? ""} onChange={(e) => onChange({ link: e.target.value })} aria-invalid={Boolean(errors[`items.${index}.link`])} />
        </div>
      </div>
      {imgError || errors[`items.${index}.image`] ? (
        <p role="alert" className="text-xs text-destructive">
          {imgError ?? errors[`items.${index}.image`]}
        </p>
      ) : size !== null ? (
        <p className="text-[11px] text-muted-foreground">
          الصورة <Mono>{formatBytes(size)}</Mono> — تُرفع عند النشر · {ALLOWED_FORMATS_MESSAGE}
        </p>
      ) : null}
      {errors[`items.${index}.title`] ? <p className="text-xs text-destructive">{errors[`items.${index}.title`]}</p> : null}
      {errors[`items.${index}.link`] ? <p className="text-xs text-destructive">{errors[`items.${index}.link`]}</p> : null}
      {item.image ? (
        <button type="button" className="self-start text-xs text-muted-foreground underline underline-offset-4" onClick={() => onChange({ image: null })}>
          إزالة الصورة
        </button>
      ) : null}
    </li>
  );
}
