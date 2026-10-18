import { settingsWrite } from "@/mocks/settings/routes";
import { patchPayments } from "@/mocks/settings/state";

/** `PATCH /api/v1/settings/payments/` (M34 §7 — `[NEEDS BACKEND]`) → the full settings row. */
export const PATCH = settingsWrite(true, patchPayments);
