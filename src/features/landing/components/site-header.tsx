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
import { Mono } from "@/components/shared/mono";
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
            className="group flex min-h-11 items-center gap-2 rounded-md px-1 text-base font-semibold tracking-tight"
          >
            <span className="flex items-baseline gap-2">
              شروه
              <Mono className="text-[0.7rem] font-normal text-muted-foreground transition-colors group-hover:text-foreground">
                sharwa
              </Mono>
            </span>
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
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              variant="ghost"
              className="hidden h-10 rounded-md px-3 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              دخول التاجر
            </Button>
            <Button
              render={<a href="#start" />}
              nativeButton={false}
              className="hidden h-10 rounded-md px-4 text-sm md:inline-flex"
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
                  <DrawerTitle className="text-start text-base">شروه</DrawerTitle>
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
              nativeButton={false} className="mt-6 h-12 w-full rounded-md text-sm">
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
