"use client";

import { create } from "zustand";
import type { SectionType } from "@/lib/schemas/store-config";
import {
  presetKeyOf,
  type AdminSection,
  type Announcement,
  type DraftSection,
  type DraftStatus,
  type Preset,
  type ThemeDraft,
  type ThemeEntity,
} from "@/features/design/schemas";

/**
 * ThemeDraft (M08 §5) — the editor's LOCAL copy of the published theme, sections and
 * announcement. Every control writes here and the preview is fed from here; nothing reaches
 * the server before «نشر» (FR-08.01, SC-08.2). `status` is derived: `conflict` and
 * `publishing` are phases, otherwise `dirty` whenever the draft differs from the base.
 *
 * The draft is module-level, so it survives a client navigation inside the dashboard (the
 * merchant comes back to the same unsaved work); `beforeunload` guards the hard exits.
 */
export interface DesignBase {
  theme: ThemeEntity;
  sections: AdminSection[];
  announcement: Announcement;
}

export interface LogoDraft {
  file: File;
  url: string;
  size: number;
}

export type PublishStep = "theme" | "sections" | "reorder" | "announcement";

interface DesignState {
  store: string | null;
  base: DesignBase | null;
  theme: ThemeDraft;
  sections: DraftSection[];
  announcement: Announcement;
  logo: LogoDraft | null;
  phase: "idle" | "publishing" | "conflict";
  conflictMessage: string | null;
  failed: { step: PublishStep; message: string } | null;
  serverErrors: { theme: Record<string, string>; sections: Record<number, Record<string, string>>; announcement: Record<string, string> };
  tempSeq: number;

  hydrate: (store: string, base: DesignBase, force?: boolean) => void;
  discard: () => void;
  /** After a partial publish: the server rows become the base, the remaining draft stays. */
  rebase: (base: DesignBase) => void;
  choosePreset: (preset: Preset) => void;
  setThemeField: (key: keyof Omit<ThemeDraft, "theme_preset">, value: string) => void;
  setLogo: (logo: LogoDraft | null) => void;
  updateSection: (id: number, patch: Partial<Omit<DraftSection, "id" | "section_type">>) => void;
  moveSection: (from: number, to: number) => void;
  addSection: (type: SectionType, label: string) => number;
  removeSection: (id: number) => void;
  setAnnouncement: (patch: Partial<Announcement>) => void;
  replaceSectionId: (tempId: number, realId: number) => void;
  setPhase: (phase: DesignState["phase"], conflictMessage?: string | null) => void;
  setFailed: (failed: DesignState["failed"]) => void;
  setServerErrors: (patch: Partial<DesignState["serverErrors"]>) => void;
}

const EMPTY_ANNOUNCEMENT: Announcement = {
  enable_announcement_bar: false,
  announcement_text: "",
  announcement_bg_color: "#18181b",
  announcement_text_color: "#ffffff",
  announcement_scroll_speed: "medium",
  show_banner_on_home: true,
  show_banner_on_products: false,
  show_banner_on_product_detail: false,
  show_banner_on_checkout: false,
};

const EMPTY_THEME: ThemeDraft = {
  theme_preset: "modern_trust",
  primary_color: "#4F46E5",
  secondary_color: "#1E293B",
  background_color: "#F8FAFC",
  text_color: "#0F172A",
  card_border_color: "#E2E8F0",
  heading_font: "Tajawal",
  body_font: "Tajawal",
  design_style: "fluid",
};

export function themeDraftOf(t: ThemeEntity): ThemeDraft {
  return {
    // An unknown free-text preset is shown as `custom` with the current tokens (M08 §8).
    theme_preset: presetKeyOf(t.theme_preset),
    primary_color: t.primary_color.toUpperCase(),
    secondary_color: t.secondary_color.toUpperCase(),
    background_color: t.background_color.toUpperCase(),
    text_color: t.text_color.toUpperCase(),
    card_border_color: t.card_border_color.toUpperCase(),
    heading_font: t.heading_font,
    body_font: t.body_font,
    design_style: t.design_style,
  };
}

export function draftSectionsOf(rows: AdminSection[]): DraftSection[] {
  return [...rows]
    .sort((a, b) => a.order - b.order)
    .map((r) => ({
      id: r.id,
      section_type: r.section_type,
      label: r.label,
      is_active: r.is_active,
      settings: structuredClone(r.settings),
      content_data: structuredClone(r.content_data),
    }));
}

const NO_ERRORS = { theme: {}, sections: {}, announcement: {} };

function fromBase(base: DesignBase) {
  return {
    base,
    theme: themeDraftOf(base.theme),
    sections: draftSectionsOf(base.sections),
    announcement: { ...base.announcement },
    logo: null,
    phase: "idle" as const,
    conflictMessage: null,
    failed: null,
    serverErrors: NO_ERRORS,
  };
}

/** Stable JSON (sorted keys) so a key added then removed does not count as a change. */
export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as object)
      .sort()
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function themeChanged(s: Pick<DesignState, "base" | "theme" | "logo">): boolean {
  if (!s.base) return false;
  return s.logo !== null || stable(themeDraftOf(s.base.theme)) !== stable(s.theme);
}

export function sectionsChanged(s: Pick<DesignState, "base" | "sections">): boolean {
  if (!s.base) return false;
  return stable(draftSectionsOf(s.base.sections)) !== stable(s.sections);
}

export function announcementChanged(s: Pick<DesignState, "base" | "announcement">): boolean {
  if (!s.base) return false;
  return stable(s.base.announcement) !== stable(s.announcement);
}

export function draftStatus(s: DesignState): DraftStatus {
  if (s.phase === "conflict") return "conflict";
  if (s.phase === "publishing") return "publishing";
  return themeChanged(s) || sectionsChanged(s) || announcementChanged(s) ? "dirty" : "clean";
}

export const useDesignStore = create<DesignState>()((set, get) => ({
  store: null,
  base: null,
  theme: EMPTY_THEME,
  sections: [],
  announcement: EMPTY_ANNOUNCEMENT,
  logo: null,
  phase: "idle",
  conflictMessage: null,
  failed: null,
  serverErrors: NO_ERRORS,
  tempSeq: 0,

  hydrate: (store, base, force = false) => {
    const s = get();
    if (!force && s.store === store && s.base && draftStatus(s) !== "clean") return;
    if (s.logo) URL.revokeObjectURL(s.logo.url);
    set({ store, ...fromBase(base) });
  },
  discard: () => {
    const s = get();
    if (!s.base) return;
    if (s.logo) URL.revokeObjectURL(s.logo.url);
    set(fromBase(s.base));
  },
  rebase: (base) => set({ base }),
  choosePreset: (p) =>
    set((s) => ({
      theme: {
        ...s.theme,
        theme_preset: p.code,
        ...p.tokens,
        heading_font: p.heading_font,
        body_font: p.body_font,
        design_style: p.design_style,
      },
    })),
  // Any token, font or style edit leaves the preset: the theme becomes `custom` (FR-08.03).
  setThemeField: (key, value) => set((s) => ({ theme: { ...s.theme, [key]: value, theme_preset: "custom" } })),
  setLogo: (logo) => {
    const prev = get().logo;
    if (prev && prev.url !== logo?.url) URL.revokeObjectURL(prev.url);
    set({ logo });
  },
  updateSection: (id, patch) => set((s) => ({ sections: s.sections.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
  moveSection: (from, to) =>
    set((s) => {
      if (from === to || from < 0 || to < 0 || from >= s.sections.length || to >= s.sections.length) return s;
      const next = [...s.sections];
      const [row] = next.splice(from, 1);
      next.splice(to, 0, row!);
      return { sections: next };
    }),
  addSection: (type, label) => {
    const id = -(get().tempSeq + 1);
    const content: Record<string, unknown> =
      type === "product_grid" ? { title: "", category_id: null, limit: 8 } : { items: [{ image: null, title: "", link: "" }] };
    set((s) => ({
      tempSeq: s.tempSeq + 1,
      sections: [...s.sections, { id, section_type: type, label, is_active: true, settings: { show_on_mobile: true }, content_data: content }],
    }));
    return id;
  },
  removeSection: (id) => set((s) => ({ sections: s.sections.filter((r) => r.id !== id) })),
  setAnnouncement: (patch) => set((s) => ({ announcement: { ...s.announcement, ...patch } })),
  replaceSectionId: (tempId, realId) => set((s) => ({ sections: s.sections.map((r) => (r.id === tempId ? { ...r, id: realId } : r)) })),
  setPhase: (phase, conflictMessage = null) => set({ phase, conflictMessage }),
  setFailed: (failed) => set({ failed }),
  setServerErrors: (patch) => set((s) => ({ serverErrors: { ...s.serverErrors, ...patch } })),
}));

export function useDraftStatus(): DraftStatus {
  return useDesignStore(draftStatus);
}
