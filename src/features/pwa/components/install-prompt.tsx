"use client";

import { XIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { sendInstallEvent } from "@/features/pwa/install-events";
import { useCart } from "@/features/cart/api";
import { useStorefront, visiblePath } from "@/features/storefront/components/storefront-provider";

/**
 * «أضف المتجر إلى شاشتك الرئيسية» (M44 US-44.1, FR-44.06). Never on the first visit and
 * never on checkout: it appears after real interest — a second visit or a cart with items.
 * Chrome/Android: the deferred `beforeinstallprompt`; iOS Safari (no such event): a one-time
 * text hint with numbered steps. A dismissal is respected for 14 days; installation hides it
 * for good. One 1px-bordered line ≤ 56px above the bottom bar, closable from the keyboard.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY = "sharwa:pwa";
const DAY = 86_400_000;

interface Memory {
  visits: number;
  dismissedUntil: number;
  installed: boolean;
  iosHintShown: boolean;
}

function read(): Memory {
  try {
    return { visits: 0, dismissedUntil: 0, installed: false, iosHintShown: false, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { visits: 0, dismissedUntil: 0, installed: false, iosHintShown: false };
  }
}

function write(patch: Partial<Memory>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
  } catch {
    // storage unavailable: the prompt simply shows again next time
  }
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

export function InstallPrompt({ storeName }: { storeName: string }) {
  const { store } = useStorefront();
  const path = visiblePath(usePathname());
  const { data: cart } = useCart(store);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [eligible, setEligible] = useState(false);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    // One visit per browser session.
    try {
      if (!sessionStorage.getItem(`${KEY}:session`)) {
        sessionStorage.setItem(`${KEY}:session`, "1");
        write({ visits: read().visits + 1 });
      }
    } catch {
      // ignore
    }
    const memory = read();
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      write({ installed: true });
      sendInstallEvent("installed");
      setHidden(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const timer = window.setTimeout(() => {
      if (memory.installed || memory.dismissedUntil > Date.now()) return;
      setEligible(memory.visits >= 2);
      setIos(isIosSafari() && !memory.iosHintShown);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const interested = eligible || (cart?.count ?? 0) > 0;
  const canShow = !hidden && interested && !path.startsWith("/checkout") && (deferred !== null || ios);

  useEffect(() => {
    if (!canShow) return;
    sendInstallEvent(deferred ? "prompt_shown" : "ios_hint_shown");
    if (!deferred) write({ iosHintShown: true });
  }, [canShow, deferred]);

  if (!canShow) return null;

  const dismiss = () => {
    write({ dismissedUntil: Date.now() + 14 * DAY });
    sendInstallEvent("dismissed");
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) {
      setHintOpen(true);
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    sendInstallEvent(choice.outcome === "accepted" ? "accepted" : "dismissed");
    if (choice.outcome === "dismissed") write({ dismissedUntil: Date.now() + 14 * DAY });
    setDeferred(null);
    setHidden(true);
  };

  return (
    <>
      <div
        role="region"
        aria-label="تثبيت المتجر"
        data-testid="install-prompt"
        onKeyDown={(e) => e.key === "Escape" && dismiss()}
        className="store-frame fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center gap-2 rounded-lg border-border bg-card ps-4 pe-1 text-sm motion-safe:animate-in motion-safe:fade-in md:inset-x-auto md:end-6 md:bottom-6 md:w-[26rem]"
      >
        <p className="min-w-0 flex-1 truncate">أضف {storeName} إلى شاشتك الرئيسية</p>
        <button type="button" onClick={install} className="h-11 shrink-0 rounded-md px-3 font-medium store-link hover:bg-muted">
          {deferred ? "إضافة" : "كيف؟"}
        </button>
        <button type="button" aria-label="إغلاق" onClick={dismiss} className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
          <XIcon aria-hidden className="size-4" />
        </button>
      </div>
      <Drawer open={hintOpen} onOpenChange={setHintOpen}>
        <DrawerContent data-testid="ios-hint">
          <DrawerHeader className="border-b border-border text-start">
            <DrawerTitle>إضافة {storeName} إلى الشاشة الرئيسية</DrawerTitle>
          </DrawerHeader>
          <ol className="list-decimal space-y-3 px-9 py-5 text-sm leading-7 marker:font-mono">
            <li>اضغط زر «مشاركة» في شريط سفاري.</li>
            <li>اختر «إضافة إلى الشاشة الرئيسية».</li>
            <li>اضغط «إضافة» في أعلى الشاشة.</li>
          </ol>
        </DrawerContent>
      </Drawer>
    </>
  );
}
