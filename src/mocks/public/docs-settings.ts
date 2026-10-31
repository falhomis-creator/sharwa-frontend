import type { DocsSettings } from "@/features/docs/schemas/docs-settings";

/** Django's defaults: every switch on (the portal as it ships today). */
export function docsSettingsMock(): DocsSettings {
  return {
    enable_docs_portal: true,
    enable_merchant_guide: true,
    enable_help_center: true,
    enable_dev_portal: true,
    enable_owner_console_guide: true,
  };
}
