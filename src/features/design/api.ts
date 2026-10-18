"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { storeKey } from "@/lib/query-keys";
import { z } from "zod";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  adminSectionListSchema,
  adminSectionSchema,
  announcementSchema,
  designCategoryListSchema,
  presetListSchema,
  reorderResultSchema,
  themeSchema,
  type AdminSection,
  type DraftSection,
} from "@/features/design/schemas";
import {
  announcementChanged,
  draftSectionsOf,
  stable,
  themeChanged,
  useDesignStore,
  type DesignBase,
  type PublishStep,
} from "@/features/design/store";

/**
 * M08 data. Reads are tenant-keyed queries; the ONLY writes are in `usePublish()`, called by
 * «نشر» (FR-08.01): theme → sections (delete/create/update) → reorder → announcement.
 */
export function designKey(store: string, ...parts: string[]) {
  return storeKey(store, "design", ...parts);
}

export function useTheme() {
  const store = useStore();
  return useQuery({ queryKey: designKey(store, "theme"), queryFn: ({ signal }) => apiFetch("/api/bff/store/theme", themeSchema, { signal }), staleTime: 30_000 });
}

export function usePresets() {
  const store = useStore();
  return useQuery({
    queryKey: designKey(store, "presets"),
    queryFn: ({ signal }) => apiFetch("/api/bff/store/theme/presets", presetListSchema, { signal }),
    staleTime: Infinity,
  });
}

export function useAdminSections() {
  const store = useStore();
  return useQuery({
    queryKey: designKey(store, "sections"),
    queryFn: ({ signal }) => apiFetch("/api/bff/admin/sections", adminSectionListSchema, { signal }),
    staleTime: 30_000,
  });
}

export function useAnnouncement() {
  const store = useStore();
  return useQuery({
    queryKey: designKey(store, "announcement"),
    queryFn: ({ signal }) => apiFetch("/api/bff/store/announcement", announcementSchema, { signal }),
    staleTime: 30_000,
  });
}

/** Categories for the `product_grid` picker — the M05 dashboard row (`GET /api/bff/categories`). */
export function useDesignCategories() {
  const store = useStore();
  return useQuery({
    queryKey: storeKey(store, "design", "categories"),
    queryFn: ({ signal }) => apiFetch("/api/bff/categories", designCategoryListSchema, { signal }),
    staleTime: 60_000,
  });
}

function fieldMessages(body: unknown): Record<string, string> {
  if (!body || typeof body !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0];
    else if (typeof v === "string" && k !== "detail") out[k] = v;
  }
  return out;
}

function sectionBody(s: DraftSection) {
  return { label: s.label, is_active: s.is_active, settings: s.settings, content_data: s.content_data };
}

export type PublishOutcome = { ok: true } | { ok: false; step: PublishStep | "conflict"; message: string };

/** «نشر»: sends only what changed; a 409 on the theme stops everything (FR-08.08). */
export function usePublish() {
  const store = useStore();
  const qc = useQueryClient();

  const refetchBase = useCallback(async (): Promise<DesignBase> => {
    const [theme, sections, announcement] = await Promise.all([
      qc.fetchQuery({ queryKey: designKey(store, "theme"), queryFn: () => apiFetch("/api/bff/store/theme", themeSchema), staleTime: 0 }),
      qc.fetchQuery({ queryKey: designKey(store, "sections"), queryFn: () => apiFetch("/api/bff/admin/sections", adminSectionListSchema), staleTime: 0 }),
      qc.fetchQuery({ queryKey: designKey(store, "announcement"), queryFn: () => apiFetch("/api/bff/store/announcement", announcementSchema), staleTime: 0 }),
    ]);
    return { theme, sections, announcement };
  }, [qc, store]);

  const publish = useCallback(
    async (opts: { simulateConflict?: boolean } = {}): Promise<PublishOutcome> => {
      const api = useDesignStore.getState;
      const s0 = api();
      if (!s0.base || s0.phase === "publishing") return { ok: false, step: "theme", message: "" };
      api().setPhase("publishing");
      api().setFailed(null);
      api().setServerErrors({ theme: {}, sections: {}, announcement: {} });
      let step: PublishStep = "theme";
      try {
        // 1 — identity (JSON, or multipart when a logo file is attached).
        if (themeChanged(api())) {
          const s = api();
          const fields = { ...s.theme, version: s.base!.theme.version };
          const query = opts.simulateConflict ? { simulateConflict: 1 } : undefined;
          if (s.logo) {
            const form = new FormData();
            for (const [k, v] of Object.entries(fields)) form.set(k, String(v));
            form.set("logo", s.logo.file);
            await apiFetch("/api/bff/store/theme", themeSchema, { method: "PATCH", body: form, query });
          } else {
            await apiFetch("/api/bff/store/theme", themeSchema, { method: "PATCH", json: fields, query });
          }
          api().setLogo(null);
        }

        // 2 — sections: deletions, creations (temp ids replaced at once), updates.
        step = "sections";
        const base = api().base!;
        const baseRows = new Map(base.sections.map((r) => [r.id, r]));
        const baseDraft = new Map(draftSectionsOf(base.sections).map((r) => [r.id, r]));
        const draftIds = new Set(api().sections.map((r) => r.id));
        for (const row of base.sections) {
          if (!draftIds.has(row.id)) await apiFetch(`/api/bff/admin/sections/${row.id}`, z.unknown(), { method: "DELETE" });
        }
        let created = false;
        for (const [i, row] of api().sections.entries()) {
          try {
            if (row.id < 0) {
              const saved: AdminSection = await apiFetch("/api/bff/admin/sections", adminSectionSchema, {
                method: "POST",
                json: { section_type: row.section_type, order: i + 1, ...sectionBody(row) },
              });
              api().replaceSectionId(row.id, saved.id);
              created = true;
            } else if (baseRows.has(row.id) && stable(baseDraft.get(row.id)) !== stable(row)) {
              await apiFetch(`/api/bff/admin/sections/${row.id}`, adminSectionSchema, { method: "PATCH", json: sectionBody(row) });
            }
          } catch (e) {
            if (isApiError(e) && e.status === 400) api().setServerErrors({ sections: { [row.id]: fieldMessages(e.body) } });
            throw e;
          }
        }

        // 3 — full order, every id (FR-08.05), when it moved or a row was added/removed.
        step = "reorder";
        const ordered = api().sections.map((r) => r.id);
        const before = draftSectionsOf(base.sections)
          .map((r) => r.id)
          .filter((id) => draftIds.has(id));
        if (created || stable(ordered) !== stable(before)) {
          await apiFetch("/api/bff/admin/sections/reorder", reorderResultSchema, { method: "POST", json: { ordered_ids: ordered } });
        }

        // 4 — announcement bar.
        step = "announcement";
        if (announcementChanged(api())) {
          await apiFetch("/api/bff/store/announcement", announcementSchema, { method: "PATCH", json: api().announcement });
        }

        const fresh = await refetchBase();
        api().hydrate(store, fresh, true);
        void qc.invalidateQueries({ queryKey: storeKey(store, "dashboard") });
        return { ok: true };
      } catch (e) {
        if (isApiError(e) && e.status === 409) {
          api().setPhase("conflict", e.userMessage || "حُدِّث الثيم من جلسة أخرى");
          return { ok: false, step: "conflict", message: "حُدِّث الثيم من جلسة أخرى" };
        }
        const message = isApiError(e) ? e.userMessage : "تعذّر الاتصال. لم يُنشر كل شيء؛ أعد المحاولة.";
        if (isApiError(e) && e.status === 400 && step === "theme") api().setServerErrors({ theme: fieldMessages(e.body) });
        if (isApiError(e) && e.status === 400 && step === "announcement") api().setServerErrors({ announcement: fieldMessages(e.body) });
        // What did reach the server becomes the base; the rest of the draft stays unpublished.
        try {
          api().rebase(await refetchBase());
        } catch {
          // offline: keep the old base, the next «نشر» resends the same diff
        }
        api().setPhase("idle");
        api().setFailed({ step, message });
        return { ok: false, step, message };
      }
    },
    [qc, refetchBase, store],
  );

  return { publish, refetchBase };
}
