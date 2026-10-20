"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ArrowLeft, Moon, Sun, WifiOff } from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { useCurrentShift } from "@/features/pos/api";
import { usePosCart } from "@/features/pos/cart-store";
import { usePosSession } from "@/features/pos/components/pos-provider";
import { SHIFT_STATUS_LABELS } from "@/features/pos/schemas";

/**
 * POS chrome (M16 FR-16.01): full screen, no merchant sidebar, one 56px bar with the
 * register, location and shift opening time (FR-16.02) and the four till destinations.
 * The «غير متصل» strip is fixed while the browser is offline (US-16.5.2).
 */
function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

const NAV = [
  { href: "/pos/sell", label: "البيع", hint: "F2" },
  { href: "/pos/drawer", label: "درج الكاش" },
  { href: "/pos/receipts", label: "الإيصالات" },
  { href: "/pos/shift/close", label: "إغلاق الوردية" },
] as const;

export function PosFrame({ children }: { children: ReactNode }) {
  const online = useOnline();
  const pathname = usePathname();
  const session = usePosSession();
  const shift = useCurrentShift();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    void usePosCart.persist.rehydrate();
  }, []);

  const s = shift.data;
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background" data-testid="pos-frame">
      {!online ? (
        <div role="status" className="sticky top-0 z-50 flex h-10 items-center justify-center gap-2 border-b border-border bg-foreground text-sm text-background" data-testid="pos-offline">
          <WifiOff className="size-4" strokeWidth={1.75} aria-hidden />
          غير متصل — السلة محفوظة على هذا الجهاز، والإتمام يُعاد إرساله عند عودة الاتصال.
        </div>
      ) : null}
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-1.5 lg:px-4">
        <Link href="/dashboard" className="flex size-12 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="العودة إلى لوحة التاجر">
          <ArrowLeft className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium">{session.storeName} · نقطة البيع</span>
          {s ? (
            <span className="truncate text-xs text-muted-foreground" data-testid="pos-shift-line">
              {s.register.name} · {s.register.location.name} · فُتحت <Mono>{formatDate(s.opened_at, { dateStyle: "short", timeStyle: "short" })}</Mono>
              {s.status !== "open" ? <span className="ms-1 text-foreground">· {SHIFT_STATUS_LABELS[s.status]}</span> : null}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">لا وردية مفتوحة</span>
          )}
        </div>
        {s ? (
          <nav aria-label="أقسام نقطة البيع" className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:ms-4 md:w-auto">
            {NAV.map((n) => {
              const active = pathname === n.href || (n.href !== "/pos/sell" && pathname.startsWith(`${n.href}/`));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex h-12 shrink-0 items-center rounded-md px-3 text-sm transition-colors", active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
        <div className="ms-auto flex items-center gap-1">
          <span className="hidden text-sm text-muted-foreground sm:inline" data-testid="pos-staff">
            {session.fullName}
          </span>
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="تبديل المظهر بين الفاتح والداكن"
            className="flex size-12 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Moon className="size-5 dark:hidden" strokeWidth={1.75} aria-hidden />
            <Sun className="hidden size-5 dark:block" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </header>
      <main id="main" className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
