"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Moon, Sun } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useLogout, useWallet } from "@/features/sharwa-pay/api";

/**
 * «محفظة شروة» chrome (M40 §6): one column, 480px max on wide screens, zinc tokens only
 * (no store colour, no purple — §11 I). Offline means NO numbers: the screen is replaced
 * by «لا اتصال — لا نعرض رصيداً قديماً» (US-40.5 a1). The service worker registered here
 * caches nothing; it exists so the app can be installed (FR-40.06).
 */
export const payPrimary = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-cta px-4 text-base font-medium text-cta-foreground shadow-xs disabled:cursor-not-allowed disabled:opacity-50";
export const paySecondary = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 text-base disabled:cursor-not-allowed disabled:opacity-50";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

export function PayShell({ children }: { children: ReactNode }) {
  const online = useOnline();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sharwa-pay/sw.js", { scope: "/sharwa-pay/" }).catch(() => undefined);
  }, []);
  return (
    <div className="flex min-h-dvh flex-col bg-background" data-testid="pay-shell">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-[480px] items-center gap-2 px-4">
          <Link href="/sharwa-pay" className="flex min-h-12 flex-1 items-center text-base font-medium">
            محفظة شروة
          </Link>
          <InstallButton />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-5 px-4 pt-5 pb-32">
        {online ? children : <OfflineState />}
      </main>
    </div>
  );
}

export function OfflineState() {
  return (
    <div role="status" className="flex flex-col gap-2 surface-card p-6" data-testid="pay-offline">
      <p className="text-base font-medium">لا اتصال — لا نعرض رصيداً قديماً</p>
      <p className="text-sm text-muted-foreground">تعرض المحفظة أرصدتك من الخادم مباشرة فقط. أعد الاتصال بالإنترنت ثم حدّث الصفحة.</p>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="تبديل المظهر" className="inline-flex size-12 items-center justify-center rounded-md text-muted-foreground">
      <Moon className="size-5 dark:hidden" strokeWidth={1.75} aria-hidden />
      <Sun className="hidden size-5 dark:block" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

function LogoutButton() {
  const wallet = useWallet();
  const logout = useLogout();
  const router = useRouter();
  if (!wallet.data) return null;
  return (
    <button
      type="button"
      aria-label="تسجيل الخروج"
      className="inline-flex size-12 items-center justify-center rounded-md text-muted-foreground"
      onClick={() => logout.mutate(undefined, { onSettled: () => router.replace("/sharwa-pay") })}
      data-testid="pay-logout"
    >
      <LogOut className="size-5" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

/** US-40.5: «أضف إلى الشاشة الرئيسية» when the browser offers it; an iOS hint otherwise. */
function InstallButton() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) return;
    // Client-only capability probe, read once after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const on = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);
  if (!evt && !ios) return null;
  return (
    <div className="relative">
      <button type="button" className="inline-flex min-h-12 items-center rounded-md px-2 text-xs text-muted-foreground" onClick={() => (evt ? void evt.prompt().then(() => setEvt(null)) : setHint(!hint))} data-testid="pay-install">
        أضف إلى الشاشة الرئيسية
      </button>
      {hint ? <p className="absolute end-0 top-full z-10 mt-1 w-56 rounded-md border border-border bg-popover p-3 text-xs">في Safari: زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».</p> : null}
    </div>
  );
}

/** Sub-pages need a session: 401 → back to `/sharwa-pay` (the phone screen). */
export function RequireWallet({ children }: { children: (w: NonNullable<ReturnType<typeof useWallet>["data"]>) => ReactNode }) {
  const wallet = useWallet();
  const router = useRouter();
  const unauthenticated = isApiError(wallet.error) && wallet.error.status === 401;
  useEffect(() => {
    if (unauthenticated) router.replace("/sharwa-pay");
  }, [unauthenticated, router]);
  if (wallet.isLoading || unauthenticated) return <BalancesSkeleton />;
  if (wallet.error || !wallet.data) return <PayError error={wallet.error} onRetry={() => void wallet.refetch()} />;
  return <>{children(wallet.data)}</>;
}

export function BalancesSkeleton() {
  return (
    <div className="flex flex-col gap-2" data-testid="balances-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function PayError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 surface-card p-6">
      <p className="text-base font-medium">تعذّر التحميل</p>
      {error instanceof Error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      <button type="button" className={paySecondary} onClick={onRetry}>
        إعادة المحاولة
      </button>
    </div>
  );
}

export function BottomBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <div className={cn("mx-auto grid max-w-[480px] gap-2 px-4 py-3", className)}>{children}</div>
    </div>
  );
}
