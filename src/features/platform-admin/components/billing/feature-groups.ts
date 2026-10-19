import { MODULE_GROUPS, OTHER_GROUP, type Feature } from "@/features/platform-admin/schemas";

/** The catalogue in sidebar order (M46 FR-46.03); a key the map does not know lands in «أخرى» (§8). */
export function groupFeatures<T extends Pick<Feature, "code" | "module_group">>(features: T[]): Array<{ key: string; label: string; items: T[] }> {
  const groups: Array<{ key: string; label: string; items: T[] }> = MODULE_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    items: (g.codes as readonly string[]).map((c) => features.find((f) => f.code === c)).filter((f): f is T => Boolean(f)),
  }));
  const known = new Set(MODULE_GROUPS.flatMap((g) => g.codes as readonly string[]));
  const other = features.filter((f) => !known.has(f.code));
  if (other.length) groups.push({ key: OTHER_GROUP.key, label: OTHER_GROUP.label, items: other });
  return groups.filter((g) => g.items.length > 0);
}
