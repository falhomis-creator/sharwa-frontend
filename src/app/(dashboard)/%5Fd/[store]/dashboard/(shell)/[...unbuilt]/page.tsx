import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "قيد البناء", robots: { index: false, follow: false } };

/**
 * Placeholder for every sidebar destination whose screen has not been built yet.
 *
 * The navigation index is complete from M03 onward (the 15 groups of discovery 01 §4) while
 * the screens land phase by phase, so without this route every link would answer 404 — and
 * Next prefetches visible links, so an authenticated dashboard would log a console error per
 * link on first paint (which the visual gate treats as a failure, rightly: a 404 on a link
 * the UI itself renders is a defect).
 *
 * An explicit route always wins over this catch-all, so each screen removes itself from
 * here the moment it is added. In-entity 404s (a missing order) stay with `notFound()` and
 * `not-found.tsx`.
 */
export default function UnbuiltScreenPage() {
  return (
    <EmptyState
      title="هذه الشاشة لم تُبنَ بعد"
      description="القسم موجود في خطة البناء وسيُنفَّذ في مرحلة لاحقة من الخطة."
      action={
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          رجوع إلى النظرة العامة
        </Link>
      }
    />
  );
}
