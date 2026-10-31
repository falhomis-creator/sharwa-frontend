import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getDocsSettings } from "@/features/docs/api/docs-settings";
import "./docs.css";

/**
 * Documentation portal (spec 01 v2). Served on the platform origin only: <base>/docs/…
 * Global switch: when `enable_docs_portal` is off (platform console), every /docs URL
 * redirects to the home page. Section switches are applied in PortalLayout and on /docs.
 */
export default async function DocsRootLayout({ children }: { children: ReactNode }) {
  const settings = await getDocsSettings();
  if (!settings.enable_docs_portal) redirect("/");
  return children;
}
