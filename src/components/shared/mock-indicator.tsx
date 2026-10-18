"use client";

import { useEffect } from "react";
import { setMockObserver } from "@/lib/api-client";
import { useDevFlags } from "@/stores/dev-flags";

/**
 * 1px amber line + label, dev only, shown once any response carried `x-sharwa-mock: 1`.
 * Server-rendered mock usage can force it via `initial`.
 */
export function MockIndicator({ initial = false }: { initial?: boolean }) {
  const saw = useDevFlags((s) => s.sawMockResponse);
  const setSawMock = useDevFlags((s) => s.setSawMock);

  useEffect(() => {
    if (initial) setSawMock(true);
    setMockObserver((isMock) => {
      if (isMock) setSawMock(true);
    });
    return () => setMockObserver(null);
  }, [initial, setSawMock]);

  if (process.env.NODE_ENV === "production" || !(saw || initial)) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center print:hidden"
    >
      <span className="h-px w-full bg-warning" />
      <span className="absolute top-0 rounded-b-md bg-warning px-2 py-0.5 font-mono text-[11px] leading-4 text-warning-foreground">
        بيانات تجريبية
      </span>
    </div>
  );
}
