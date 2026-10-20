"use client";

import { MessageCircleIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ltr } from "@/components/shared/mono";
import { prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { visiblePath } from "@/features/storefront/components/storefront-provider";

/**
 * Store footer: identity, the pages the store has (about, return policy), contact and the
 * social links the merchant filled in (M34 → `/config/`), and a quiet «مدعوم من شروة». Social
 * networks are text links — no brand-coloured logos (constitution I).
 */
export interface FooterInfo {
  storeName: string;
  about: boolean;
  returnPolicy: boolean;
  whatsapp: string | null;
  email: string | null;
  social: Array<{ label: string; href: string }>;
  platformUrl: string;
}

export function StoreFooter({ info }: { info: FooterInfo }) {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card pb-20 md:pb-0">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 text-sm md:grid-cols-[2fr_1fr_1fr] md:px-6">
        <div className="space-y-2">
          <p className="store-heading text-lg font-bold">{info.storeName}</p>
          {info.whatsapp ? (
            <p className="text-muted-foreground">
              واتساب: <Ltr>{prettyPhone(info.whatsapp)}</Ltr>
            </p>
          ) : null}
          {info.email ? (
            <p className="text-muted-foreground">
              البريد: <Ltr>{info.email}</Ltr>
            </p>
          ) : null}
        </div>
        <nav aria-label="صفحات المتجر" className="space-y-2">
          <p className="font-medium">المتجر</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link href="/products" className="inline-flex min-h-8 items-center hover:text-foreground">
                كل المنتجات
              </Link>
            </li>
            {info.about ? (
              <li>
                <Link href="/about" className="inline-flex min-h-8 items-center hover:text-foreground">
                  من نحن
                </Link>
              </li>
            ) : null}
            {info.returnPolicy ? (
              <li>
                <Link href="/about#returns" className="inline-flex min-h-8 items-center hover:text-foreground">
                  سياسة الاسترجاع
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
        {info.social.length > 0 ? (
          <nav aria-label="حسابات المتجر" className="space-y-2">
            <p className="font-medium">تابعنا</p>
            <ul className="space-y-1.5 text-muted-foreground">
              {info.social.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center hover:text-foreground">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
      <div className="border-t border-border/60 bg-muted/50">
        <p className="mx-auto flex w-full max-w-7xl items-center gap-1.5 px-4 py-4 text-xs text-muted-foreground md:px-6">
          {/* The one Sharwa mark on a merchant's store: the platform accent, read from the
              brand layer (`--accent-color`), which the merchant theme never overrides. */}
          <span aria-hidden className="size-2 rounded-full bg-[var(--accent-color)]" />
          مدعوم من{" "}
          <a href={info.platformUrl} className="font-semibold text-foreground underline-offset-4 hover:underline">
            شروة
          </a>
        </p>
      </div>
    </footer>
  );
}

/** Fixed WhatsApp contact (M09 US-09.3.4): Lucide `message-circle`, outline, no loud colour. */
export function WhatsAppButton({ number }: { number: string }) {
  const path = visiblePath(usePathname());
  if (path.startsWith("/checkout")) return null;
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل مع المتجر عبر واتساب"
      data-testid="whatsapp-button"
      className={cn(
        "store-frame fixed end-4 z-30 flex size-12 items-center justify-center rounded-full border-border bg-card text-foreground shadow-card-hover transition-colors hover:bg-muted",
        "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6",
        // Pages with their own sticky action bar on phones keep the bottom edge clear.
        (path.startsWith("/p/") || path === "/cart") && "hidden md:flex",
      )}
    >
      <MessageCircleIcon aria-hidden className="size-5" />
    </a>
  );
}
