import { storeState } from "@/mocks/store-state";

/**
 * The few `StoreSetting` fields other fixtures read (store name in the shell session,
 * WhatsApp + announcement in `/api/v1/config/`). Kept apart from the settings state so the
 * tenant fixture can merge it without seeding the whole settings row (no import cycle):
 * after «حفظ» the shell shows the new name on the next server render (FR-34.12).
 */
export interface SettingsOverlay {
  store_name?: string;
  whatsapp_number?: string;
  announcement_text?: string | null;
  enable_announcement_bar?: boolean;
}

export function settingsOverlay(store: string | null): SettingsOverlay {
  return storeState<SettingsOverlay>(store, "settings:overlay", () => ({}));
}
