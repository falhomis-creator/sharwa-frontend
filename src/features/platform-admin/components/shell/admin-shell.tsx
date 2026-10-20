"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronDown, ExternalLink, LogOut, Menu, Moon, Search, Sun } from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ADMIN_ROLE_LABELS } from "@/features/platform-admin/schemas/auth";
import { useAdminLogout, useOverview } from "@/features/platform-admin/api/hooks";
import { useAdminSession } from "@/features/platform-admin/components/admin-session";
import { ADMIN_NAV, ADMIN_OVERVIEW, activePath, type AdminCounter } from "@/features/platform-admin/components/shell/admin-nav";
import { AdminPalette } from "@/features/platform-admin/components/shell/admin-palette";

/**
 * Console chrome (M20 §6, T137): the same proportions as the merchant shell — 256px
 * sidebar with a 1px end border, 48px topbar with a 1px bottom border, content capped at
 * 1440px — but its own components: `(admin)` imports nothing from the merchant dashboard
 * (constitution VIII; shared pieces live in `src/components` and `src/lib` only).
 */
export function AdminShell({ children, djangoAdminUrl }: { children: ReactNode; djangoAdminUrl: string }) {
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  useShortcuts(() => setPalette(true));

  return (
    <div className="flex min-h-dvh flex-1 bg-background">
      <div className="sticky top-0 hidden h-dvh shrink-0 lg:block">
        <AdminSidebar djangoAdminUrl={djangoAdminUrl} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onMenu={() => setDrawer(true)} onSearch={() => setPalette(true)} />
        <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 lg:px-6">
          {children}
        </main>
      </div>
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="right" className="w-72 bg-sidebar p-0 text-sidebar-foreground" data-testid="admin-drawer">
          <SheetTitle className="sr-only">قائمة لوحة المنصة</SheetTitle>
          <AdminSidebar djangoAdminUrl={djangoAdminUrl} onNavigate={() => setDrawer(false)} />
        </SheetContent>
      </Sheet>
      <AdminPalette open={palette} onOpenChange={setPalette} />
    </div>
  );
}

/** ⌘K / Ctrl+K opens the palette; `G S` stores, `G D` dues (M20 §6). */
function useShortcuts(openPalette: () => void) {
  const router = useRouter();
  const pendingG = useRef<number | null>(null);
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const k = e.key.toLowerCase();
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        if (k === "s") router.push("/stores");
        if (k === "d") router.push("/dues");
        return;
      }
      if (k === "g") pendingG.current = window.setTimeout(() => (pendingG.current = null), 900);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette, router]);
}

function counterOf(data: ReturnType<typeof useOverview>["data"], key?: AdminCounter): number {
  if (!data || !key) return 0;
  return data[key];
}

function AdminSidebar({ djangoAdminUrl, onNavigate }: { djangoAdminUrl: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activePath(pathname);
  const overview = useOverview();

  return (
    <nav aria-label="أقسام لوحة المنصة" className="surface-brand flex h-full min-h-0 w-64 flex-col border-e border-border bg-sidebar text-sidebar-foreground" data-testid="admin-sidebar">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <span aria-hidden className="size-6 shrink-0 rounded-md bg-cta shadow-xs" />
        <span className="text-sm font-semibold text-sidebar-strong">لوحة المنصة</span>
        <Mono className="ms-auto text-[11px] text-muted-foreground">console</Mono>
      </div>
      <div className="scrollbar-sidebar min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
        <NavLink href={ADMIN_OVERVIEW.path} title={ADMIN_OVERVIEW.title} active={active === "/"} onNavigate={onNavigate} />
        {ADMIN_NAV.map((g) => (
          <div key={g.key} className="mt-4">
            <p className="flex items-center gap-2 px-3 pb-1 text-xs text-muted-foreground">
              <g.icon className="size-3.5" strokeWidth={1.75} aria-hidden />
              {g.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((i) => (
                <li key={i.key}>
                  <NavLink href={i.path} title={i.title} active={active === i.path} count={counterOf(overview.data, i.counter)} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border p-2">
        <a href={djangoAdminUrl} target="_blank" rel="noreferrer" className="flex h-11 items-center gap-2 rounded-md px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:h-8" data-testid="django-admin-link">
          <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden />
          Django admin — للنماذج غير المغطاة
        </a>
      </div>
    </nav>
  );
}

function NavLink({ href, title, active, count = 0, onNavigate }: { href: string; title: string; active: boolean; count?: number; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-2 rounded-md px-3 text-sm transition-colors lg:h-8",
        active ? "bg-white/10 font-medium text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {count > 0 ? (
        <Mono className="text-xs text-foreground" aria-label={`${count} بانتظار الإجراء`}>
          {count}
        </Mono>
      ) : null}
    </Link>
  );
}

function AdminTopbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-2 lg:px-3">
      <button type="button" onClick={onMenu} aria-label="فتح القائمة" data-testid="admin-drawer-open" className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden">
        <Menu className="size-5" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onSearch}
        data-testid="admin-search"
        className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted md:max-w-md lg:h-8"
      >
        <Search className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="truncate">ابحث عن متجر بالاسم أو المخطط أو الهاتف أو النطاق</span>
        <Mono className="ms-auto hidden text-[11px] md:inline">⌘K</Mono>
      </button>
      <div className="ms-auto">
        <AdminUserMenu />
      </div>
    </header>
  );
}

function AdminUserMenu() {
  const session = useAdminSession();
  const logout = useAdminLogout();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const row = "flex h-11 w-full items-center gap-2 rounded-sm px-3 text-start text-sm transition-colors hover:bg-muted lg:h-8";

  async function signOut() {
    try {
      await logout.mutateAsync();
    } catch {
      // The local view of the session drops either way.
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <details className="group/user relative" data-testid="admin-user-menu">
      <summary className="flex h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm marker:content-none hover:bg-muted lg:h-8">
        <span className="hidden min-w-0 flex-col items-start leading-tight md:flex">
          <span className="truncate text-sm">{session.full_name}</span>
          <span className="truncate text-[11px] text-muted-foreground" data-testid="admin-role">
            {ADMIN_ROLE_LABELS[session.role]}
          </span>
        </span>
        <span className="sr-only">قائمة المستخدم</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open/user:rotate-180" strokeWidth={1.75} aria-hidden />
      </summary>
      <div className="absolute top-full end-0 z-50 mt-1 w-60 rounded-md border border-border bg-popover p-1 text-popover-foreground">
        <div className="flex flex-col gap-0.5 border-b border-border px-3 py-2">
          <span className="truncate text-sm font-medium">{session.full_name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {ADMIN_ROLE_LABELS[session.role]} · <Mono>{session.username}</Mono>
          </span>
        </div>
        <button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="تبديل المظهر بين الفاتح والداكن" className={row}>
          <Moon className="size-4 dark:hidden" strokeWidth={1.75} aria-hidden />
          <Sun className="hidden size-4 dark:block" strokeWidth={1.75} aria-hidden />
          <span className="dark:hidden">المظهر الداكن</span>
          <span className="hidden dark:inline">المظهر الفاتح</span>
        </button>
        <button type="button" onClick={() => void signOut()} className={cn(row, "text-destructive")} data-testid="admin-logout">
          <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
          تسجيل الخروج
        </button>
      </div>
    </details>
  );
}
