import { z } from "zod";

/**
 * Documentation portal switches (Django `core.PlatformDocsSettings`, managed from the platform
 * console). Data Contract of `GET /api/v1/public/docs-settings/`.
 */
export const DocsSettingsSchema = z.object({
  /** The whole portal: off ⇒ `/docs/**` redirects to the home page. */
  enable_docs_portal: z.boolean(),
  /** `/docs/merchant` — «دليل التاجر». */
  enable_merchant_guide: z.boolean(),
  /** `/docs/help` — «مركز المساعدة». */
  enable_help_center: z.boolean(),
  /** `/docs/developer` — Developer portal. */
  enable_dev_portal: z.boolean(),
  /** `/docs/console` — «لوحة مالك المنصة». */
  enable_owner_console_guide: z.boolean(),
});

export type DocsSettings = z.infer<typeof DocsSettingsSchema>;
