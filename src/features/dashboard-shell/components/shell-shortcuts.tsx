"use client";

import { useShortcuts } from "@/features/dashboard-shell/hooks/use-shortcuts";

/** Mounts the shell's keyboard shortcuts once (M03 §6). Renders nothing. */
export function ShellShortcuts() {
  useShortcuts();
  return null;
}
