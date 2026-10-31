import type { Metadata } from "next";
import { DocsSettingsScreen } from "@/features/platform-admin/components/docs/docs-settings-screen";

export const metadata: Metadata = { title: "إظهار بوابة التوثيق" };

/** `console.<base>/docs-settings` — documentation portal switches (core.PlatformDocsSettings). */
export default function DocsSettingsPage() {
  return <DocsSettingsScreen />;
}
