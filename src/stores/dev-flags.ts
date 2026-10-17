import { create } from "zustand";

/** Dev-only flags (mock indicator). Never persisted. */
interface DevFlagsState {
  sawMockResponse: boolean;
  setSawMock: (v: boolean) => void;
}

export const useDevFlags = create<DevFlagsState>((set) => ({
  sawMockResponse: false,
  setSawMock: (v) => set((s) => (s.sawMockResponse === v ? s : { sawMockResponse: v })),
}));
