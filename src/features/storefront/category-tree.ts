import type { CategoryNode } from "@/features/storefront/schemas/catalog";

/** Find a category anywhere in the tree, with its ancestors (root first). */
export function findCategory(tree: CategoryNode[], id: number, trail: CategoryNode[] = []): { node: CategoryNode; ancestors: CategoryNode[] } | null {
  for (const node of tree) {
    if (node.id === id) return { node, ancestors: trail };
    const hit = findCategory(node.subcategories, id, [...trail, node]);
    if (hit) return hit;
  }
  return null;
}
