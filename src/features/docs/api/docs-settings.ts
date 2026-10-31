import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";
import { PLATFORM_TAG } from "@/lib/cache";
import { DocsSettingsSchema, type DocsSettings } from "@/features/docs/schemas/docs-settings";
import { docsSettingsMock } from "@/mocks/public/docs-settings";

export { isSectionEnabled, SECTION_FLAG, type DocsSection } from "@/features/docs/sections";

export const DOCS_SETTINGS_TAG = "docs-settings";

/**
 * Documentation portal switches. Platform-scoped and Django-first, like the landing fetchers:
 * cached for minutes (a switch flipped in the console reaches the portal within about a minute),
 * tagged `platform` + `docs-settings`.
 *
 * Fail-open: if Django is unreachable or answers off-contract, the portal stays visible
 * (Django's own defaults are all `true`). Hiding the docs is an editorial choice, not an
 * access-control boundary.
 */
export async function getDocsSettings(): Promise<DocsSettings> {
  "use cache";
  cacheLife("minutes");
  cacheTag(PLATFORM_TAG, DOCS_SETTINGS_TAG);

  try {
    const res = await fetch(`${UPSTREAM_ORIGIN}/api/v1/public/docs-settings/`, {
      headers: { accept: "application/json" },
    });
    if (res.ok) {
      const parsed = DocsSettingsSchema.safeParse(await res.json());
      if (parsed.success) return parsed.data;
      console.info("[docs] docs-settings payload did not match the contract — using defaults");
    }
  } catch {
    console.info("[docs] docs-settings endpoint unreachable — using defaults");
  }
  return docsSettingsMock();
}
