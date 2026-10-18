"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Folder, GripVertical, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { translateToString } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { categoryPath, type Category } from "@/features/organization/schemas";
import { orgApi, orgKeys, useCategories, useInvalidateOrganization } from "@/features/organization/api";
import { CategoryEditorSheet } from "@/features/organization/components/category-editor-sheet";
import { computeMoves, descendantsOf, flatten, maxDepth, project, type FlatNode } from "@/features/organization/components/tree-utils";
import { deleteWithUndo } from "@/features/organization/components/undo-delete";
import { useCategoryTreeStore } from "@/stores/category-tree";

/**
 * Category tree (US-05.1, FR-05.01/02, T074). Drag vertically to reorder among siblings;
 * drag horizontally in the direction of the indentation (toward the END side in RTL — where
 * child rows sit) to nest under the row above. The drop target is a 1px `foreground` line
 * at the projected depth. Descendants travel with their parent, so a cycle cannot be
 * formed (US-05.1.2); the server rejects one anyway.
 *
 * Keyboard: focus a handle, `Space` to lift, `↑/↓` to move, `←/→` to change depth,
 * `Space` to drop, `Esc` to cancel — announced through `aria-live` (US-05.1.4).
 * Every save is ONE request with the affected rows, applied optimistically and rolled back
 * on failure (FR-05.02). Mobile and read-only users get «نقل إلى…» instead of dragging.
 */
const INDENT = 24;

function useDirection(): 1 | -1 {
  // RTL: children sit further LEFT, so a negative x offset means «deeper».
  return typeof document !== "undefined" && document.documentElement.dir === "rtl" ? -1 : 1;
}

function Row({
  node,
  canManage,
  collapsed,
  isOverlay = false,
  projectedDepth,
  onToggle,
  onEdit,
  onAddChild,
  onMove,
  onDelete,
}: {
  node: FlatNode;
  canManage: boolean;
  collapsed: boolean;
  isOverlay?: boolean;
  projectedDepth?: number;
  onToggle: () => void;
  onEdit: () => void;
  onAddChild: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled: !canManage,
  });
  const depth = projectedDepth ?? node.depth;

  if (isDragging && !isOverlay) {
    // Drop indicator: a 1px foreground rule at the projected depth.
    return (
      <li ref={setNodeRef} style={{ transform: translateToString(transform), transition }} aria-hidden className="py-2">
        <div className="h-px bg-foreground" style={{ marginInlineStart: depth * INDENT + 8 }} data-testid="drop-indicator" />
      </li>
    );
  }

  return (
    <li
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : { transform: translateToString(transform), transition }}
      className={cn("group flex min-h-11 items-center gap-1 border-b border-border bg-background pe-2 last:border-0", isOverlay && "border border-foreground")}
      data-testid="category-row"
      data-depth={node.depth}
      data-name={node.category.name}
    >
      <span aria-hidden className="w-[calc(var(--depth)*16px)] shrink-0 md:w-[calc(var(--depth)*24px)]" style={{ "--depth": depth } as CSSProperties} />
      {canManage ? (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`اسحب «${node.category.name}»`}
          aria-roledescription="عنصر قابل للسحب"
          className="hidden size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:flex"
          data-testid="drag-handle"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      ) : null}
      {node.childCount > 0 ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `توسيع «${node.category.name}»` : `طيّ «${node.category.name}»`}
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8"
        >
          <ChevronDown className={cn("size-4 transition-transform", collapsed && "rotate-90 rtl:-rotate-90")} aria-hidden />
        </button>
      ) : (
        <span aria-hidden className="size-11 shrink-0 lg:size-8" />
      )}
      {collapsed && node.childCount > 0 ? <Folder className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden /> : null}
      <button type="button" onClick={onEdit} className="min-h-11 min-w-0 flex-1 truncate text-start text-sm lg:min-h-8" title={node.category.name}>
        {node.category.name}
      </button>
      <Mono className="shrink-0 text-xs text-muted-foreground" aria-label={`${node.category.products_count} منتجات`}>
        {node.category.products_count}
      </Mono>
      {canManage && !isOverlay ? (
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={`إجراءات «${node.category.name}»`} className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8">
            <MoreHorizontal className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>تحرير</DropdownMenuItem>
            <DropdownMenuItem onClick={onAddChild}>تصنيف فرعي</DropdownMenuItem>
            <DropdownMenuItem onClick={onMove}>نقل إلى…</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              حذف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}

export function CategoryTree({ canManage }: { canManage: boolean }) {
  const store = useStore();
  const qc = useQueryClient();
  const query = useCategories();
  const invalidate = useInvalidateOrganization();
  const categories = useMemo(() => query.data ?? [], [query.data]);
  const dir = useDirection();
  const { activeId, overId, offsetX, collapsed, phase, startDrag, moveDrag, endDrag, toggleCollapsed, setPhase } = useCategoryTreeStore();
  const [editing, setEditing] = useState<{ category: Category | null; parentId: number | null } | null>(null);
  const [moving, setMoving] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [newName, setNewName] = useState("");

  // M05 §6: `N` opens a new root category (outside inputs and open dialogs).
  useEffect(() => {
    if (!canManage) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      const typing = t instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable);
      if (e.ctrlKey || e.metaKey || e.altKey || typing || document.querySelector("[role=dialog]")) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setEditing({ category: null, parentId: null });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canManage]);

  const skip = useMemo(() => (activeId === null ? new Set<number>() : descendantsOf(categories, activeId)), [activeId, categories]);
  const items = useMemo(() => flatten(categories, collapsed, skip), [categories, collapsed, skip]);
  const projection = activeId !== null && overId !== null ? project(items, activeId, overId, Math.round((dir * offsetX) / INDENT)) : null;
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const depth = maxDepth(categories);

  const coordinateGetter: KeyboardCoordinateGetter = (event, args) => {
    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      event.preventDefault();
      const deeper = (event.code === "ArrowLeft") === (dir === -1);
      return { ...args.currentCoordinates, x: args.currentCoordinates.x + (deeper ? dir : -dir) * INDENT };
    }
    return sortableKeyboardCoordinates(event, args);
  };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter }));

  async function save(moves: Array<{ id: number; parent_id: number | null; sort_order: number }>, next: Category[]) {
    if (moves.length === 0) return;
    const key = orgKeys(store).categories;
    const previous = qc.getQueryData<Category[]>(key);
    qc.setQueryData(key, next);
    setPhase("saving");
    try {
      qc.setQueryData(key, await orgApi.reorderCategories(moves));
      setPhase("idle");
      void invalidate();
    } catch (err) {
      qc.setQueryData(key, previous);
      setPhase("error");
      toast.error(isApiError(err) ? err.userMessage : "تعذّر حفظ الترتيب؛ أُعيدت الشجرة كما كانت.");
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const proj = projection;
    const active = Number(event.active.id);
    const over = event.over ? Number(event.over.id) : null;
    endDrag();
    if (!proj || over === null) {
      setPhase("idle");
      return;
    }
    const { next, moves } = computeMoves(categories, items, active, over, proj.parentId);
    void save(moves, next);
  }

  const announcements = {
    onDragStart: ({ active }: DragStartEvent) => `رُفع «${byId.get(Number(active.id))?.name ?? ""}». استخدم الأسهم للتحريك و← → لتغيير المستوى.`,
    onDragMove: () => undefined,
    onDragOver: ({ over }: { over: { id: string | number } | null }) =>
      over ? `فوق «${byId.get(Number(over.id))?.name ?? ""}»` : undefined,
    onDragEnd: ({ over }: { over: { id: string | number } | null }) => (over ? "أُفلت التصنيف في موضعه الجديد." : "أُلغي النقل."),
    onDragCancel: () => "أُلغي النقل.",
  };

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-9" style={{ marginInlineStart: (i % 3) * INDENT }} />
        ))}
      </div>
    );
  }
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const active = activeId !== null ? items.find((i) => i.id === activeId) : undefined;

  return (
    <div className="flex flex-col gap-3" data-testid="category-tree">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <Mono>{categories.length}</Mono> تصنيفاً<span className="hidden md:inline"> · اسحب للترتيب أو أفلت إلى جهة المسافة البادئة لجعله فرعياً</span>
          {phase === "saving" ? <span className="ms-2">جارٍ الحفظ…</span> : null}
        </p>
        {canManage ? (
          <Button size="lg" className="h-11 gap-1.5 lg:h-9" onClick={() => setEditing({ category: null, parentId: null })} data-testid="new-category">
            <Plus className="size-4" aria-hidden /> تصنيف جديد
          </Button>
        ) : null}
      </div>
      {depth > 3 ? (
        <p role="note" className="text-xs text-warning">
          الشجرة أعمق من 3 مستويات؛ العمق الزائد يصعّب التصفح في المتجر.
        </p>
      ) : null}

      {categories.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-6">
          <p className="font-medium">لا تصنيفات بعد — أنشئ أول تصنيف</p>
          {canManage ? (
            <form
              className="flex max-w-md gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newName.trim()) return;
                try {
                  await orgApi.createCategory({ name: newName.trim(), parent_id: null });
                  setNewName("");
                  await invalidate();
                } catch (err) {
                  toast.error(isApiError(err) ? err.userMessage : "تعذّر الإنشاء.");
                }
              }}
            >
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثال: إلكترونيات" aria-label="اسم أول تصنيف" className="h-11 flex-1 rounded-lg border border-input bg-background px-2.5 text-base outline-none focus-visible:border-ring lg:h-9 lg:text-sm" />
              <Button type="submit" size="lg" className="h-11 lg:h-9">
                إنشاء
              </Button>
            </form>
          ) : null}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          accessibility={{ announcements }}
          onDragStart={(e) => startDrag(Number(e.active.id))}
          onDragMove={(e: DragMoveEvent) => moveDrag(e.over ? Number(e.over.id) : null, e.delta.x)}
          onDragOver={(e) => moveDrag(e.over ? Number(e.over.id) : null, offsetX)}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            endDrag();
            setPhase("idle");
          }}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="rounded-lg border border-border" aria-label="شجرة التصنيفات">
              {items.map((node) => (
                <Row
                  key={node.id}
                  node={node}
                  canManage={canManage}
                  collapsed={collapsed.includes(node.id)}
                  projectedDepth={node.id === activeId ? projection?.depth : undefined}
                  onToggle={() => toggleCollapsed(node.id)}
                  onEdit={() => setEditing({ category: node.category, parentId: node.parentId })}
                  onAddChild={() => setEditing({ category: null, parentId: node.id })}
                  onMove={() => setMoving(node.category)}
                  onDelete={() => setDeleting(node.category)}
                />
              ))}
            </ul>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {active ? (
              <ul className="opacity-95">
                <Row
                  node={{ ...active, depth: 0 }}
                  canManage
                  isOverlay
                  collapsed
                  onToggle={() => {}}
                  onEdit={() => {}}
                  onAddChild={() => {}}
                  onMove={() => {}}
                  onDelete={() => {}}
                />
              </ul>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <CategoryEditorSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        category={editing?.category ?? null}
        defaultParentId={editing?.parentId ?? null}
      />
      {moving ? (
        <MoveDialog
          category={moving}
          categories={categories}
          onClose={() => setMoving(null)}
          onMove={(parentId) => {
            const siblings = categories.filter((c) => c.parent_id === parentId && c.id !== moving.id);
            const next = categories.map((c) => (c.id === moving.id ? { ...c, parent_id: parentId, sort_order: siblings.length } : c));
            void save([{ id: moving.id, parent_id: parentId, sort_order: siblings.length }], next);
            setMoving(null);
          }}
        />
      ) : null}
      {deleting ? <DeleteDialog category={deleting} categories={categories} onClose={() => setDeleting(null)} /> : null}
    </div>
  );
}

function MoveDialog({
  category,
  categories,
  onClose,
  onMove,
}: {
  category: Category;
  categories: Category[];
  onClose: () => void;
  onMove: (parentId: number | null) => void;
}) {
  const blocked = descendantsOf(categories, category.id);
  blocked.add(category.id);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const [target, setTarget] = useState(category.parent_id === null ? "" : String(category.parent_id));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>نقل «{category.name}»</DialogTitle>
        <DialogDescription>ينتقل مع فروعه إلى آخر قائمة التصنيف المختار.</DialogDescription>
        <NativeSelect value={target} onChange={(e) => setTarget(e.target.value)} className="h-11 lg:h-8" aria-label="الوجهة">
          <option value="">— جذر الشجرة —</option>
          {categories
            .filter((c) => !blocked.has(c.id))
            .map((c) => ({ id: c.id, label: categoryPath(c.id, byId) }))
            .sort((a, b) => a.label.localeCompare(b.label, "ar"))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
        </NativeSelect>
        <DialogFooter>
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={onClose}>
            إلغاء
          </Button>
          <Button size="lg" className="h-11 lg:h-9" onClick={() => onMove(target ? Number(target) : null)}>
            نقل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ category, categories, onClose }: { category: Category; categories: Category[]; onClose: () => void }) {
  const invalidate = useInvalidateOrganization();
  const store = useStore();
  const qc = useQueryClient();
  const byId = new Map(categories.map((c) => [c.id, c]));
  const blocked = descendantsOf(categories, category.id);
  blocked.add(category.id);
  const children = categories.filter((c) => c.parent_id === category.id);
  const [productsTo, setProductsTo] = useState<"none" | string>("none");
  const [childrenTo, setChildrenTo] = useState<"grandparent" | "root">("grandparent");
  const [busy, setBusy] = useState(false);
  const empty = category.products_count === 0 && children.length === 0;

  async function remove() {
    setBusy(true);
    try {
      const res = await orgApi.deleteCategory(category.id, productsTo === "none" ? "none" : Number(productsTo), childrenTo);
      toast.success(res.moved_products ? `حُذف التصنيف ونُقل ${res.moved_products} منتجاً` : "حُذف التصنيف");
      await invalidate();
      onClose();
    } catch (err) {
      toast.error(isApiError(err) ? err.userMessage : "تعذّر الحذف.");
    } finally {
      setBusy(false);
    }
  }

  /** An empty leaf is deleted with a 5-second undo instead of a dialog (FR-05.09). */
  function removeWithUndo() {
    deleteWithUndo({
      qc,
      queryKey: orgKeys(store).categories,
      item: category,
      label: category.name,
      request: () => orgApi.deleteCategory(category.id, "none", "grandparent"),
      onSettled: () => void invalidate(),
    });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="delete-category">
        <DialogTitle>حذف «{category.name}»</DialogTitle>
        {empty ? (
          <DialogDescription>التصنيف فارغ؛ يمكنك التراجع خلال 5 ثوانٍ.</DialogDescription>
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            {category.products_count > 0 ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1">
                  لهذا التصنيف <Mono>{category.products_count}</Mono> منتجاً:
                </legend>
                <label className="flex min-h-11 items-center gap-2 lg:min-h-8">
                  <input type="radio" name="products" checked={productsTo === "none"} onChange={() => setProductsTo("none")} />
                  إبقاؤها بلا تصنيف
                </label>
                <label className="flex min-h-11 items-center gap-2 lg:min-h-8">
                  <input type="radio" name="products" checked={productsTo !== "none"} onChange={() => setProductsTo(String(categories.find((c) => !blocked.has(c.id))?.id ?? "none"))} />
                  نقل المنتجات إلى…
                </label>
                {productsTo !== "none" ? (
                  <NativeSelect value={productsTo} onChange={(e) => setProductsTo(e.target.value)} className="h-11 lg:h-8" aria-label="نقل المنتجات إلى" data-testid="reassign-to">
                    {categories
                      .filter((c) => !blocked.has(c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {categoryPath(c.id, byId)}
                        </option>
                      ))}
                  </NativeSelect>
                ) : null}
              </fieldset>
            ) : null}
            {children.length > 0 ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1">
                  وله <Mono>{children.length}</Mono> تصنيفات فرعية ترتفع إلى:
                </legend>
                <label className="flex min-h-11 items-center gap-2 lg:min-h-8">
                  <input type="radio" name="children" checked={childrenTo === "grandparent"} onChange={() => setChildrenTo("grandparent")} />
                  {category.parent_id ? `التصنيف الأب «${byId.get(category.parent_id)?.name ?? ""}»` : "جذر الشجرة"}
                </label>
                <label className="flex min-h-11 items-center gap-2 lg:min-h-8">
                  <input type="radio" name="children" checked={childrenTo === "root"} onChange={() => setChildrenTo("root")} />
                  جذر الشجرة
                </label>
              </fieldset>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="destructive" size="lg" className="h-11 lg:h-9" disabled={busy} onClick={() => (empty ? removeWithUndo() : void remove())} data-testid="confirm-delete-category">
            حذف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
