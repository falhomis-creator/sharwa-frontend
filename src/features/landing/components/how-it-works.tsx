import { Mono } from "@/components/shared/mono";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { howItWorks, sections } from "@/features/landing/landing.content";

/**
 * T037 — three steps carried by oversized muted numerals and 1px rules
 * (vertical between columns on desktop, horizontal between rows on mobile).
 * No connector arrows, no circles, no icons.
 *
 * The numerals sit at /80 rather than the /40 the task sketched: /40 measured
 * 1.68:1 against the page, below the 3:1 WCAG minimum for large text (T045
 * outranks the sketch). They still read as clearly secondary to the step title.
 */
export function HowItWorks() {
  return (
    <section id="how" className="mx-auto w-full max-w-6xl px-6">
      <SectionHeading label={sections.how.label} title={sections.how.title} />

      <ol className="mt-12 grid grid-cols-1 lg:mt-16 lg:grid-cols-3">
        {howItWorks.map((step, i, arr) => (
          <li
            key={step.num}
            className={`flex flex-col gap-4 border-border/60 py-8 ${i === arr.length - 1 ? "" : "border-b lg:border-b-0 lg:border-e"} ${i === 0 ? "lg:pe-10" : "lg:px-10"} ${i === arr.length - 1 ? "lg:pe-0 lg:ps-10" : ""}`}
          >
            <Mono className="text-brand-gradient text-6xl font-bold leading-none tracking-tight">
              {step.num}
            </Mono>
            <h3 className="text-lg font-medium tracking-tight text-foreground">{step.title}</h3>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
