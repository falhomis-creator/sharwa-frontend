import type { ReactNode } from "react";
import { SettingsShell } from "@/features/settings/components/settings-shell";

/** `/dashboard/settings/*` — the M34 hub frame (vertical nav + 720px content, FR-34.01). */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}
