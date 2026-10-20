"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";
import { useInventoryCounters } from "@/features/inventory/api";

/**
 * The inventory hub's sub-navigation (M21 §6): one sidebar entry, five screens reached
 * from this text row — never five sidebar items. Counts in Mono, no badges.
 */
const SCREENS = [
  { key: "table", title: "الجدول", href: "/dashboard/inventory" },
  { key: "movements", title: "سجل الحركات", href: "/dashboard/inventory/movements" },
  { key: "items", title: "الوحدات المسلسلة", href: "/dashboard/inventory/items" },
  { key: "reservations", title: "الحجوزات", href: "/dashboard/inventory/reservations" },
  { key: "writeoffs", title: "طلبات الإعدام", href: "/dashboard/inventory/writeoffs" },
] as const;

export function InventoryNav({ enabled = true }: { enabled?: boolean }) {
  const path = usePathname();
  const counters = useInventoryCounters(enabled).data;
  return (
    <nav aria-label="أقسام المخزون" className="-mb-2 flex gap-1 overflow-x-auto border-b border-border text-sm">
      {SCREENS.map((s) => {
        const active = s.href === "/dashboard/inventory" ? path.endsWith("/dashboard/inventory") : path.startsWith(s.href);
        return (
          <Link
            key={s.key}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-2 transition-colors lg:min-h-9",
              active ? "border-cta font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {s.title}
            {s.key === "writeoffs" && counters && counters.pending_writeoffs > 0 ? <Mono className="text-xs">{counters.pending_writeoffs}</Mono> : null}
          </Link>
        );
      })}
    </nav>
  );
}
