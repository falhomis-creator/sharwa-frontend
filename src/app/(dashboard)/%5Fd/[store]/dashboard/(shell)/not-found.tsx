import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Not-found inside the shell: the sidebar lists every destination of the platform, and the
 * screens arrive phase by phase. Until a screen exists, its route lands here — inside the
 * shell, so the merchant can keep navigating.
 */
export default function DashboardNotFound() {
  return (
    <EmptyState
      title="هذه الشاشة غير متاحة بعد"
      description="القسم موجود في خطة البناء ولم يُنفَّذ في هذه المرحلة."
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
