import { Mono } from "@/components/shared/mono";
import { TRAFFIC_SOURCES, TRAFFIC_SOURCE_LABELS, type Overview, type TrafficSource } from "@/features/dashboard-shell/schemas";

/**
 * «مصادر الزيارات» — 8 columns (M03 US-03.5.1): horizontal bars in `foreground`, the share
 * as a Mono percentage, zero sources hidden, and explicitly NOT a pie chart.
 *
 * Drawn with two divs rather than Recharts (which T058 names): nine static bars do not
 * justify a ~100KB client chart library on the dashboard's first screen (SC-03.2), and
 * Recharts' SVG text defaults fight the token system. Recharts stays the choice for the
 * real time-series charts in M25.
 */
export function TrafficSourcesBlock({ sources }: { sources: Overview["traffic_sources"] }) {
  const rows = TRAFFIC_SOURCES.map((key) => ({ key, value: sources[key] ?? 0 })).filter((row) => row.value > 0);
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <section
      aria-labelledby="traffic-heading"
      className="flex flex-col rounded-lg border border-border lg:col-span-8"
    >
      <header className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <h2 id="traffic-heading" className="text-sm font-medium">
          مصادر الزيارات
        </h2>
        {total > 0 ? (
          <span className="text-xs text-muted-foreground">
            <Mono>{total.toLocaleString("en-US")}</Mono> زيارة
          </span>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">لا زيارات مسجّلة اليوم.</p>
      ) : (
        <ul className="flex flex-col gap-3 p-4">
          {rows.map((row) => (
            <li key={row.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{TRAFFIC_SOURCE_LABELS[row.key as TrafficSource]}</span>
                <span className="shrink-0 text-muted-foreground">
                  <Mono>{Math.round((row.value / total) * 100)}%</Mono>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-sm bg-muted">
                <div
                  className="h-full rounded-sm bg-foreground"
                  // Width is the share of the total, the same number the label shows —
                  // scaling to the largest source would draw a 41% bar at full width.
                  style={{ inlineSize: `${Math.max(2, Math.round((row.value / total) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
