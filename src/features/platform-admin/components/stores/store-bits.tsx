"use client";

import { StatusText } from "@/features/platform-admin/components/bits";
import { MODULE_GROUPS, OTHER_GROUP, SHARWA_SHIP_LABELS, type SharwaShipState } from "@/features/platform-admin/schemas";

export function SharwaShipCell({ state }: { state: SharwaShipState }) {
  const tone = state === "active" ? "success" : state === "inactive" ? "muted" : "info";
  return (
    <StatusText tone={tone} testId={`sharwa-ship-${state}`}>
      {SHARWA_SHIP_LABELS[state]}
    </StatusText>
  );
}

/**
 * Group rows by the sidebar's module groups (M46 §5), in that order; a code the map does
 * not know lands in «أخرى» instead of disappearing (M46 §8).
 */
export function groupByModule<T extends { code: string }>(rows: T[]): Array<{ key: string; label: string; rows: T[] }> {
  const out: Array<{ key: string; label: string; rows: T[] }> = MODULE_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    rows: (g.codes as readonly string[]).flatMap((c) => rows.filter((r) => r.code === c)),
  }));
  const known = new Set(MODULE_GROUPS.flatMap((g) => g.codes as readonly string[]));
  const other = rows.filter((r) => !known.has(r.code));
  if (other.length) out.push({ key: OTHER_GROUP.key, label: OTHER_GROUP.label, rows: other });
  return out.filter((g) => g.rows.length > 0);
}
