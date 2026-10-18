import type { Category } from "@/features/organization/schemas";

/**
 * Flattened-tree helpers for the sortable category tree (dnd-kit "tree" pattern). The
 * dragged node's descendants are removed from the list while it moves, so a category can
 * never be dropped inside its own subtree (M05 US-05.1.2) — the server checks it too.
 */
export interface FlatNode {
  id: number;
  parentId: number | null;
  depth: number;
  category: Category;
  childCount: number;
}

export function childrenOf(categories: Category[], parentId: number | null): Category[] {
  return categories.filter((c) => c.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export function flatten(categories: Category[], collapsed: number[] = [], skipIds: Set<number> = new Set()): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (parentId: number | null, depth: number) => {
    for (const c of childrenOf(categories, parentId)) {
      if (skipIds.has(c.id)) continue;
      const kids = childrenOf(categories, c.id);
      out.push({ id: c.id, parentId, depth, category: c, childCount: kids.length });
      if (!collapsed.includes(c.id)) walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function descendantsOf(categories: Category[], id: number): Set<number> {
  const out = new Set<number>();
  const walk = (pid: number) => {
    for (const c of categories) if (c.parent_id === pid && !out.has(c.id)) {
      out.add(c.id);
      walk(c.id);
    }
  };
  walk(id);
  return out;
}

export function maxDepth(categories: Category[]): number {
  return flatten(categories).reduce((m, n) => Math.max(m, n.depth + 1), 0);
}

/** Where the active node would land given the pointer's horizontal offset (in indents). */
export function project(
  items: FlatNode[],
  activeId: number,
  overId: number,
  depthOffset: number,
): { depth: number; parentId: number | null } | null {
  const activeIndex = items.findIndex((i) => i.id === activeId);
  const overIndex = items.findIndex((i) => i.id === overId);
  if (activeIndex < 0 || overIndex < 0) return null;
  const moved = [...items];
  const [active] = moved.splice(activeIndex, 1);
  moved.splice(overIndex, 0, active!);
  const prev = moved[overIndex - 1];
  const next = moved[overIndex + 1];
  const projected = active!.depth + depthOffset;
  const max = prev ? prev.depth + 1 : 0;
  const min = next ? next.depth : 0;
  const depth = Math.min(Math.max(projected, min), max);
  let parentId: number | null = null;
  if (depth > 0 && prev) {
    if (depth === prev.depth) parentId = prev.parentId;
    else if (depth > prev.depth) parentId = prev.id;
    else {
      const ancestor = moved
        .slice(0, overIndex)
        .reverse()
        .find((i) => i.depth === depth);
      parentId = ancestor?.parentId ?? null;
    }
  }
  return { depth, parentId };
}

/**
 * Apply a move and return every `{id, parent_id, sort_order}` that changed (FR-05.02: one
 * request with the affected rows only).
 */
export function computeMoves(
  categories: Category[],
  items: FlatNode[],
  activeId: number,
  overId: number,
  parentId: number | null,
): { next: Category[]; moves: Array<{ id: number; parent_id: number | null; sort_order: number }> } {
  const activeIndex = items.findIndex((i) => i.id === activeId);
  const overIndex = items.findIndex((i) => i.id === overId);
  const order = [...items];
  const [active] = order.splice(activeIndex, 1);
  order.splice(overIndex, 0, active!);
  // New sibling order under the target parent, following the flattened order.
  const siblingsAfter = order
    .filter((n) => (n.id === activeId ? parentId : n.parentId) === parentId)
    .map((n) => n.id);
  const next = categories.map((c) => ({ ...c }));
  const byId = new Map(next.map((c) => [c.id, c]));
  const moves: Array<{ id: number; parent_id: number | null; sort_order: number }> = [];
  const oldParent = byId.get(activeId)?.parent_id ?? null;
  byId.get(activeId)!.parent_id = parentId;
  siblingsAfter.forEach((id, i) => {
    const c = byId.get(id)!;
    const original = categories.find((x) => x.id === id)!;
    c.sort_order = i;
    if (original.sort_order !== i || original.parent_id !== c.parent_id) moves.push({ id, parent_id: c.parent_id, sort_order: i });
  });
  if (oldParent !== parentId) {
    childrenOf(next, oldParent).forEach((c, i) => {
      if (c.sort_order !== i) {
        c.sort_order = i;
        moves.push({ id: c.id, parent_id: c.parent_id, sort_order: i });
      }
    });
  }
  return { next, moves };
}
