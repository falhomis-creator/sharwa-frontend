import { create } from "zustand";

/**
 * In-browser, pre-save editor state (constitution IX: drag-and-drop and the variant matrix
 * before saving live in Zustand, never in TanStack Query). Keyed by product id so two open
 * products (Next 16 keeps up to three routes alive) never share a draft.
 */
export interface VariantDraftRow {
  sku: string;
  extra_price: string;
  stock: string;
}

interface ProductEditorStore {
  /** Image ids in their dragged order, before the server confirms it. */
  galleryOrder: Record<number, number[] | undefined>;
  /** Unsaved edits of the variant table, by variant id. */
  variantDrafts: Record<number, Record<number, VariantDraftRow> | undefined>;
  setGalleryOrder: (productId: number, ids: number[] | undefined) => void;
  setVariantDraft: (productId: number, variantId: number, row: VariantDraftRow) => void;
  setVariantDrafts: (productId: number, rows: Record<number, VariantDraftRow> | undefined) => void;
}

export const useProductEditorStore = create<ProductEditorStore>()((set) => ({
  galleryOrder: {},
  variantDrafts: {},
  setGalleryOrder: (productId, ids) => set((s) => ({ galleryOrder: { ...s.galleryOrder, [productId]: ids } })),
  setVariantDraft: (productId, variantId, row) =>
    set((s) => ({
      variantDrafts: { ...s.variantDrafts, [productId]: { ...(s.variantDrafts[productId] ?? {}), [variantId]: row } },
    })),
  setVariantDrafts: (productId, rows) => set((s) => ({ variantDrafts: { ...s.variantDrafts, [productId]: rows } })),
}));
