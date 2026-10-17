"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Mono } from "@/components/shared/mono";
import { SHORTCUTS } from "@/features/dashboard-shell/hooks/use-shortcuts";
import { useShellStore } from "@/stores/shell";

/** The `?` list (M03 §6). Keys are Mono; no illustration, no colour. */
export function ShortcutsDialog() {
  const open = useShellStore((s) => s.shortcutsOpen);
  const setShortcuts = useShellStore((s) => s.setShortcuts);

  return (
    <Dialog open={open} onOpenChange={setShortcuts}>
      <DialogContent className="max-w-md">
        <DialogTitle>اختصارات لوحة المفاتيح</DialogTitle>
        <DialogDescription className="sr-only">قائمة اختصارات التنقل في لوحة التاجر</DialogDescription>
        <ul className="flex flex-col divide-y divide-border">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.keys} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <span>{shortcut.label}</span>
              <Mono className="rounded-sm border border-border px-1.5 py-0.5 text-xs">{shortcut.keys}</Mono>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
