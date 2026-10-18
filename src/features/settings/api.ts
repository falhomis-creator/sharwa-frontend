"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { settingsSchema, type SettingsSection, SECTION_META, type StoreSettings } from "@/features/settings/schemas";

/**
 * M34 data. ONE query for the whole `StoreSetting` row (`GET /settings/`), tenant-keyed;
 * every section write returns the full row, which replaces the cache — so the hub index,
 * the other sections and the `display_*`/`fx_preview` server values are fresh at once.
 */
export function settingsKey(store: string) {
  return storeKey(store, "settings");
}

export function useSettings() {
  const store = useStore();
  return useQuery({
    queryKey: settingsKey(store),
    queryFn: ({ signal }) => apiFetch("/api/bff/settings", settingsSchema, { signal }),
    staleTime: 30_000,
  });
}

export function useSaveSettings() {
  const store = useStore();
  const qc = useQueryClient();
  return async (section: SettingsSection, body: Record<string, unknown>): Promise<StoreSettings> => {
    const meta = SECTION_META[section];
    const saved = await apiFetch(`/api/bff/settings/${meta.endpoint}`, settingsSchema, {
      method: section === "locations" ? "POST" : "PATCH",
      json: body,
    });
    qc.setQueryData(settingsKey(store), saved);
    // FR-34.12: the shell (store name) and anything derived from the config refresh too.
    void qc.invalidateQueries({ queryKey: storeKey(store, "dashboard") });
    return saved;
  };
}
