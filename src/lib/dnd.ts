
/**
 * `CSS.Transform.toString` without importing `@dnd-kit/utilities` directly (it is only a
 * transitive dependency of @dnd-kit/sortable, not one of ours).
 */
export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export function transformToString(t: Transform | null): string | undefined {
  if (!t) return undefined;
  return `translate3d(${Math.round(t.x)}px, ${Math.round(t.y)}px, 0) scaleX(${t.scaleX}) scaleY(${t.scaleY})`;
}

/** Translate only — for vertical lists where scaling would distort text. */
export function translateToString(t: Transform | null): string | undefined {
  if (!t) return undefined;
  return `translate3d(${Math.round(t.x)}px, ${Math.round(t.y)}px, 0)`;
}
