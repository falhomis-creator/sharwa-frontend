"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/shared/logo";
import { nav } from "@/features/landing/original.content";
import { cn } from "@/lib/utils";

/**
 * `.navbar` ported from the original template, now in two states.
 *
 * Over the hero video the bar is fully transparent with white type, so the
 * footage runs edge to edge behind it. Once the page scrolls past the top it
 * crosses to the cream ground with ink type and a hairline, which is the
 * palette the rest of the site is in.
 *
 * The crossing is detected with an IntersectionObserver on a 1px sentinel at
 * the very top of the document rather than a scroll listener — no handler runs
 * per frame, and the browser does the measuring off the main thread.
 *
 * Two actions only. The template's third button, "🔗 محفظتي (شروة باي)", is
 * deliberately gone, and so are the section anchors — the page is the hero and
 * nothing else, so there is nothing to navigate to and no drawer to open.
 */
export function SiteHeader() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setPinned(!entry!.isIntersecting), {
      threshold: 1,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="absolute top-0 h-px w-full" />
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          pinned
            ? "sharwa-navbar border-zinc-200/60 shadow-sm backdrop-blur-md"
            : "border-white/10 bg-transparent",
        )}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3.5 sm:px-8">
          <Link
            href="/"
            aria-label="منصة شروة — الصفحة الرئيسية"
            className={cn(
              "flex min-h-11 items-center transition-colors duration-300",
              pinned ? "text-zinc-900" : "text-white",
            )}
          >
            <Logo dotClassName={pinned ? "text-emerald-600" : "text-white"} />
          </Link>

          <nav aria-label="إجراءات الحساب" className="flex items-center gap-2 sm:gap-2.5">
            <Link
              href="/login"
              className={cn(
                "flex min-h-11 items-center rounded-xl px-3 text-sm font-bold transition-colors duration-300 sm:px-4",
                pinned
                  ? "text-zinc-600 hover:text-zinc-900"
                  : "border border-white/25 text-zinc-200 hover:border-white/40 hover:text-white",
              )}
            >
              {nav.login}
            </Link>
            <Link
              href="/register"
              className={cn(
                "flex min-h-11 items-center rounded-xl px-5 text-sm font-bold transition-colors duration-300 sm:px-[22px]",
                pinned
                  ? "bg-zinc-900 text-white hover:bg-zinc-700"
                  : // Over the footage it is an outlined pill, brighter than
                    // the sign-in link beside it.
                    "border border-white/80 bg-transparent text-white hover:bg-white/10",
              )}
            >
              {nav.createStore}
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
