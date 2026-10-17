import { SpotlightCard } from "@/components/motion/spotlight-card";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { PREVIEWS } from "@/features/landing/components/previews";
import { capabilities, sections, type Capability } from "@/features/landing/landing.content";

/**
 * T036 — asymmetric bento: 8/4 · 4/4/4 · 6/6 on `lg`, so no two consecutive
 * rows share a rhythm (constitution I forbids a rack of identical cards).
 * Cells are separated by a 1px border and filled mostly with air (`p-8`–`p-12`);
 * the only motion is a neutral light pool that follows the cursor.
 */
const SPAN: Record<Capability["size"], string> = {
  8: "lg:col-span-8",
  6: "lg:col-span-6",
  4: "lg:col-span-4",
};

/** Varied mobile heights so a single column still reads as a bento, not a list. */
const MIN_H: Record<Capability["size"], string> = {
  8: "min-h-80",
  6: "min-h-72",
  4: "min-h-60",
};

export function CapabilitiesBento() {
  return (
    <section id="capabilities" className="relative isolate mx-auto w-full max-w-6xl px-6">
      <div aria-hidden className="dot-field pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <SectionHeading {...sections.capabilities} />

      <ul className="mt-12 grid grid-cols-1 gap-4 lg:mt-16 lg:grid-cols-12">
        {capabilities.map((cap) => {
          const Preview = PREVIEWS[cap.preview];
          const wide = cap.size === 8;

          return (
            <SpotlightCard
              as="li"
              key={cap.key}
              className={`${SPAN[cap.size]} ${MIN_H[cap.size]} flex flex-col p-8 lg:p-10 ${wide ? "lg:p-12" : ""}`}
            >
              <div className={wide ? "flex flex-1 flex-col gap-10 lg:flex-row lg:items-center" : "flex flex-1 flex-col"}>
                <div className={wide ? "flex max-w-sm flex-col gap-3" : "flex flex-col gap-3"}>
                  <h3 className="text-xl font-medium tracking-tight text-foreground">{cap.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{cap.body}</p>
                </div>

                <div
                  className={
                    wide
                      ? "min-w-0 flex-1 rounded-lg border border-border/60 bg-background/40 p-4"
                      : "mt-8 flex-1 rounded-lg border border-border/60 bg-background/40 p-4"
                  }
                >
                  <Preview />
                </div>
              </div>
            </SpotlightCard>
          );
        })}
      </ul>
    </section>
  );
}
