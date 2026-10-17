import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Shell UI state (M03 §5 "Shell UI state"). Browser-only and ephemeral, so Zustand —
 * never TanStack Query, which is for server state (constitution IX).
 *
 * `skipHydration: true` on purpose: the server and the client's first render must agree,
 * so both start from the defaults and the stored value is applied by `<ShellHydrator>`
 * after mount. Reading localStorage during render would be a hydration mismatch, which
 * the visual gate (constitution IV) treats as a failure.
 */
export type SidebarState = "expanded" | "rail";

interface ShellStore {
  sidebar: SidebarState;
  /**
   * Keys of groups the merchant has opened. Default empty: only the group containing the
   * current screen is open, which keeps the 15-group sidebar scannable instead of 3000px
   * tall. The active group is resolved by the sidebar, not stored here.
   */
  expandedGroups: string[];
  drawerOpen: boolean;
  shortcutsOpen: boolean;
  toggleSidebar: () => void;
  setSidebar: (state: SidebarState) => void;
  toggleGroup: (key: string) => void;
  setDrawer: (open: boolean) => void;
  setShortcuts: (open: boolean) => void;
}

export const useShellStore = create<ShellStore>()(
  persist(
    (set) => ({
      sidebar: "expanded",
      expandedGroups: [],
      drawerOpen: false,
      shortcutsOpen: false,
      toggleSidebar: () => set((s) => ({ sidebar: s.sidebar === "expanded" ? "rail" : "expanded" })),
      setSidebar: (sidebar) => set({ sidebar }),
      toggleGroup: (key) =>
        set((s) => ({
          expandedGroups: s.expandedGroups.includes(key)
            ? s.expandedGroups.filter((k) => k !== key)
            : [...s.expandedGroups, key],
        })),
      setDrawer: (drawerOpen) => set({ drawerOpen }),
      setShortcuts: (shortcutsOpen) => set({ shortcutsOpen }),
    }),
    {
      name: "sharwa.shell",
      skipHydration: true,
      // Transient overlays are never restored.
      partialize: (s) => ({ sidebar: s.sidebar, expandedGroups: s.expandedGroups }),
    },
  ),
);
