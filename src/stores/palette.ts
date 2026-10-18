import { create } from "zustand";

/**
 * Command palette state (M48 FR-48.01, §5 PaletteState): open, query and the sub-page
 * (`root` · `actions` · `order:<id>` · `stores`). Browser-only and ephemeral → Zustand.
 */
export type PalettePage = { kind: "root" } | { kind: "stores" } | { kind: "order"; id: number; label: string };

interface PaletteStore {
  open: boolean;
  query: string;
  page: PalettePage;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  setPage: (page: PalettePage) => void;
  back: () => void;
}

export const usePaletteStore = create<PaletteStore>()((set) => ({
  open: false,
  query: "",
  page: { kind: "root" },
  setOpen: (open) => set(open ? { open } : { open, query: "", page: { kind: "root" } }),
  toggle: () => set((s) => (s.open ? { open: false, query: "", page: { kind: "root" } } : { open: true })),
  setQuery: (query) => set({ query }),
  setPage: (page) => set({ page, query: "" }),
  back: () => set({ page: { kind: "root" }, query: "" }),
}));
