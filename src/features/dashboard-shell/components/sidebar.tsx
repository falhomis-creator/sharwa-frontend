"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, Settings, ShoppingBag } from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  NAVIGATION,
  OVERVIEW_ITEM,
  SETTINGS_ITEM,
  type NavGroup,
} from "@/features/dashboard-shell/navigation";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { NavEntry } from "@/features/dashboard-shell/components/nav-entry";
import { counterValue, useCounters } from "@/features/dashboard-shell/hooks/use-counters";
import { useShellStore } from "@/stores/shell";
import type { Counters } from "@/features/dashboard-shell/schemas";

const NO_PERMISSION = "ليست لديك صلاحية لهذا القسم";

/**
 * Merchant sidebar (M03 US-03.2). 256px expanded, 64px rail. UI/UX Polish Phase: the deep
 * navy brand surface (`bg-sidebar`) with a translucent active block, bright blue icons and a blue logo tile,
 * as in the approved mockup. Every colour is a sidebar token from `globals.css`.
 *
 * The shell breakpoint is `lg` (1024px): below it the sidebar is not a rail but the
 * start-side drawer (`variant="drawer"`) plus the bottom bar — M03 §8 asks for a rail at
 * narrow widths and FR-03.13 asks for a drawer on mobile; at 768px a 256px panel would
 * take a third of the viewport, so the drawer wins the whole range under 1024px. Above it,
 * expanded vs. rail is the merchant's own stored choice.
 */
export function Sidebar({
  store,
  storeName,
  variant = "fixed",
  onNavigate,
}: {
  store: string;
  storeName: string;
  variant?: "fixed" | "drawer";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { canFeature, canPermission, canOwnerOnly } = useAccess();
  const sidebar = useShellStore((s) => s.sidebar);
  const expandedGroups = useShellStore((s) => s.expandedGroups);
  const collapsedGroups = useShellStore((s) => s.collapsedGroups);
  const toggleGroup = useShellStore((s) => s.toggleGroup);
  const counters = useCounters(store).data;

  // A rail inside a sheet is pointless: the drawer is always expanded.
  const rail = variant === "fixed" && sidebar === "rail";

  const isActive = (path: string) => {
    const base = path.split("#")[0]!;
    return pathname === base || (base !== "/dashboard" && pathname.startsWith(`${base}/`));
  };

  // A group disappears when its feature is off, when every item's feature is off, or when
  // the member has permission for none of its items — US-03.2.2 («تُخفى المجموعات الأخرى»
  // for a cashier). A group with a MIX still renders, with the denied items disabled and
  // explained by a tooltip (T056). Groups the backend does not gate at all stay visible:
  // inventing a permission key for them would be a field that no discovery supports.
  // Owner-only items are dropped for staff like a feature that is off — nothing to request.
  const visibleGroups = NAVIGATION.filter((group) => {
    if (!canFeature(group.feature)) return false;
    if (group.items.length === 0) return canPermission(group.permission);
    const withFeature = group.items.filter((item) => canFeature(item.feature) && canOwnerOnly(item.ownerOnly));
    if (withFeature.length === 0) return false;
    return withFeature.some((item) => canPermission(item.permission));
  });

  return (
    <nav
      aria-label="أقسام اللوحة"
      data-state={rail ? "rail" : "expanded"}
      className={cn(
        "flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground",
        variant === "fixed" && "border-e border-sidebar-border",
        rail ? "w-16" : "w-64",
      )}
    >
      <div className={cn("flex h-12 shrink-0 items-center border-b border-sidebar-border", rail ? "justify-center" : "px-4")}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          title={storeName}
          className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg"
        >
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cta text-cta-foreground shadow-button">
            <ShoppingBag className="size-4" strokeWidth={2} />
          </span>
          {rail ? (
            <span className="sr-only">{storeName}</span>
          ) : (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-base font-bold text-sidebar-strong">{storeName}</span>
              <span className="truncate text-[11px] text-sidebar-foreground">لوحة التحكم</span>
            </span>
          )}
        </Link>
      </div>

      {/* `min-h-0` is load-bearing: without it this flex child keeps its content height and runs
          past the 100dvh rail instead of scrolling (the «تصميم المتجر» items became unreachable). */}
      <div className="scrollbar-sidebar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          <li>
            {rail ? (
              <RailLink
                title={OVERVIEW_ITEM.title}
                href={OVERVIEW_ITEM.path}
                active={pathname === OVERVIEW_ITEM.path}
                icon={LayoutDashboard}
              />
            ) : (
              <NavEntry
                title={OVERVIEW_ITEM.title}
                href={OVERVIEW_ITEM.path}
                active={pathname === OVERVIEW_ITEM.path}
                onNavigate={onNavigate}
              />
            )}
          </li>
        </ul>

        <ul className="mt-3 flex flex-col gap-1">
          {visibleGroups.map((group) => (
            <li key={group.key}>
              <SidebarGroupRow
                group={group}
                rail={rail}
                expanded={expandedGroups.includes(group.key)}
                collapsed={collapsedGroups.includes(group.key)}
                onToggle={(open) => toggleGroup(group.key, open)}
                isActive={isActive}
                counters={counters}
                canFeature={canFeature}
                canPermission={canPermission}
                canOwnerOnly={canOwnerOnly}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        {rail ? (
          <RailLink title={SETTINGS_ITEM.title} href={SETTINGS_ITEM.path} active={isActive(SETTINGS_ITEM.path)} icon={Settings} />
        ) : (
          <NavEntry
            title={SETTINGS_ITEM.title}
            href={SETTINGS_ITEM.path}
            active={isActive(SETTINGS_ITEM.path)}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </nav>
  );
}

/** Rail affordance: a 44px square target with the name as a tooltip (US-03.2.4). */
function RailLink({
  title,
  href,
  active,
  icon: Icon,
}: {
  title: string;
  href: string;
  active?: boolean;
  icon: NavGroup["icon"];
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex size-10 items-center justify-center rounded-lg transition-colors",
              active
                ? "bg-white/10 text-white"
                : "text-sidebar-icon hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          />
        }
      >
        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">{title}</span>
      </TooltipTrigger>
      <TooltipContent side="inline-start">{title}</TooltipContent>
    </Tooltip>
  );
}

function SidebarGroupRow({
  group,
  rail,
  expanded,
  collapsed,
  onToggle,
  isActive,
  counters,
  canFeature,
  canPermission,
  canOwnerOnly,
  onNavigate,
}: {
  group: NavGroup;
  rail: boolean;
  expanded: boolean;
  collapsed: boolean;
  onToggle: (open: boolean) => void;
  isActive: (path: string) => boolean;
  counters: Counters | undefined;
  canFeature: (key?: NavGroup["feature"]) => boolean;
  canPermission: (key?: NavGroup["permission"]) => boolean;
  canOwnerOnly: (ownerOnly?: boolean) => boolean;
  onNavigate?: () => void;
}) {
  const groupAllowed = canPermission(group.permission);
  const count = counterValue(counters, group.counter);
  const items = group.items.filter((item) => canFeature(item.feature) && canOwnerOnly(item.ownerOnly));
  const groupActive = items.some((item) => isActive(item.path)) || (group.path ? isActive(group.path) : false);
  // Only the most specific match is marked (`/products/organization` must not also light up
  // «جميع المنتجات» at `/products`).
  const activeItemPath = items
    .filter((item) => isActive(item.path))
    .reduce<string | null>((best, item) => (best === null || item.path.length > best.length ? item.path : best), null);
  // Open when the merchant opened it, or when the current screen lives inside it — unless the
  // merchant collapsed it. An explicit collapse wins over «active», so the chevron always works.
  const open = !collapsed && (expanded || groupActive);
  const panelId = `sidebar-group-${group.key}`;

  // A group that is itself a destination (المحادثات, متجر التطبيقات) renders as one row.
  if (items.length === 0 && group.path) {
    if (rail) {
      return groupAllowed ? (
        <RailLink title={group.title} href={group.path} active={groupActive} icon={group.icon} />
      ) : (
        <RailDisabled title={group.title} icon={group.icon} />
      );
    }
    return (
      <div className="flex items-center gap-2 ps-3">
        <group.icon
          className={cn("size-4 shrink-0", groupActive ? "text-sidebar-strong" : "text-sidebar-icon")}
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <NavEntry
            title={group.title}
            href={group.path}
            active={groupActive}
            count={count}
            disabledReason={groupAllowed ? undefined : NO_PERMISSION}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    );
  }

  if (rail) {
    return (
      <div className="group/rail relative">
        {groupAllowed ? (
          <RailLink
            title={group.title}
            href={items[0]?.path ?? group.path ?? "/dashboard"}
            active={groupActive}
            icon={group.icon}
          />
        ) : (
          <RailDisabled title={group.title} icon={group.icon} />
        )}
        {groupAllowed && items.length > 0 ? (
          <div className="pointer-events-none absolute top-0 start-full z-40 hidden ps-1 group-hover/rail:block group-focus-within/rail:block">
            <ul className="pointer-events-auto w-60 rounded-xl border border-sidebar-border bg-sidebar p-1.5 text-sidebar-foreground shadow-card">
              <li className="px-3 py-1.5 text-xs text-sidebar-foreground/70">{group.title}</li>
              {items.map((item) => (
                <li key={item.key}>
                  <NavEntry
                    title={item.title}
                    href={item.path}
                    active={item.path === activeItemPath}
                    count={counterValue(counters, item.counter)}
                    disabledReason={canPermission(item.permission) ? undefined : NO_PERMISSION}
                    comingSoon={item.comingSoon}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(open)}
        aria-expanded={open && groupAllowed}
        aria-controls={open && groupAllowed ? panelId : undefined}
        disabled={!groupAllowed}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-lg px-3 text-sm transition-colors md:h-9",
          groupAllowed
            ? "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            : "cursor-not-allowed text-sidebar-foreground/45",
          groupActive && "font-medium text-sidebar-strong",
        )}
      >
        <group.icon
          className={cn("size-4 shrink-0", groupActive ? "text-sidebar-strong" : "text-sidebar-icon")}
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="flex-1 truncate text-start">{group.title}</span>
        {count > 0 ? (
          <Mono className="shrink-0 rounded-full bg-cta px-1.5 text-xs text-cta-foreground">{count}</Mono>
        ) : null}
        <ChevronDown
          className={cn("size-4 shrink-0 text-sidebar-foreground/60 transition-transform", open && groupAllowed && "rotate-180")}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
      {open && groupAllowed ? (
        <ul id={panelId} className="mt-1 flex flex-col gap-0.5 border-s border-sidebar-border ms-5 ps-2">
          {items.map((item) => (
            <li key={item.key}>
              <NavEntry
                title={item.title}
                href={item.path}
                active={item.path === activeItemPath}
                count={counterValue(counters, item.counter)}
                disabledReason={canPermission(item.permission) ? undefined : NO_PERMISSION}
                comingSoon={item.comingSoon}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function RailDisabled({ title, icon: Icon }: { title: string; icon: NavGroup["icon"] }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            aria-disabled="true"
            className="flex size-10 cursor-not-allowed items-center justify-center rounded-lg text-sidebar-foreground/40"
          />
        }
      >
        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">{title}</span>
      </TooltipTrigger>
      <TooltipContent side="inline-start">{NO_PERMISSION}</TooltipContent>
    </Tooltip>
  );
}
