import Link from "next/link";
import { StepCounter, StepsAside } from "@/features/onboarding/components/wizard-steps";
import { wordmark } from "@/features/onboarding/onboarding.content";

/**
 * The wizard frame (M02 §6): one column of at most 480px with a text wordmark at its
 * start, and on desktop a fixed text column on the opposite side explaining the three
 * steps. Zinc only (constitution I-ب): no side image, no illustration, no brand hue.
 */
export default function RegisterLayout({ children }: LayoutProps<"/register">) {
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,30rem)_1fr] lg:gap-24 lg:py-12">
      <div className="flex min-w-0 flex-col gap-8 lg:gap-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex h-11 items-center text-xl font-semibold tracking-tight">
            {wordmark.name}
            <span className="text-muted-foreground">{wordmark.dot}</span>
          </Link>
          <StepCounter />
        </header>
        <main id="main" className="flex flex-col">
          {children}
        </main>
      </div>
      <aside className="hidden border-s border-border ps-16 lg:flex lg:flex-col lg:justify-center">
        <div className="sticky top-12">
          <StepsAside />
        </div>
      </aside>
    </div>
  );
}
