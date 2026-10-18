import { create } from "zustand";
import type { SettingsSection } from "@/features/settings/schemas";

/**
 * Settings hub UI state (M34 §5 «حالة القسم», constitution IX): the explicit section that
 * holds unsaved changes (its save/discard handlers), the navigation it is holding back
 * (FR-34.05), and the auto-save indicator of each auto section.
 */
export type AutoPhase = "idle" | "saving" | "saved" | "error";

interface ExplicitHandle {
  section: SettingsSection;
  /** Opens the section's confirmation (a save never bypasses it — SC-34.4). */
  requestSave: () => void;
  discard: () => void;
}

interface SettingsStore {
  explicit: ExplicitHandle | null;
  pendingHref: string | null;
  /** Bumped to draw attention to the bar when navigation is refused. */
  nudge: number;
  auto: Partial<Record<SettingsSection, { phase: AutoPhase; at?: string; message?: string }>>;
  setExplicit: (handle: ExplicitHandle | null) => void;
  clearExplicit: (section: SettingsSection) => void;
  holdNavigation: (href: string) => void;
  takePendingHref: () => string | null;
  setAuto: (section: SettingsSection, phase: AutoPhase, extra?: { at?: string; message?: string }) => void;
}

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  explicit: null,
  pendingHref: null,
  nudge: 0,
  auto: {},
  setExplicit: (explicit) => set({ explicit }),
  clearExplicit: (section) => set((s) => (s.explicit?.section === section ? { explicit: null } : s)),
  holdNavigation: (href) => set((s) => ({ pendingHref: href, nudge: s.nudge + 1 })),
  takePendingHref: () => {
    const href = get().pendingHref;
    set({ pendingHref: null });
    return href;
  },
  setAuto: (section, phase, extra) => set((s) => ({ auto: { ...s.auto, [section]: { phase, ...extra } } })),
}));
