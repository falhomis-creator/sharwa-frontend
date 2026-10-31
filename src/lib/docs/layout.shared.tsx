import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { isSectionEnabled } from "@/features/docs/sections";
import type { DocsSettings } from "@/features/docs/schemas/docs-settings";

/**
 * Shared nav for every portal; labels follow the portal's language (spec §8.4).
 * No `githubUrl` and no "Edit on GitHub" link: the repository is private (fares, 2026-10-31).
 * Top links follow the section switches (platform console → docs settings): a hidden section has no link.
 */
export function baseOptions(lang: "ar" | "en", settings?: DocsSettings): BaseLayoutProps {
  const ar = lang === "ar";
  return {
    nav: {
      title: (
        <span className="font-semibold">{ar ? "توثيق شروة" : "Sharwa Docs"}</span>
      ),
      url: "/docs",
    },
    links: [
      { section: "merchant", text: ar ? "دليل التاجر" : "Merchant guide", url: "/docs/merchant" },
      { section: "help", text: ar ? "مركز المساعدة" : "Help centre", url: "/docs/help" },
      { section: "developer", text: ar ? "للمطورين" : "Developers", url: "/docs/developer" },
    ]
      .filter((l) => !settings || isSectionEnabled(settings, l.section))
      .map(({ text, url }) => ({ text, url, active: "nested-url" as const })),
  };
}
