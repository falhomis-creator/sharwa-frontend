import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { nav } from "@/features/landing/original.content";

/**
 * `.navbar` ported from the original template: the wordmark at the start of
 * the line, the actions at the end, a frosted bar on a single hairline.
 *
 * Two actions only (owner direction 2026-10-17). The template's third button,
 * "🔗 محفظتي (شروة باي)", is deliberately gone. The section anchors this
 * header used to carry went with the sections themselves — the page is the
 * hero and nothing else, so there is nothing left to navigate to and no
 * mobile drawer to open.
 */
export function SiteHeader() {
  return (
    <header className="sharwa-navbar sticky top-0 z-50 w-full backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3.5 sm:px-8">
        <Link
          href="/"
          aria-label="منصة شروة — الصفحة الرئيسية"
          className="flex min-h-11 items-center"
        >
          <Logo />
        </Link>

        <nav aria-label="إجراءات الحساب" className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/login"
            className="sharwa-nav-link flex min-h-11 items-center rounded-xl px-3 text-sm font-bold sm:px-4"
          >
            {nav.login}
          </Link>
          <Link
            href="/register"
            className="sharwa-nav-btn flex min-h-11 items-center rounded-xl px-5 text-sm font-bold sm:px-[22px]"
          >
            {nav.createStore}
          </Link>
        </nav>
      </div>
    </header>
  );
}
