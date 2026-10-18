"use client";

import { ExternalLink, Menu, PanelRightClose, PanelRightOpen, Search } from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StoreSwitcher } from "@/features/dashboard-shell/components/store-switcher";
import { UserMenu } from "@/features/dashboard-shell/components/user-menu";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { useSession } from "@/features/dashboard-shell/components/session-context";
import { usePaletteStore } from "@/stores/palette";
import { useShellStore } from "@/stores/shell";

/**
 * Topbar (M03 US-03.3) — 48px with a 1px bottom border, no shadow. It does not exist in
 * the Django dashboard at all (discovery 01 §9 "no desktop topbar"), so every control here
 * is new: the store switcher, the ⌘K entry point, the notification bell, «عرض المتجر» and
 * the user menu.
 *
 * The search button opens the command palette (M48) and the bell the notification panel
 * (M49) — both wired in Phase 3D (T079/T080) in the slots M03 reserved for them.
 */
export function Topbar({
  store,
  storeUrl,
  protocol,
  port,
}: {
  store: string;
  storeUrl: string;
  protocol: "http" | "https";
  port: string | null;
}) {
  const session = useSession();
  const sidebar = useShellStore((s) => s.sidebar);
  const toggleSidebar = useShellStore((s) => s.toggleSidebar);
  const setDrawer = useShellStore((s) => s.setDrawer);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-2 lg:px-3">
      <button
        type="button"
        onClick={() => setDrawer(true)}
        aria-label="فتح القائمة"
        data-testid="shell-drawer-open"
        className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" strokeWidth={1.75} aria-hidden />
      </button>

      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebar === "expanded" ? "طيّ الشريط الجانبي" : "توسيع الشريط الجانبي"}
              data-testid="shell-rail-toggle"
              className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
            />
          }
        >
          {sidebar === "expanded" ? (
            <PanelRightClose className="size-4" strokeWidth={1.75} aria-hidden />
          ) : (
            <PanelRightOpen className="size-4" strokeWidth={1.75} aria-hidden />
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          طيّ الشريط <Mono className="text-[11px]">[</Mono>
        </TooltipContent>
      </Tooltip>

      <div className="min-w-0 max-w-[12rem] lg:max-w-xs">
        <StoreSwitcher store={store} storeName={session.store_name} protocol={protocol} port={port} />
      </div>

      <div className="flex flex-1 justify-center px-2">
        <button
          type="button"
          onClick={() => usePaletteStore.getState().setOpen(true)}
          aria-label="بحث أو أمر (Ctrl+K)"
          aria-keyshortcuts="Control+K Meta+K"
          data-testid="open-palette"
          className={cn(
            "flex h-11 w-full max-w-sm items-center gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:h-8",
          )}
        >
          <Search className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="flex-1 truncate text-start">بحث أو أمر…</span>
          <Mono className="hidden shrink-0 rounded-sm border border-border px-1 text-[11px] md:inline">Ctrl+K</Mono>
        </button>
      </div>

      <NotificationBell />

      <a
        href={storeUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="hidden h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
      >
        <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
        عرض المتجر
      </a>

      <UserMenu storeUrl={storeUrl} />
    </header>
  );
}
