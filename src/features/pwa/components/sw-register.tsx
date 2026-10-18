"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { visiblePath } from "@/features/storefront/components/storefront-provider";

/**
 * Registers `/sw.js` on the STORE origin only (this component lives in the storefront layout;
 * the platform origin never renders it — M44 §8). Registration waits for the page to settle
 * (`load` + idle) so it never competes with the first paint. A waiting new release is told to
 * take over only outside checkout (M44 §8: «skipWaiting مؤجَّل حتى مغادرة الدفع»).
 */
export function ServiceWorkerRegister() {
  const path = visiblePath(usePathname());

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    const register = () => {
      if (cancelled) return;
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
        console.warn("[pwa] service worker registration failed", err);
      });
    };
    const idle = () => {
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(register, { timeout: 4000 });
      else setTimeout(register, 1500);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", idle);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || path.startsWith("/checkout")) return;
    void navigator.serviceWorker.getRegistration().then((reg) => reg?.waiting?.postMessage("SKIP_WAITING"));
  }, [path]);

  return null;
}
