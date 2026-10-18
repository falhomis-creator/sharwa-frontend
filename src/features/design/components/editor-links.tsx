"use client";

import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { ADDABLE_TYPES, DEVICES, PANEL_TABS, SINGLETON_TYPES } from "@/features/design/schemas";
import type { SectionType } from "@/lib/schemas/store-config";

/** URL state of the editor (nuqs, `history: "replace"`): the panel tab and the preview device. */
export const editorParsers = {
  tab: parseAsStringLiteral(PANEL_TABS).withDefault("identity"),
  device: parseAsStringLiteral(DEVICES).withDefault("desktop"),
};

export function useEditorParams() {
  return useQueryStates(editorParsers, { history: "replace" });
}

/** A link inside the editor that keeps the device and lands on the sections tab. */
export function useEditorHref(path: string): string {
  const [{ device }] = useEditorParams();
  const qs = new URLSearchParams({ tab: "sections" });
  if (device !== "desktop") qs.set("device", device);
  return `${path}?${qs.toString()}`;
}

/** «إضافة قسم» order: the three addable types first, then the singletons (disabled when present). */
export const SECTION_TYPES_ORDER: SectionType[] = [...ADDABLE_TYPES, ...SINGLETON_TYPES];
