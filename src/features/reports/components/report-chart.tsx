"use client";

import { useSyncExternalStore } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";
import { isIsoDay, shortDay } from "@/features/reports/range";
import type { Series } from "@/features/reports/schemas";

/**
 * The ONE chart of a report (M25 US-25.2 / FR-25.05, constitution I): a line for daily
 * series, bars for rankings. The current series is `currentColor` (= `foreground` in both
 * themes), the compare series `zinc-400` (dashed for lines); horizontal grid only, no fill,
 * no gradient. The X axis is `reversed` so time runs right → left in RTL (§11 II). No draw
 * animation under `prefers-reduced-motion` (US-25.2 #4). Tooltip values are the server's
 * `display_y` strings; the Y ticks are bare compact numbers (no currency).
 */
/** The compare series sits in a `text-zinc-400` layer and strokes/fills with `currentColor`. */
const COMPARE_CLASS = "text-zinc-400";

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

const compact = (n: number) => (Math.abs(n) >= 1000 ? `${formatNumber(n / 1000, 1)}K` : formatNumber(n, 1));

interface Point {
  x: string;
  label: string;
  y: number;
  display_y: string;
  cx?: string;
  cy?: number;
  c_display?: string;
}

export function ReportChart({ kind, series, title }: { kind: "line" | "bar"; series: Series[]; title: string }) {
  const reduced = useReducedMotion();
  const [current, compare] = series;
  if (!current || current.points.length === 0) return null;
  const data: Point[] = current.points.map((p, i) => {
    const c = compare?.points[i];
    return {
      x: p.x,
      label: isIsoDay(p.x) ? shortDay(p.x) : p.x,
      y: p.y,
      display_y: p.display_y,
      ...(c ? { cx: c.x, cy: c.y, c_display: c.display_y } : {}),
    };
  });
  const animate = !reduced;

  return (
    <figure className="flex flex-col gap-2" data-testid="report-chart" data-kind={kind} data-series={series.length}>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 bg-foreground" />
          {current.label}
        </span>
        {compare ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-0 w-4 border-t-2 border-dashed border-zinc-400" />
            {compare.label}
          </span>
        ) : null}
      </figcaption>
      <div className="h-[200px] w-full text-foreground md:h-[280px]" role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {kind === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
              <XAxis dataKey="label" reversed tickLine={false} axisLine={false} tick={{ fill: "currentColor", fillOpacity: 0.6, fontSize: 11 }} minTickGap={24} />
              <YAxis orientation="right" tickLine={false} axisLine={false} width={44} tick={{ fill: "currentColor", fillOpacity: 0.6, fontSize: 11 }} tickFormatter={compact} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }} isAnimationActive={false} />
              {compare ? <Line type="monotone" dataKey="cy" className={COMPARE_CLASS} stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={animate} /> : null}
              <Line type="monotone" dataKey="y" stroke="currentColor" strokeWidth={2} dot={false} isAnimationActive={animate} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barGap={2}>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
              <XAxis dataKey="label" reversed tickLine={false} axisLine={false} interval={0} tick={{ fill: "currentColor", fillOpacity: 0.6, fontSize: 11 }} tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 9)}…` : v)} />
              <YAxis orientation="right" tickLine={false} axisLine={false} width={44} tick={{ fill: "currentColor", fillOpacity: 0.6, fontSize: 11 }} tickFormatter={compact} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", fillOpacity: 0.05 }} isAnimationActive={false} />
              <Bar dataKey="y" fill="currentColor" radius={[2, 2, 0, 0]} maxBarSize={28} isAnimationActive={animate} />
              {compare ? <Bar dataKey="cy" className={COMPARE_CLASS} fill="currentColor" radius={[2, 2, 0, 0]} maxBarSize={28} isAnimationActive={animate} /> : null}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Point }> }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2 text-xs shadow-sm">
      <span className="text-muted-foreground">{isIsoDay(p.x) ? shortDay(p.x) : p.x}</span>
      <span data-mono dir="ltr" className="self-end font-mono text-sm tabular-nums">
        {p.display_y}
      </span>
      {p.c_display !== undefined ? (
        <span className="flex items-center justify-between gap-3 text-muted-foreground">
          <span>{p.cx && isIsoDay(p.cx) ? shortDay(p.cx) : "السابقة"}</span>
          <span data-mono dir="ltr" className="font-mono tabular-nums">
            {p.c_display}
          </span>
        </span>
      ) : null}
    </div>
  );
}
