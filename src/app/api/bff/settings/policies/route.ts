import { settingsWrite } from "@/mocks/settings/routes";
import { patchPolicies } from "@/mocks/settings/state";

/** `PATCH /api/v1/settings/policies/` (M34 §7 — `[NEEDS BACKEND]`) → the full settings row. */
export const PATCH = settingsWrite(false, patchPolicies);
