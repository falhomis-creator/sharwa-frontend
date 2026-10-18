import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Frame shared by every home section: vertical rhythm from the preset's density, the
 * `show_on_mobile=false` rule (hidden under md only — US-09.1, FR-09.02) and an optional
 * start-aligned heading with «عرض الكل».
 */
export function SectionShell({
  id,
  title,
  href,
  showOnMobile = true,
  children,
  className,
  testId,
}: {
  id: number;
  title?: string | null;
  href?: string | null;
  showOnMobile?: boolean;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  const headingId = `section-${id}-title`;
  return (
    <section
      data-testid={testId}
      data-section-id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn("py-[calc(var(--store-section-y)/2)]", !showOnMobile && "hidden md:block", className)}
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        {title ? (
          <div className="mb-4 flex items-end justify-between gap-4 md:mb-6">
            <h2 id={headingId} className="text-xl font-bold tracking-tight md:text-2xl">
              {title}
            </h2>
            {href ? (
              <Link href={href} className="store-link inline-flex min-h-11 shrink-0 items-center text-sm font-medium underline-offset-4 hover:underline">
                عرض الكل
              </Link>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
