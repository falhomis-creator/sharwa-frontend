import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { faqs, sections } from "@/features/landing/landing.content";

/**
 * T039 — one question open at a time, 1px horizontal rules, no card. The
 * chevron swap is direction-neutral (the primitive renders Down/Up rather than
 * rotating a side-pointing icon), so RTL needs no override.
 *
 * Asymmetric by design: the heading holds 4 columns and the questions 7, with
 * one empty column between them.
 */
export function Faq() {
  return (
    <section id="faq" className="mx-auto w-full max-w-6xl px-6">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-0">
        <div className="lg:col-span-4">
          <SectionHeading label={sections.faq.label} title={sections.faq.title} />
        </div>

        <Accordion multiple={false} className="lg:col-span-7 lg:col-start-6">
          {faqs.map((item) => (
            <AccordionItem key={item.q} value={item.q} className="border-border/60 not-last:border-b">
              <AccordionTrigger className="min-h-14 py-5 text-base font-medium hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
