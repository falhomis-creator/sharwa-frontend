import { create } from "zustand";

/**
 * The product page's instantaneous choices (M10 §11 IX: «حالة المتغير المختار في Zustand»):
 * option per attribute, legacy size/colour, quantity, personalization answers, optional bundle
 * parts and the booked slot. Reset whenever another product is opened. The resolved variant
 * and the quantity are ALSO mirrored to the URL (`?v=`, `?qty=`) so the page is shareable.
 */
export interface PdpState {
  productId: number | null;
  selected: Record<number, number>;
  size: string | null;
  color: string | null;
  quantity: number;
  personalization: Record<string, unknown>;
  bundleOptional: number[];
  startDatetime: string | null;
  missing: string[];
  reset: (productId: number, init?: Partial<Pick<PdpState, "selected" | "quantity">>) => void;
  choose: (attributeId: number, optionId: number) => void;
  set: (patch: Partial<Omit<PdpState, "reset" | "choose" | "set">>) => void;
}

export const usePdp = create<PdpState>((set, get) => ({
  productId: null,
  selected: {},
  size: null,
  color: null,
  quantity: 1,
  personalization: {},
  bundleOptional: [],
  startDatetime: null,
  missing: [],
  reset: (productId, init) =>
    set({
      productId,
      selected: init?.selected ?? {},
      size: null,
      color: null,
      quantity: init?.quantity ?? 1,
      personalization: {},
      bundleOptional: [],
      startDatetime: null,
      missing: [],
    }),
  choose: (attributeId, optionId) => {
    const selected = { ...get().selected };
    if (selected[attributeId] === optionId) delete selected[attributeId];
    else selected[attributeId] = optionId;
    set({ selected, missing: get().missing.filter((m) => m !== `attr:${attributeId}`) });
  },
  set: (patch) => set(patch),
}));
