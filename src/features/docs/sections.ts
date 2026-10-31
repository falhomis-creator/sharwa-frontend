import type { DocsSettings } from "@/features/docs/schemas/docs-settings";

/** Portal key → its switch. `internal` has none (it is gated by DOCS_INCLUDE_INTERNAL). */
export const SECTION_FLAG = {
  merchant: "enable_merchant_guide",
  help: "enable_help_center",
  developer: "enable_dev_portal",
  console: "enable_owner_console_guide",
} as const satisfies Record<string, keyof DocsSettings>;

export type DocsSection = keyof typeof SECTION_FLAG;

/** A section is visible only when the portal itself is on and the section's own switch is on. */
export function isSectionEnabled(settings: DocsSettings, section: string): boolean {
  if (!settings.enable_docs_portal) return false;
  const flag = SECTION_FLAG[section as DocsSection];
  return flag ? settings[flag] : true;
}
