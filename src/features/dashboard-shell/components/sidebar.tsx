"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, Settings } from "lucide-react";
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
 * Merchant sidebar (M03 US-03.2). 256px expanded, 56px rail, separated by a 1px end
 * border and never a shadow (constitution I-ب).
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
  const { canFeature, canPermission } = useAccess();
  const sidebar = useShellStore((s) => s.sidebar);
  const expandedGroups = useShellStore((s) => s.expandedGroups);
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
  const visibleGroups = NAVIGATION.filter((group) => {
    if (!canFeature(group.feature)) return false;
    if (group.items.length === 0) return canPermission(group.permission);
    const withFeature = group.items.filter((item) => canFeature(item.feature));
    if (withFeature.length === 0) return false;
    return withFeature.some((item) => canPermission(item.permission));
  });

  return (
    <nav
      aria-label="أقسام اللوحة"
      data-state={rail ? "rail" : "expanded"}
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground",
        variant === "fixed" && "border-e border-border",
        rail ? "w-14" : "w-64",
      )}
    >
      <div className={cn("flex h-12 shrink-0 items-center border-b border-border", rail ? "justify-center" : "px-3")}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          title={storeName}
          className="flex h-11 min-w-0 items-center gap-2 rounded-md text-sm font-medium lg:h-8"
        >
          <span aria-hidden className="size-5 shrink-0 rounded-sm border border-border bg-background" />
          {rail ? <span className="sr-only">{storeName}</span> : <span className="truncate">{storeName}</span>}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
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
                onToggle={() => toggleGroup(group.key)}
                isActive={isActive}
                counters={counters}
                canFeature={canFeature}
                canPermission={canPermission}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 border-t border-border p-2">
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
              "flex size-10 items-center justify-center rounded-md transition-colors",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
  onToggle,
  isActive,
  counters,
  canFeature,
  canPermission,
  onNavigate,
}: {
  group: NavGroup;
  rail: boolean;
  expanded: boolean;
  onToggle: () => void;
  isActive: (path: string) => boolean;
  counters: Counters | undefined;
  canFeature: (key?: NavGroup["feature"]) => boolean;
  canPermission: (key?: NavGroup["permission"]) => boolean;
  onNavigate?: () => void;
}) {
  const groupAllowed = canPermission(group.permission);
  const count = counterValue(counters, group.counter);
  const items = group.items.filter((item) => canFeature(item.feature));
  const groupActive = items.some((item) => isActive(item.path)) || (group.path ? isActive(group.path) : false);
  // Only the most specific match is marked (`/products/organization` must not also light up
  // «جميع المنتجات» at `/products`).
  const activeItemPath = items
    .filter((item) => isActive(item.path))
    .reduce<string | null>((best, item) => (best === null || item.path.length > best.length ? item.path : best), null);
  // Open when the merchant opened it, or when the current screen lives inside it.
  const open = expanded || groupActive;

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
      <div className="flex items-center gap-2 px-1">
        <group.icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
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
            <ul className="pointer-events-auto w-60 rounded-md border border-border bg-popover p-1 text-popover-foreground">
              <li className="px-3 py-1.5 text-xs text-muted-foreground">{group.title}</li>
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
        onClick={onToggle}
        aria-expanded={open}
        disabled={!groupAllowed}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-md px-3 text-sm transition-colors md:h-9",
          groupAllowed ? "hover:bg-muted" : "cursor-not-allowed text-muted-foreground/70",
          groupActive && "font-medium",
        )}
      >
        <group.icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
        <span className="flex-1 truncate text-start">{group.title}</span>
        {count > 0 ? (
          <Mono className="shrink-0 rounded-sm bg-muted px-1.5 text-xs text-foreground">{count}</Mono>
        ) : null}
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
      {open && groupAllowed ? (
        <ul className="mt-0.5 flex flex-col gap-0.5 ps-6">
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
            className="flex size-10 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground/60"
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
