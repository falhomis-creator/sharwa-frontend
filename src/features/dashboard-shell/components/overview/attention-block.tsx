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
      className="flex flex-col rounded-lg border border-border lg:col-span-4"
    >
      <header className="border-b border-border px-4 py-3">
        <h2 id="attention-heading" className="text-sm font-medium">
          يحتاج تدخلك
        </h2>
      </header>

      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">لا شيء يحتاج تدخلك الآن.</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <li key={row.key} className="border-b border-border last:border-0">
              <Link
                href={row.href}
                className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/60"
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
