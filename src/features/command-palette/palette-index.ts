import { NAVIGATION, OVERVIEW_ITEM, SETTINGS_ITEM, type NavGroup } from "@/features/dashboard-shell/navigation";
import type { FeatureKey, PermissionKey } from "@/lib/access";
import { matchScore, normalizeArabic } from "@/lib/i18n/normalize";
import { SECTION_META, SETTINGS_SECTIONS } from "@/features/settings/schemas";

/**
 * The destination index (M48 FR-48.02/03): derived from the ONE navigation file shared with
 * the sidebar, filtered by features and permissions BEFORE display. A blocked destination is
 * absent (never shown disabled) — the sidebar's own rule. `comingSoon` entries stay listed,
 * disabled, as the sidebar shows them.
 */
export interface PageEntry {
  key: string;
  title: string;
  path: string;
  group: string;
  keywords: readonly string[];
  comingSoon: boolean;
  shortcut?: string;
}

export function buildPageIndex(canFeature: (k?: FeatureKey) => boolean, canPermission: (k?: PermissionKey) => boolean): PageEntry[] {
  const out: PageEntry[] = [
    { key: OVERVIEW_ITEM.key, title: OVERVIEW_ITEM.title, path: OVERVIEW_ITEM.path, group: "اللوحة", keywords: OVERVIEW_ITEM.keywords, comingSoon: false },
  ];
  const allowedGroup = (g: NavGroup) => canFeature(g.feature) && canPermission(g.permission);
  for (const g of NAVIGATION) {
    if (!canFeature(g.feature)) continue;
    if (g.items.length === 0) {
      if (g.path && allowedGroup(g)) out.push({ key: g.key, title: g.title, path: g.path, group: g.title, keywords: [], comingSoon: false });
      continue;
    }
    for (const item of g.items) {
      if (!canFeature(item.feature) || !canPermission(item.permission ?? g.permission)) continue;
      out.push({
        key: item.key,
        title: item.title,
        path: item.path,
        group: g.title,
        keywords: item.keywords,
        comingSoon: Boolean(item.comingSoon),
        shortcut: item.shortcut,
      });
    }
  }
  out.push({ key: SETTINGS_ITEM.key, title: SETTINGS_ITEM.title, path: SETTINGS_ITEM.path, group: "الإعدادات", keywords: SETTINGS_ITEM.keywords, comingSoon: false });
  // M34 US-34.1.3: «إعداد: المنطقة الزمنية» opens the section with the field focused.
  for (const key of SETTINGS_SECTIONS) {
    const meta = SECTION_META[key];
    if (!canFeature(meta.feature)) continue;
    for (const f of meta.fields) {
      out.push({
        key: `settings.${key}.${f.id}`,
        title: `إعداد: ${f.label}`,
        path: `/dashboard/settings/${key}#${f.id}`,
        group: `الإعدادات › ${meta.title}`,
        keywords: [f.label, meta.title, ...(f.keywords ?? [])],
        comingSoon: false,
      });
    }
  }
  return out;
}

/** The 15 sidebar groups (plus settings) for the empty palette — first allowed entry of each. */
export function groupEntries(index: PageEntry[]): PageEntry[] {
  const seen = new Set<string>();
  const out: PageEntry[] = [];
  for (const e of index) {
    if (seen.has(e.group) || e.comingSoon || e.key.startsWith("settings.")) continue;
    seen.add(e.group);
    out.push({ ...e, key: `group:${e.group}`, title: e.group });
  }
  return out;
}

export function rankPages(index: PageEntry[], query: string, limit = 8): PageEntry[] {
  return index
    .map((e) => ({ e, s: matchScore(query, [e.title, e.group, ...e.keywords]) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.e.title.length - b.e.title.length)
    .slice(0, limit)
    .map((x) => x.e);
}

/** FR-48.06: what the query looks like decides the group order. */
export type QueryKind = "actions" | "order" | "phone" | "sku" | "text" | "empty";

export function detectQuery(raw: string): QueryKind {
  const q = normalizeArabic(raw);
  if (!q) return "empty";
  if (q.startsWith(">")) return "actions";
  if (/^shw-/i.test(q)) return "sku";
  const digits = q.replace(/[\s+()-]/g, "");
  if (q.startsWith("#") || (/^\d+$/.test(digits) && digits.length <= 6)) return "order";
  if (/^\+?\d{7,}$/.test(digits)) return "phone";
  return "text";
}
