import { z } from "zod";

/**
 * Documentation portal switches (`core.PlatformDocsSettings`) as the console reads and writes
 * them: `GET|PATCH /api/v1/platform/docs-settings/`. Reads are open to both roles; only
 * «مالك المنصة» writes (area `docs`). The public portal reads the same five flags from
 * `GET /api/v1/public/docs-settings/` (src/features/docs/schemas/docs-settings.ts).
 */
export const DOCS_FLAGS = [
  "enable_docs_portal",
  "enable_merchant_guide",
  "enable_help_center",
  "enable_dev_portal",
  "enable_owner_console_guide",
] as const;
export type DocsFlag = (typeof DOCS_FLAGS)[number];

export const docsSettingsSchema = z.object({
  enable_docs_portal: z.boolean(),
  enable_merchant_guide: z.boolean(),
  enable_help_center: z.boolean(),
  enable_dev_portal: z.boolean(),
  enable_owner_console_guide: z.boolean(),
  updated_at: z.string(),
});
export type DocsSettings = z.infer<typeof docsSettingsSchema>;
export type DocsSettingsPatch = Partial<Record<DocsFlag, boolean>>;

/** Row copy for the screen, in display order. `path` is the portal URL on the platform origin. */
export const DOCS_FLAG_ROWS: ReadonlyArray<{ key: DocsFlag; title: string; description: string; path: string }> = [
  { key: "enable_docs_portal", title: "بوابة التوثيق كاملة", description: "عند الإيقاف يُحوَّل كل من يفتح /docs إلى الصفحة الرئيسية، وتختفي الأقسام الأربعة.", path: "/docs" },
  { key: "enable_merchant_guide", title: "دليل التاجر", description: "بطاقة «دليل التاجر» وصفحاته لمالك المتجر والموظفين.", path: "/docs/merchant" },
  { key: "enable_help_center", title: "مركز المساعدة", description: "بطاقة «مركز المساعدة»: المشتري والمندوب وعميل شروة باي.", path: "/docs/help" },
  { key: "enable_dev_portal", title: "بوابة المطورين", description: "بطاقة «Developer portal» ومرجع /api/v1 والويبهوكس.", path: "/docs/developer" },
  { key: "enable_owner_console_guide", title: "دليل لوحة مالك المنصة", description: "بطاقة «لوحة مالك المنصة» لمالك المنصة والمشرف التشغيلي.", path: "/docs/console" },
];
