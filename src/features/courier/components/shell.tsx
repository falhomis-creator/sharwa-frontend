"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Boxes, ListChecks, Moon, Sun, Timer, Wallet } from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMe, useOnline, useQueueReplay, type Snap } from "@/features/courier/api";
import { pendingCount, useQueueStore } from "@/features/courier/queue";

/**
 * Courier chrome (M38 §6, FR-38.09): one column capped at 480px, a 56px top bar with the
 * agent's name, the offline and queue markers, and a fixed bottom tab bar (every target
 * ≥ 48px, no hover-only affordance). Screens put their primary action in `<ActionBar>`,
 * which sits above the tab bar.
 */
export const touch = "min-h-12 min-w-12";
export const primaryAction = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-base font-medium text-background disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryAction = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 text-base disabled:cursor-not-allowed disabled:opacity-50";

const TABS = [
  { href: "/agent", label: "المناوبة", icon: Timer, exact: true },
  { href: "/agent/shipments", label: "شحناتي", icon: Boxes },
  { href: "/agent/custody", label: "العهدة", icon: Wallet },
  { href: "/agent/queue", label: "الطابور", icon: ListChecks },
];

export function CourierShell({ children }: { children: ReactNode }) {
  useQueueReplay();
  const me = useMe();
  const online = useOnline();
  const pending = useQueueStore((s) => pendingCount(s.actions));
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-background" data-testid="courier-shell">
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[480px] items-center gap-2 px-4">
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium" data-testid="agent-name">
              {me.data?.data.agent.name ?? "تطبيق المندوب"}
            </span>
            <span className="text-[11px] text-muted-foreground">{online ? "متصل" : "غير متصل"}</span>
          </span>
          {pending > 0 ? (
            <Link href="/agent/queue" className={cn("inline-flex items-center gap-1 rounded-md px-2 text-xs", touch)} data-testid="queue-badge">
              <Mono>{pending}</Mono> إجراءات بانتظار المزامنة
            </Link>
          ) : null}
          <ThemeToggle />
        </div>
        {!online ? (
          <p className="border-t border-border bg-muted px-4 py-2 text-center text-xs" data-testid="offline-bar" role="status">
            غير متصل — تُحفظ الإجراءات وتُرسل عند عودة الشبكة.
          </p>
        ) : null}
      </header>
      <main id="main" className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 pt-4 pb-40">
        <Gate query={me}>{children}</Gate>
      </main>
      <nav aria-label="أقسام التطبيق" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-[480px] grid-cols-4">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={active ? "page" : undefined} className={cn("flex h-14 flex-col items-center justify-center gap-0.5 text-[11px]", active ? "text-foreground" : "text-muted-foreground")} data-testid={`tab-${t.href.split("/").pop()}`}>
                  <t.icon className="size-5" strokeWidth={1.75} aria-hidden />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="تبديل المظهر" className={cn("inline-flex items-center justify-center rounded-md text-muted-foreground", touch)}>
      <Moon className="size-5 dark:hidden" strokeWidth={1.75} aria-hidden />
      <Sun className="hidden size-5 dark:block" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

/** 401 → the M18 staff login (and back); 403 without a provider profile → the sentence (§6). */
function Gate({ query, children }: { query: ReturnType<typeof useMe>; children: ReactNode }) {
  const status = isApiError(query.error) ? query.error.status : null;
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === 401) router.replace(`/dashboard/staff/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);
  if (query.isLoading) return <ShellSkeleton />;
  if (status === 401) return <p className="text-sm text-muted-foreground">جارٍ التحويل إلى تسجيل الدخول…</p>;
  if (status === 403) {
    return (
      <div role="alert" className="flex flex-col gap-2 rounded-lg border border-border p-5" data-testid="no-agent-profile">
        <p className="text-base font-medium">{query.error instanceof Error ? query.error.message : "لا صلاحية."}</p>
        <p className="text-sm text-muted-foreground">تواصل مع مالك المتجر لربط حسابك بملف مندوب.</p>
      </div>
    );
  }
  if (query.error) {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <p className="text-base font-medium">تعذّر تحميل التطبيق</p>
        <button type="button" className={secondaryAction} onClick={() => void query.refetch()}>
          إعادة المحاولة
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

export function ShellSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}

/** «غير متصل — آخر تحديث {وقت}» on a snapshot-served screen (US-38.2 a2). */
export function OfflineNote({ snap }: { snap: Snap<unknown> | undefined }) {
  if (!snap?.offline) return null;
  return (
    <p className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground" data-testid="offline-snapshot" role="status">
      غير متصل — آخر تحديث <Mono>{formatDateTime(snap.savedAt)}</Mono>
    </p>
  );
}

/** The fixed bottom action bar, above the tab bar (FR-38.09). */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-14 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]" data-testid="action-bar">
      <div className="mx-auto flex max-w-[480px] flex-col gap-2 px-4 py-3">{children}</div>
    </div>
  );
}

export function StatusText({ label, tone }: { label: string; tone: "info" | "success" | "warning" | "muted" }) {
  const dot = { info: "bg-info", success: "bg-success", warning: "bg-warning", muted: "bg-muted-foreground/60" }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
