"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { hero, nav } from "@/features/landing/landing.content";

/**
 * Sticky header: transparent over the hero, then a hairline-bordered frosted
 * bar once the page scrolls past 8px. Detected with an IntersectionObserver on
 * a sentinel — no scroll listener, so nothing runs on the main thread per frame.
 */
export function SiteHeader() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setPinned(!entry!.isIntersecting), {
      rootMargin: "-8px 0px 0px 0px",
      threshold: 1,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="absolute top-0 h-2 w-full" />
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          pinned
            ? "border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-6">
          <Link
            href="/"
            aria-label="شروه — الصفحة الرئيسية"
            className="flex min-h-11 items-center rounded-md transition-opacity hover:opacity-85"
          >
            <Logo mark="size-8" />
          </Link>

          <nav aria-label="أقسام الصفحة" className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            {/* Sign-in is one of the fold's two jobs, so it is a real bordered
                action at every width — not a muted ghost link that disappears
                under sm (owner direction 2026-10-17). */}
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              variant="outline"
              aria-label={hero.ctaLogin}
              className="h-11 rounded-lg border-border/80 px-3.5 text-sm font-medium text-foreground transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/6 hover:text-emerald-700 sm:h-10 sm:px-4 dark:hover:text-emerald-300"
            >
              {/* The label shortens under sm, where the full one crowds the
                  hamburger. Both spans stay in the DOM — CSS, not React, picks
                  one — so the accessible name comes from `aria-label` instead
                  of the two of them read back-to-back. */}
              <span aria-hidden className="sm:hidden">
                دخول
              </span>
              <span aria-hidden className="hidden sm:inline">
                {hero.ctaLogin}
              </span>
            </Button>
            <Button
              render={<a href="#start" />}
              nativeButton={false}
              className="hidden h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-md shadow-emerald-600/30 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/40 md:inline-flex"
            >
              {hero.cta}
            </Button>

            <Drawer swipeDirection="down" showSwipeHandle>
              <DrawerTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="فتح القائمة"
                    className="size-11 rounded-md md:hidden"
                  >
                    <Menu className="size-5" aria-hidden />
                  </Button>
                }
              />
              <DrawerContent className="px-6 pb-8">
                <DrawerHeader className="px-0">
                  <DrawerTitle className="flex items-center gap-2.5 text-start text-base">
                    <LogoMark className="size-7" />
                    شروه
                  </DrawerTitle>
                  <DrawerDescription className="text-start">
                    أقسام الصفحة والدخول إلى لوحة التاجر.
                  </DrawerDescription>
                </DrawerHeader>
                <nav aria-label="أقسام الصفحة" className="flex flex-col divide-y divide-border/60">
                  {nav.map((item) => (
                    <DrawerClose
                      key={item.href}
                      render={
                        <a
                          href={item.href}
                          className="flex min-h-11 items-center text-sm text-foreground"
                        >
                          {item.label}
                        </a>
                      }
                    />
                  ))}
                  <DrawerClose
                    render={
                      <Link
                        href="/login"
                        className="flex min-h-11 items-center text-sm text-foreground"
                      >
                        دخول التاجر
                      </Link>
                    }
                  />
                </nav>
                <DrawerClose
                  render={
                    <Button render={<a href="#start" />}
              nativeButton={false} className="mt-6 h-12 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500">
                      {hero.cta}
                    </Button>
                  }
                />
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </header>
    </>
  );
}
