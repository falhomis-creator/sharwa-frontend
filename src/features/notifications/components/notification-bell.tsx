"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  CreditCard,
  Download,
  Info,
  MessagesSquare,
  PackageMinus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Mono } from "@/components/shared/mono";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_FILTERS,
  NOTIFICATION_KINDS,
  NOTIFICATION_KIND_LABELS,
  safeDashboardLink,
  type Notification,
  type NotificationKind,
} from "@/features/notifications/schemas";
import { useMarkRead, useNotificationSummary, useNotifications } from "@/features/notifications/api";

/**
 * Notification bell + panel (M49 core, T080). The count is Mono (`99+` cap), with a small
 * red dot only when something critical is unread; nothing at all at 0 (US-49.1). The panel
 * is a 400px sheet from the start side (full width on phones), with «الكل · غير المقروء»
 * and kind filters (`?kind=` in the URL), rows grouped by the server's `group_key`
 * (FR-49.03), optimistic read / read-all, and a calm «غير متاحة حالياً» when the backend
 * is absent (FR-49.09). `E` reads the focused row, `Shift+E` reads all.
 */
const ICONS: Record<NotificationKind, LucideIcon> = {
  order_new: ShoppingCart,
  payment_review: CreditCard,
  approval_pending: ShieldCheck,
  behavior_alert: AlertTriangle,
  inbox_unread: MessagesSquare,
  low_stock: PackageMinus,
  sync_failed: RefreshCw,
  awb_failed: Truck,
  export_ready: Download,
  billing_notice: Info,
  provisioning_notice: Info,
};

function kindOf(k: string): NotificationKind | null {
  return (NOTIFICATION_KINDS as readonly string[]).includes(k) ? (k as NotificationKind) : null;
}

const SEVERITY_DOT: Record<Notification["severity"], string> = {
  info: "bg-transparent",
  warning: "bg-warning",
  critical: "bg-destructive",
};

interface Group {
  key: string;
  items: Notification[];
  count: number;
  unread: boolean;
}

function groupRows(rows: Notification[]): Group[] {
  const map = new Map<string, Group>();
  const order: Group[] = [];
  for (const n of rows) {
    let g = map.get(n.group_key);
    if (!g) {
      g = { key: n.group_key, items: [], count: 0, unread: false };
      map.set(n.group_key, g);
      order.push(g);
    }
    g.items.push(n);
    g.count += n.count;
    g.unread ||= n.read_at === null;
  }
  return order;
}

export function NotificationBell() {
  const summary = useNotificationSummary();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const unread = summary.data?.unread_total ?? 0;
  const label = summary.isError ? "الإشعارات (غير متاحة حالياً)" : unread > 0 ? `الإشعارات: ${unread} غير مقروء` : "الإشعارات";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
        data-testid="notification-bell"
        className="relative flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:size-8"
      >
        <Bell className="size-4" strokeWidth={1.75} aria-hidden />
        <span aria-live="polite" className="sr-only">
          {unread > 0 ? `${unread} إشعارات غير مقروءة` : ""}
        </span>
        {unread > 0 ? (
          <span className="absolute -top-0.5 end-0 flex items-center gap-0.5 lg:-top-1 lg:-end-1.5" aria-hidden data-testid="bell-count">
            {summary.data?.has_critical ? <span className="size-1.5 rounded-full bg-destructive" data-testid="bell-critical" /> : null}
            <Mono className="rounded-sm border border-border bg-background px-0.5 text-[10px] leading-3.5 text-foreground">{unread > 99 ? "99+" : unread}</Mono>
          </span>
        ) : null}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 shadow-none data-[side=right]:w-full data-[side=right]:sm:max-w-[400px]"
          data-testid="notification-panel"
          finalFocus={triggerRef}
        >
          <SheetTitle className="sr-only">الإشعارات</SheetTitle>
          <SheetDescription className="sr-only">آخر 30 يوماً، مجمَّعة حسب المصدر</SheetDescription>
          {open ? <Panel unavailable={summary.isError} onNavigate={() => setOpen(false)} /> : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Panel({ unavailable, onNavigate }: { unavailable: boolean; onNavigate: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useQueryState("kind", parseAsString.withDefault("").withOptions({ history: "replace" }));
  const [unreadOnly, setUnreadOnly] = useState(false);
  const filter = NOTIFICATION_FILTERS.find((f) => f.key === kind);
  const kinds = filter ? [...filter.kinds] : [];
  const list = useNotifications(kinds.join(","), unreadOnly, !unavailable);
  const summary = useNotificationSummary().data;
  const { read, readAll } = useMarkRead();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [now] = useState(() => new Date());
  const groups = useMemo(() => groupRows(list.data?.results ?? []), [list.data]);

  // Filters for kinds this member never receives are hidden (FR-49.02: by_kind is trimmed server-side).
  const available = NOTIFICATION_FILTERS.filter((f) => f.kinds.some((k) => (summary?.by_kind[k] ?? 0) > 0) || f.key === kind);

  async function open(n: Notification) {
    void read(n).catch(() => toast.error("تعذّر تعليم الإشعار كمقروء."));
    const link = safeDashboardLink(n.link);
    if (link) {
      onNavigate();
      router.push(link);
    }
  }

  async function markAll() {
    try {
      await readAll(kinds);
    } catch {
      toast.error("تعذّر تعليم الكل كمقروء؛ أُعيدت الحالة.");
    }
  }

  return (
    <div
      className="flex h-full flex-col"
      onKeyDown={(e) => {
        if (e.key.toLowerCase() !== "e" || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.shiftKey) {
          e.preventDefault();
          void markAll();
          return;
        }
        const id = Number((document.activeElement as HTMLElement | null)?.dataset.notificationId);
        const n = list.data?.results.find((x) => x.id === id);
        if (n) {
          e.preventDefault();
          void read(n).catch(() => toast.error("تعذّر تعليم الإشعار كمقروء."));
        }
      }}
    >
      <header className="flex flex-col gap-3 border-b border-border p-4 pe-14">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">
            الإشعارات {summary && summary.unread_total > 0 ? <Mono className="text-sm text-muted-foreground">({summary.unread_total})</Mono> : null}
          </h2>
          {!unavailable && (summary?.unread_total ?? 0) > 0 ? (
            <button type="button" onClick={() => void markAll()} className="h-11 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground lg:h-8" data-testid="read-all">
              تعليم الكل كمقروء
            </button>
          ) : null}
        </div>
        <nav aria-label="فلاتر الإشعارات" className="-mx-1 flex flex-wrap gap-x-1 gap-y-1 text-sm">
          {[
            { key: "all", label: "الكل", active: !unreadOnly && !kind, onSelect: () => (setUnreadOnly(false), void setKind(null)) },
            { key: "unread", label: "غير المقروء", active: unreadOnly, onSelect: () => setUnreadOnly(!unreadOnly) },
            ...available.map((f) => ({
              key: f.key,
              label: f.label,
              count: f.kinds.reduce((n, k) => n + (summary?.by_kind[k] ?? 0), 0),
              active: kind === f.key,
              onSelect: () => void setKind(kind === f.key ? null : f.key),
            })),
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={t.active}
              onClick={t.onSelect}
              className={cn(
                "inline-flex min-h-11 items-center gap-1 rounded-md px-1.5 lg:min-h-8",
                t.active ? "text-foreground underline underline-offset-[6px]" : "text-muted-foreground hover:text-foreground",
              )}
              data-testid={`notif-filter-${t.key}`}
            >
              {t.label}
              {"count" in t && t.count ? <Mono className="text-xs">{t.count}</Mono> : null}
            </button>
          ))}
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {unavailable || list.isError ? (
          <p className="p-6 text-sm text-muted-foreground" data-testid="notifications-unavailable">
            الإشعارات غير متاحة حالياً.
          </p>
        ) : list.isLoading ? (
          <div className="flex flex-col gap-2 p-4" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{kind || unreadOnly ? "لا إشعارات تطابق هذا الفلتر." : "لا إشعارات — كل شيء تحت السيطرة."}</p>
        ) : (
          <ul data-testid="notification-list">
            {groups.map((g) => {
              const head = g.items[0]!;
              const k = kindOf(head.kind);
              const Icon = k ? ICONS[k] : Bell;
              const isOpen = expanded.includes(g.key);
              return (
                <li key={g.key} className="border-b border-border">
                  <div className="flex items-start gap-2 p-3 hover:bg-muted/50">
                    <button
                      type="button"
                      onClick={() => void open(head)}
                      data-notification-id={head.id}
                      className="flex min-w-0 flex-1 items-start gap-3 text-start focus-visible:outline-2 focus-visible:outline-ring"
                      data-testid="notification-row"
                      data-unread={g.unread || undefined}
                    >
                      <span className="relative mt-0.5 shrink-0">
                        <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                        <span aria-hidden className={cn("absolute -end-1 -top-1 size-1.5 rounded-full", SEVERITY_DOT[head.severity])} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cn("text-sm", g.unread ? "font-medium" : "text-muted-foreground")}>
                          {head.title}
                          {g.items.length > 1 ? <Mono className="ms-1 text-xs text-muted-foreground">×{g.items.length}</Mono> : null}
                        </span>
                        {head.body ? <span className="line-clamp-2 text-xs text-muted-foreground">{head.body}</span> : null}
                        <span className="text-[11px] text-muted-foreground">
                          {k ? NOTIFICATION_KIND_LABELS[k] : "إشعار"} ·{" "}
                          <time dateTime={head.created_at} title={formatDateTime(head.created_at)}>
                            {formatRelative(head.created_at, now)}
                          </time>
                        </span>
                      </span>
                      {g.unread ? <span aria-label="غير مقروء" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground" /> : null}
                    </button>
                    {g.items.length > 1 ? (
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? "طيّ المجموعة" : `عرض ${g.items.length} إشعارات فرادى`}
                        onClick={() => setExpanded(isOpen ? expanded.filter((x) => x !== g.key) : [...expanded, g.key])}
                        className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8"
                      >
                        <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  {isOpen ? (
                    <ul className="border-t border-border bg-muted/30">
                      {g.items.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => void open(n)}
                            data-notification-id={n.id}
                            className="flex min-h-11 w-full items-center gap-2 px-3 ps-10 text-start text-xs hover:bg-muted"
                          >
                            <span className={cn("min-w-0 flex-1 truncate", n.read_at ? "text-muted-foreground" : "")}>{n.title}</span>
                            <time dateTime={n.created_at} className="shrink-0 text-muted-foreground">
                              {formatRelative(n.created_at, now)}
                            </time>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
