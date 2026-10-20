import Link from "next/link";
import { StepCounter, StepsAside } from "@/features/onboarding/components/wizard-steps";
import { wordmark } from "@/features/onboarding/onboarding.content";

/**
 * The wizard frame (M02 §6): one column of at most 480px with a text wordmark at its
 * start, and on desktop a fixed text column on the opposite side explaining the three
 * steps. UI/UX Polish Phase: the form sits in a white card on the cool gray ground and the steps
 * column is a navy brand panel (`.surface-brand` re-scopes the text tokens, so the step
 * components need no second set of classes). Still no image and no illustration.
 */
export default function RegisterLayout({ children }: LayoutProps<"/register">) {
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,30rem)_1fr] lg:gap-12 lg:py-12">
      <div className="flex min-w-0 flex-col gap-8 lg:gap-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex h-11 items-center text-xl font-semibold tracking-tight text-foreground">
            {wordmark.name}
            <span className="text-cta">{wordmark.dot}</span>
          </Link>
          <StepCounter />
        </header>
        <main id="main" className="surface-card flex flex-col p-6 sm:p-8">
          {children}
        </main>
      </div>
      <aside className="surface-brand hidden rounded-2xl p-12 shadow-card lg:flex lg:flex-col lg:justify-center">
        <div className="sticky top-12">
          <StepsAside />
        </div>
      </aside>
    </div>
  );
}
