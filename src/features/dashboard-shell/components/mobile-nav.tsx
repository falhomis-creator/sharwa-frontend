"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, Package, ShoppingCart } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { MOBILE_NAV } from "@/features/dashboard-shell/navigation";
import { Sidebar } from "@/features/dashboard-shell/components/sidebar";
import { useShellStore } from "@/stores/shell";

/**
 * Mobile shell (M03 FR-03.13): a start-side drawer holding the full sidebar, and a bottom
 * bar with four 44px entries — النظرة العامة · الطلبات · المنتجات · القائمة.
 * The drawer is a `Sheet` on the `start` side: in RTL that is the right-hand edge, which
 * is what "drawer بداية" means (constitution II).
 */
const ICONS = [LayoutDashboard, ShoppingCart, Package];

export function MobileDrawer({ store, storeName }: { store: string; storeName: string }) {
  const open = useShellStore((s) => s.drawerOpen);
  const setDrawer = useShellStore((s) => s.setDrawer);

  return (
    <Sheet open={open} onOpenChange={setDrawer}>
      <SheetContent side="right" className="w-[17rem] p-0 sm:max-w-[17rem]">
        <SheetTitle className="sr-only">أقسام اللوحة</SheetTitle>
        <SheetDescription className="sr-only">قائمة التنقل في لوحة {storeName}</SheetDescription>
        <Sidebar store={store} storeName={storeName} variant="drawer" onNavigate={() => setDrawer(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const setDrawer = useShellStore((s) => s.setDrawer);

  return (
    <nav
      aria-label="تنقل سريع"
      className="flex h-16 shrink-0 items-stretch border-t border-border bg-background lg:hidden"
    >
      {MOBILE_NAV.map((item, i) => {
        const Icon = ICONS[i] ?? LayoutDashboard;
        const active = item.path === "/dashboard" ? pathname === item.path : pathname.startsWith(item.path);
        return (
          <Link
            key={item.key}
            href={item.path}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" strokeWidth={1.75} aria-hidden />
            {item.title}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => setDrawer(true)}
        className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground transition-colors"
      >
        <Menu className="size-5" strokeWidth={1.75} aria-hidden />
        القائمة
      </button>
    </nav>
  );
}
