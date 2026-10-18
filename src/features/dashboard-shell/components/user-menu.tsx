"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ChevronDown, ExternalLink, Keyboard, LogOut, Moon, Settings, Sun } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { z } from "zod";
import { useSession } from "@/features/dashboard-shell/components/session-context";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { clearRecents } from "@/features/command-palette/recents";
import { SETTINGS_ITEM } from "@/features/dashboard-shell/navigation";
import { useShellStore } from "@/stores/shell";

/**
 * User menu (M03 US-03.3): name, role, dark mode, shortcuts, settings, logout.
 * A native `<details>` disclosure — Escape and keyboard traversal come for free, and no
 * popover primitive exists in the project yet. No avatar: a gradient avatar is exactly
 * what constitution I-ب rules out.
 */
export function UserMenu({ storeUrl }: { storeUrl: string }) {
  const session = useSession();
  const store = useStore();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const setShortcuts = useShellStore((s) => s.setShortcuts);

  const name = session.kind === "staff" ? (session.staff?.full_name ?? "موظف") : "مالك المتجر";
  const role = session.kind === "staff" ? (session.staff?.roles.join(" · ") || "موظف") : session.store_name;

  async function logout() {
    clearRecents(store);
    try {
      await apiFetch("/api/bff/auth/logout", z.undefined(), { method: "POST" });
    } catch {
      // A failed logout still has to drop the local view of the session.
    }
    router.replace("/dashboard/login");
    router.refresh();
  }

  return (
    <details className="group/user relative">
      <summary className="flex h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm transition-colors marker:content-none hover:bg-muted lg:h-8">
        <span className="hidden min-w-0 flex-col items-start leading-tight lg:flex">
          <span className="truncate text-sm">{name}</span>
          <span className="truncate text-[11px] text-muted-foreground">{role}</span>
        </span>
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-sm border border-border text-[11px] lg:hidden"
        >
          {name.slice(0, 1)}
        </span>
        <span className="sr-only">قائمة المستخدم</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open/user:rotate-180" strokeWidth={1.75} aria-hidden />
      </summary>

      <div className="absolute top-full end-0 z-50 mt-1 w-64 rounded-md border border-border bg-popover p-1 text-popover-foreground">
        <div className="flex flex-col gap-0.5 border-b border-border px-3 py-2">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="truncate text-xs text-muted-foreground">{role}</span>
          {session.staff?.locations.length ? (
            <span className="truncate text-xs text-muted-foreground">
              {session.staff.locations.map((l) => l.name).join(" · ")}
            </span>
          ) : null}
        </div>

        {/* The active theme is unknown on the server, so branching on `resolvedTheme`
            during render would change the text at hydration (React #418 — a gate failure
            under constitution IV). Both states are rendered and CSS picks one via the
            `dark` variant; the accessible name stays constant. */}
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="تبديل المظهر بين الفاتح والداكن"
          className={ROW}
        >
          <Moon className="size-4 text-muted-foreground dark:hidden" strokeWidth={1.75} aria-hidden />
          <Sun className="hidden size-4 text-muted-foreground dark:inline" strokeWidth={1.75} aria-hidden />
          <span className="dark:hidden" aria-hidden>
            الوضع الداكن
          </span>
          <span className="hidden dark:inline" aria-hidden>
            الوضع الفاتح
          </span>
        </button>

        <button type="button" onClick={() => setShortcuts(true)} className={ROW}>
          <Keyboard className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
          اختصارات لوحة المفاتيح
        </button>

        <a href={storeUrl} target="_blank" rel="noreferrer noopener" className={`${ROW} lg:hidden`}>
          <ExternalLink className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
          عرض المتجر
        </a>

        <Link href={SETTINGS_ITEM.path} className={ROW}>
          <Settings className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
          {SETTINGS_ITEM.title}
        </Link>

        <button
          type="button"
          onClick={() => {
            toast("جارٍ الخروج…");
            void logout();
          }}
          className={`${ROW} text-destructive`}
        >
          <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
          تسجيل الخروج
        </button>
      </div>
    </details>
  );
}

const ROW =
  "flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-muted";
