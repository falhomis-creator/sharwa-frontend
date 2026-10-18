import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { RegistrationDraft } from "@/features/onboarding/schemas";

/**
 * Onboarding wizard state (M02 §11 IX, FR-02.10): the ONLY carrier of personal data
 * between the three panels. Nothing here ever reaches a URL — the one identifier in a
 * link is the signed status token, as a path param.
 *
 * Persisted to sessionStorage (this tab only, gone when it closes) so a reload on the OTP
 * panel or a dropped connection keeps the values (M02 §8). `skipHydration` for the same
 * reason as the shell store: server and first client render must agree, so the stored
 * value is applied after mount by `useOnboardingHydrated()`.
 */
export interface OtpSession {
  otp_token: string;
  masked_phone: string;
  /** Epoch ms; the countdown is derived from it, so a reload does not reset the TTL. */
  expires_at: number;
}

/** Server field errors carried back to panel 01 (US-02.3.4). */
export type DraftErrors = Partial<Record<keyof RegistrationDraft, string>>;

interface OnboardingStore {
  draft: RegistrationDraft | null;
  otp: OtpSession | null;
  draftErrors: DraftErrors;
  /** The status token of the last successful verify — not personal data. */
  verifiedToken: string | null;
  setDraft: (draft: RegistrationDraft) => void;
  startOtp: (otp: { otp_token: string; masked_phone: string; ttl_seconds: number }) => void;
  renewOtp: (ttlSeconds: number) => void;
  returnToDetails: (errors: DraftErrors) => void;
  clearDraftErrors: () => void;
  /** After a successful verify: personal data is dropped from the wizard. */
  finish: (statusToken: string) => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      draft: null,
      otp: null,
      draftErrors: {},
      verifiedToken: null,
      setDraft: (draft) => set({ draft }),
      startOtp: ({ otp_token, masked_phone, ttl_seconds }) =>
        set({
          otp: { otp_token, masked_phone, expires_at: Date.now() + ttl_seconds * 1000 },
          draftErrors: {},
          verifiedToken: null,
        }),
      renewOtp: (ttlSeconds) =>
        set((s) => (s.otp ? { otp: { ...s.otp, expires_at: Date.now() + ttlSeconds * 1000 } } : s)),
      returnToDetails: (draftErrors) => set({ otp: null, draftErrors }),
      clearDraftErrors: () => set({ draftErrors: {} }),
      finish: (verifiedToken) => set({ draft: null, otp: null, draftErrors: {}, verifiedToken }),
    }),
    {
      name: "sharwa.onboarding",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (s) => ({ draft: s.draft, otp: s.otp, draftErrors: s.draftErrors, verifiedToken: s.verifiedToken }),
    },
  ),
);

const subscribeHydration = (onChange: () => void) => useOnboardingStore.persist.onFinishHydration(onChange);
const isHydrated = () => useOnboardingStore.persist.hasHydrated();
const notHydratedOnServer = () => false;

/** Applies the stored wizard state after mount and reports when it is in place. */
export function useOnboardingHydrated(): boolean {
  useEffect(() => {
    if (!useOnboardingStore.persist.hasHydrated()) void useOnboardingStore.persist.rehydrate();
  }, []);
  return useSyncExternalStore(subscribeHydration, isHydrated, notHydratedOnServer);
}
