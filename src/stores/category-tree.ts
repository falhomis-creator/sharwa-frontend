import { create } from "zustand";

/**
 * Category-tree drag state (M05 §5 «حالات السحب»: idle · dragging · over(target, position)
 * · saving · error) and the collapsed nodes. Browser-only, so Zustand (constitution IX).
 */
export type TreeDragPhase = "idle" | "dragging" | "saving" | "error";

interface CategoryTreeStore {
  phase: TreeDragPhase;
  activeId: number | null;
  overId: number | null;
  offsetX: number;
  collapsed: number[];
  setPhase: (phase: TreeDragPhase) => void;
  startDrag: (id: number) => void;
  moveDrag: (overId: number | null, offsetX: number) => void;
  endDrag: () => void;
  toggleCollapsed: (id: number) => void;
}

export const useCategoryTreeStore = create<CategoryTreeStore>()((set) => ({
  phase: "idle",
  activeId: null,
  overId: null,
  offsetX: 0,
  collapsed: [],
  setPhase: (phase) => set({ phase }),
  startDrag: (id) => set({ phase: "dragging", activeId: id, overId: id, offsetX: 0 }),
  moveDrag: (overId, offsetX) => set({ overId, offsetX }),
  endDrag: () => set({ activeId: null, overId: null, offsetX: 0 }),
  toggleCollapsed: (id) =>
    set((s) => ({ collapsed: s.collapsed.includes(id) ? s.collapsed.filter((x) => x !== id) : [...s.collapsed, id] })),
}));
