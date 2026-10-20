"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { useAccess, useSession } from "@/features/dashboard-shell/components/session-context";
import { SECTION_META, SETTINGS_SECTIONS, type SettingsSection } from "@/features/settings/schemas";
import { useSettingsStore } from "@/stores/settings";

/**
 * The settings hub frame (M34 FR-34.01, §6): a sticky 220px vertical nav at the start with
 * a 1px end border and the section at most 720px wide; below `md` the nav becomes a sticky
 * select above the content. Sections whose feature is off are absent (FR-34.11).
 *
 * The «لديك تغييرات غير محفوظة» bar (FR-34.05) lives here: while an explicit section is
 * dirty, moving to another section is held until «حفظ» (its confirmation) or «تجاهل».
 */
const SETTINGS_ROOT = "/dashboard/settings";

/**
 * «الربط والتكاملات» (M19, Phase 5): its own screens, rendered inside this frame but not
 * M34 sections (no explicit-save form, no unsaved guard). Domains and webhooks are
 * owner-only; tracking lives under marketing (M19 §6) and is linked from here.
 */
const LINK_ITEMS: Array<{ key: string; title: string; href: string; ownerOnly?: boolean; feature?: "tracking_tools" }> = [
  { key: "domains", title: "النطاقات", href: `${SETTINGS_ROOT}/domains`, ownerOnly: true },
  { key: "webhooks", title: "Webhooks", href: `${SETTINGS_ROOT}/webhooks`, ownerOnly: true },
  { key: "integrations", title: "التكاملات", href: `${SETTINGS_ROOT}/integrations` },
  { key: "tracking", title: "أدوات التتبع", href: "/dashboard/marketing/tracking", ownerOnly: true, feature: "tracking_tools" },
];

function sectionOf(pathname: string): SettingsSection | null {
  const seg = pathname.slice(SETTINGS_ROOT.length + 1).split("/")[0];
  return (SETTINGS_SECTIONS as readonly string[]).includes(seg ?? "") ? (seg as SettingsSection) : null;
}

export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { canFeature } = useAccess();
  const current = sectionOf(pathname);
  const explicit = useSettingsStore((s) => s.explicit);
  const holdNavigation = useSettingsStore((s) => s.holdNavigation);
  const sections = SETTINGS_SECTIONS.filter((k) => canFeature(SECTION_META[k].feature));
  const isOwner = useSession().kind === "merchant";
  const links = LINK_ITEMS.filter((l) => (!l.ownerOnly || isOwner) && (!l.feature || canFeature(l.feature)));

  function guard(e: MouseEvent | null, href: string): boolean {
    if (explicit && href !== `${SETTINGS_ROOT}/${explicit.section}`) {
      e?.preventDefault();
      holdNavigation(href);
      return false;
    }
    return true;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5 border-b border-border pb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">الإعدادات</h1>
        <p className="max-w-prose text-sm text-muted-foreground md:text-base">
          كل ما يعرّف متجرك في مكان واحد. الشعار والألوان والخطوط في{" "}
          <Link href="/dashboard/design" className="text-foreground underline underline-offset-4">
            تصميم المتجر
          </Link>
          .
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
        {/* Phones: a sticky select. */}
        <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-card px-4 py-2 md:hidden">
          <NativeSelect
            aria-label="قسم الإعدادات"
            value={current ?? linkSegment(pathname) ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const href = v.startsWith("/") ? v : v ? `${SETTINGS_ROOT}/${v}` : SETTINGS_ROOT;
              if (guard(null, href)) router.push(href);
            }}
            className="h-11"
            data-testid="settings-section-select"
          >
            <option value="">كل الإعدادات</option>
            {sections.map((k) => (
              <option key={k} value={k}>
                {SECTION_META[k].title}
              </option>
            ))}
            {links.length ? (
              <optgroup label="الربط والتكاملات">
                {links.map((l) => (
                  <option key={l.key} value={l.href.startsWith(SETTINGS_ROOT) ? l.href.slice(SETTINGS_ROOT.length + 1) : l.href}>
                    {l.title}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </NativeSelect>
        </div>

        <nav aria-label="أقسام الإعدادات" className="hidden md:block">
          <ul className="sticky top-6 flex flex-col border-e border-border pe-4">
            <li>
              <Link
                href={SETTINGS_ROOT}
                onClick={(e) => guard(e, SETTINGS_ROOT)}
                aria-current={current === null ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center rounded-md px-3 text-sm transition-colors hover:bg-muted",
                  current === null ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground",
                )}
              >
                كل الإعدادات
              </Link>
            </li>
            {sections.map((k) => {
              const href = `${SETTINGS_ROOT}/${k}`;
              const meta = SECTION_META[k];
              return (
                <li key={k}>
                  <Link
                    href={href}
                    onClick={(e) => guard(e, href)}
                    aria-current={current === k ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center justify-between gap-2 rounded-md px-3 text-sm transition-colors hover:bg-muted",
                      current === k ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground",
                    )}
                    data-testid={`settings-nav-${k}`}
                  >
                    {meta.title}
                    {meta.ownerOnly ? <span aria-hidden className="size-1 rounded-full bg-destructive/70" title="إعداد مالي/بنيوي" /> : null}
                  </Link>
                </li>
              );
            })}
            {links.length ? (
              <li className="mt-4 border-t border-border pt-3">
                <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">الربط والتكاملات</p>
                <ul className="flex flex-col">
                  {links.map((l) => {
                    const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
                    return (
                      <li key={l.key}>
                        <Link
                          href={l.href}
                          onClick={(e) => guard(e, l.href)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex h-9 items-center rounded-md px-3 text-sm transition-colors hover:bg-muted",
                            active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground",
                          )}
                          data-testid={`settings-nav-${l.key}`}
                        >
                          {l.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ) : null}
          </ul>
        </nav>

        <div className="min-w-0 max-w-[720px]">
          {children}
          <UnsavedBar />
        </div>
      </div>
    </div>
  );
}

function UnsavedBar() {
  const explicit = useSettingsStore((s) => s.explicit);
  const nudge = useSettingsStore((s) => s.nudge);
  const pendingHref = useSettingsStore((s) => s.pendingHref);

  if (!explicit) return null;
  return (
    <div
      role="region"
      aria-label="تغييرات غير محفوظة"
      className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border bg-card px-4 py-3 md:mx-0 md:rounded-t-lg md:border-x"
      data-testid="unsaved-bar"
    >
      {/* Re-keyed on every refused navigation, so the nudge animation replays (motion-safe). */}
      <div key={nudge} className="flex flex-wrap items-center justify-between gap-3 motion-safe:animate-[sharwa-nudge_300ms_ease-out]">
        <p className="text-sm">
          لديك تغييرات غير محفوظة في «{SECTION_META[explicit.section].title}»
          {pendingHref ? <span className="text-muted-foreground"> — احفظ أو تجاهل قبل الانتقال.</span> : null}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => explicit.discard()} data-testid="unsaved-discard">
            تجاهل
          </Button>
          <Button size="lg" className="h-11 lg:h-9" onClick={() => explicit.requestSave()} data-testid="unsaved-save">
            حفظ
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The select's value for a «الربط والتكاملات» screen under /settings (e.g. `webhooks/7` → `webhooks`). */
function linkSegment(pathname: string): string | null {
  const seg = pathname.slice(SETTINGS_ROOT.length + 1).split("/")[0] ?? "";
  return LINK_ITEMS.some((l) => l.href === `${SETTINGS_ROOT}/${seg}`) ? seg : null;
}
