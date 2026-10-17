import { Mono } from "@/components/shared/mono";
import type { ProofStat } from "@/features/landing/landing.content";

/**
 * Proof figures: large tabular numerals, small muted labels, separated by 1px
 * logical rules rather than cards (constitution I + II). Three-across at every
 * width so the hero stays within 100dvh on a 390px screen (T034).
 */
export function ProofBar({ stats }: { stats: ProofStat[] }) {
  return (
    <dl className="grid grid-cols-3 border-t border-border/60">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col gap-1 border-border/60 py-5 pe-3 not-last:border-e sm:pe-6 sm:not-last:pe-8"
        >
          <dd className="flex items-baseline gap-1">
            <Mono className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              {stat.value}
            </Mono>
            <span className="text-xs text-muted-foreground sm:text-sm">{stat.unit}</span>
          </dd>
          <dt className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{stat.label}</dt>
        </div>
      ))}
    </dl>
  );
}
