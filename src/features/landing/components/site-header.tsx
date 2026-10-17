import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { nav } from "@/features/landing/original.content";

/**
 * `.navbar` ported from the original template: the wordmark at the start of
 * the line, the actions at the end, on a single zinc hairline.
 *
 * Two actions only. The template's third button, "🔗 محفظتي (شروة باي)", is
 * deliberately gone, and so are the section anchors — the page is the hero
 * and nothing else, so there is nothing to navigate to and no drawer to open.
 *
 * "إنشاء متجر" is ink, not green: the green belongs to the hero's primary
 * action, and two greens competing in one viewport is the noise this palette
 * removes.
 */
export function SiteHeader() {
  return (
    <header className="sharwa-navbar sticky top-0 z-50 w-full border-b border-zinc-200/60 backdrop-blur-md">
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
            className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-zinc-600 transition-colors hover:text-zinc-900 sm:px-4"
          >
            {nav.login}
          </Link>
          <Link
            href="/register"
            className="flex min-h-11 items-center rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white transition-colors hover:bg-zinc-700 sm:px-[22px]"
          >
            {nav.createStore}
          </Link>
        </nav>
      </div>
    </header>
  );
}
