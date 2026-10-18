import { settingsWrite } from "@/mocks/settings/routes";
import { setMultiLocation } from "@/mocks/settings/state";

/** `POST /api/v1/settings/multi-location/` `{enabled, merge?}` → 200 / readable 409 (M34 §7). */
export const POST = settingsWrite(true, setMultiLocation);
