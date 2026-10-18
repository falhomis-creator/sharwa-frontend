import { settingsWrite } from "@/mocks/settings/routes";
import { patchSeo } from "@/mocks/settings/state";

/** `PATCH /api/v1/settings/seo/` (M34 §7 — `[NEEDS BACKEND]`) → the full settings row. */
export const PATCH = settingsWrite(false, patchSeo);
