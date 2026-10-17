"use client";

import { useEffect } from "react";
import { useShellStore } from "@/stores/shell";

/**
 * Applies the persisted shell state AFTER mount (`skipHydration: true` in the store).
 * Server and first client render therefore agree, which is what keeps the visual gate
 * free of hydration warnings (constitution IV).
 */
export function ShellHydrator() {
  useEffect(() => {
    void useShellStore.persist.rehydrate();
  }, []);
  return null;
}
