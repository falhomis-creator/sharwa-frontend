import { settingsWrite } from "@/mocks/settings/routes";
import { patchShipping } from "@/mocks/settings/state";

/** `PATCH /api/v1/settings/shipping/` (M34 §7 — live: INT-010) → the full settings row. */
export const PATCH = settingsWrite("/api/v1/settings/shipping/", true, patchShipping);
