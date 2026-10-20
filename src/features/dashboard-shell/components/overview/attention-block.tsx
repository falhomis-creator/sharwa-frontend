import Link from "next/link";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";
import { attentionRows } from "@/features/dashboard-shell/labels";
import type { Overview } from "@/features/dashboard-shell/schemas";

/**
 * «يحتاج تدخلك» — 4 columns of the Bento (M03 US-03.5, FR-03.11). Four text counters, each
 * a one-click route to its own screen. A zero row disappears; all-zero shows one line
 * (US-03.5.3). No icons in coloured circles, no progress rings.
 */
export function AttentionBlock({ attention }: { attention: Overview["attention"] }) {
  const rows = attentionRows(attention).filter((row) => row.count > 0);

  return (
    <section
      aria-labelledby="attention-heading"
      className="surface-card flex flex-col overflow-hidden lg:col-span-4"
    >
      <header className="border-b border-border/60 px-6 pt-5 pb-4">
        <h2 id="attention-heading" className="text-base font-semibold">
          يحتاج تدخلك
        </h2>
      </header>

      {rows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">لا شيء يحتاج تدخلك الآن.</p>
      ) : (
        <ul className="flex flex-col px-3 py-3">
          {rows.map((row) => (
            <li key={row.key}>
              <Link
                href={row.href}
                className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="min-w-0 truncate">{row.label}</span>
                <Mono
                  className={cn(
                    "shrink-0 text-base",
                    "critical" in row && row.critical ? "text-destructive" : "text-foreground",
                  )}
                >
                  {row.count}
                </Mono>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
