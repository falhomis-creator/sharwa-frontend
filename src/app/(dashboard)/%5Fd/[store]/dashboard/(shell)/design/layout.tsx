import type { ReactNode } from "react";
import { DesignEditor } from "@/features/design/components/design-editor";

/**
 * `/dashboard/design/**` — the theme customizer (M08 T100). The editor lives in the LAYOUT so
 * `/dashboard/design` and `/dashboard/design/sections/[id]` share one mounted preview iframe
 * and one draft; the pages only carry the metadata and the section id in the URL.
 */
export default function DesignLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DesignEditor />
      {children}
    </>
  );
}
