"use client";

import { usePathname } from "next/navigation";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";
import { asideTitle, steps, type StepKey } from "@/features/onboarding/onboarding.content";

/** Which of the three panels a pathname is (FR-02.01). */
export function stepFor(pathname: string): StepKey {
  if (pathname.startsWith("/register/status")) return "provision";
  if (pathname.startsWith("/register/verify")) return "verify";
  return "details";
}

/**
 * `01 / 02 / 03` in Mono — text only, no coloured dots, no progress bar (FR-02.01).
 * The current panel is foreground; the others stay muted.
 */
export function StepCounter() {
  const current = stepFor(usePathname());
  const index = steps.findIndex((s) => s.key === current);
  return (
    <p className="flex items-center gap-1.5 text-sm" aria-label={`الخطوة ${index + 1} من 3: ${steps[index]!.label}`}>
      {steps.map((step, i) => (
        <span key={step.key} className="flex items-center gap-1.5" aria-hidden>
          {i > 0 ? <Mono className="text-muted-foreground/60">/</Mono> : null}
          <Mono className={cn(i === index ? "font-medium text-foreground" : "text-muted-foreground")}>{step.number}</Mono>
        </span>
      ))}
    </p>
  );
}

/** Desktop-only explainer on the opposite side: the three steps with large Mono numerals (M02 §6). */
export function StepsAside() {
  const current = stepFor(usePathname());
  const index = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex flex-col gap-10">
      <p className="text-sm text-muted-foreground">{asideTitle}</p>
      <ol className="flex flex-col gap-8">
        {steps.map((step, i) => (
          <li
            key={step.key}
            aria-current={i === index ? "step" : undefined}
            className={cn("flex items-start gap-6", i === index ? "text-foreground" : "text-muted-foreground")}
          >
            <Mono className={cn("text-5xl leading-none font-medium", i === index ? "" : "text-muted-foreground/50")}>
              {step.number}
            </Mono>
            <span className="flex flex-col gap-1.5 pt-1">
              <span className="text-base font-medium">{step.label}</span>
              <span className="max-w-xs text-sm leading-relaxed text-muted-foreground">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
