"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useShellStore } from "@/stores/shell";

/**
 * Dashboard shortcuts (M03 §6): `G O` orders · `G P` products · `G C` customers ·
 * `[` collapse the sidebar · `?` the shortcut list · `Esc` close any layer.
 * `⌘K`/`Ctrl+K` belongs to the command palette (M48) and is deliberately not bound here.
 *
 * A sequence is only armed for 1.2s, and nothing fires while the caret is in a field or a
 * modifier is held — otherwise typing «[» into a product description would collapse the UI.
 */
const SEQUENCE_WINDOW = 1_200;

export const SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: "G O", label: "الطلبات" },
  { keys: "G P", label: "المنتجات" },
  { keys: "G C", label: "العملاء" },
  { keys: "[", label: "طيّ الشريط الجانبي" },
  { keys: "?", label: "قائمة الاختصارات" },
  { keys: "Esc", label: "إغلاق أي طبقة" },
];

const GOTO: Record<string, string> = {
  o: "/dashboard/orders",
  p: "/dashboard/products",
  c: "/dashboard/customers",
};

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    target.getAttribute("role") === "textbox"
  );
}

export function useShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const store = useShellStore.getState;
    let armed = false;
    let timer = 0;

    const disarm = () => {
      armed = false;
      window.clearTimeout(timer);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const { drawerOpen, shortcutsOpen, setDrawer, setShortcuts } = store();
        if (shortcutsOpen) setShortcuts(false);
        if (drawerOpen) setDrawer(false);
        disarm();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;

      const key = event.key.toLowerCase();

      if (armed) {
        const target = GOTO[key];
        disarm();
        if (target) {
          event.preventDefault();
          router.push(target);
          return;
        }
      }

      if (key === "g") {
        armed = true;
        window.clearTimeout(timer);
        timer = window.setTimeout(disarm, SEQUENCE_WINDOW);
        return;
      }
      if (key === "[") {
        event.preventDefault();
        store().toggleSidebar();
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        store().setShortcuts(true);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [router]);
}
