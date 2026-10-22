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
  /**
   * The saved product's variant matrix has attribute/value/exclusion changes not generated yet
   * (schema audit 2026-10-23: they count as unsaved changes of the editor).
   */
  variantPending: Record<number, boolean | undefined>;
  setVariantPending: (productId: number, pending: boolean) => void;
  /** Persists the matrix (pending generation + edited rows); the editor's «حفظ» calls it. */
  variantFlush: Record<number, (() => Promise<number>) | undefined>;
  setVariantFlush: (productId: number, flush: (() => Promise<number>) | undefined) => void;
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
  variantPending: {},
  setVariantPending: (productId, pending) =>
    set((s) => (Boolean(s.variantPending[productId]) === pending ? s : { variantPending: { ...s.variantPending, [productId]: pending } })),
  variantFlush: {},
  setVariantFlush: (productId, flush) => set((s) => ({ variantFlush: { ...s.variantFlush, [productId]: flush } })),
}));
