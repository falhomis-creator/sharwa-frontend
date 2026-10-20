"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * The first-release map (FR-15.08): an ABSTRACT schematic — no basemap, no tiles, no API
 * key, no network. A grey rectangle in an equirectangular projection fitted to what is
 * drawn: Sharwa Ship zones as 1px circles (centre + `radius_km`), restricted polygons as
 * dashed 1px outlines, review orders as small dots. Nothing animates, so
 * `prefers-reduced-motion` has nothing to turn off beyond the hover fade. East is always
 * to the right (`dir="ltr"`), whatever the page direction.
 */
export interface MapCircle {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radiusKm: number;
  muted?: boolean;
}
export interface MapPolygon {
  id: string;
  label: string;
  points: Array<[number, number]>;
  muted?: boolean;
}
export interface MapPoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

const W = 1000;
const KM_PER_DEG = 111.32;

export function SchematicMap({ circles = [], polygons = [], points = [], highlight, label, className }: { circles?: MapCircle[]; polygons?: MapPolygon[]; points?: MapPoint[]; highlight?: string | null; label: string; className?: string }) {
  const geo = useMemo(() => {
    const lats: number[] = [];
    const lngs: number[] = [];
    circles.forEach((c) => {
      const dLat = c.radiusKm / KM_PER_DEG;
      const dLng = c.radiusKm / (KM_PER_DEG * Math.cos((c.lat * Math.PI) / 180));
      lats.push(c.lat - dLat, c.lat + dLat);
      lngs.push(c.lng - dLng, c.lng + dLng);
    });
    polygons.forEach((p) => p.points.forEach(([la, ln]) => (lats.push(la), lngs.push(ln))));
    points.forEach((p) => (lats.push(p.lat), lngs.push(p.lng)));
    if (lats.length === 0) return null;
    let [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    const padLat = Math.max(0.05, (maxLat - minLat) * 0.08);
    const padLng = Math.max(0.05, (maxLng - minLng) * 0.08);
    minLat -= padLat;
    maxLat += padLat;
    minLng -= padLng;
    maxLng += padLng;
    const cos = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
    const spanX = (maxLng - minLng) * cos;
    const spanY = maxLat - minLat;
    const k = W / spanX;
    const H = Math.max(240, Math.min(1400, spanY * k));
    // Keep the aspect: when clamped, re-centre vertically.
    const kY = H / spanY;
    const s = Math.min(k, kY);
    const offX = (W - spanX * s) / 2;
    const offY = (H - spanY * s) / 2;
    const x = (lng: number) => offX + (lng - minLng) * cos * s;
    const y = (lat: number) => offY + (maxLat - lat) * s;
    const r = (km: number) => (km / KM_PER_DEG) * s;
    return { H, x, y, r };
  }, [circles, polygons, points]);

  if (!geo) {
    return <div className={cn("flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground", className)}>لا شيء لرسمه على الخريطة.</div>;
  }
  const { H, x, y, r } = geo;

  return (
    <figure className={cn("flex min-w-0 flex-col gap-2", className)} data-testid="schematic-map">
      <div dir="ltr" className="h-[50vh] min-h-56 w-full overflow-hidden rounded-lg border border-border bg-muted md:h-80">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="size-full" role="img" aria-label={label}>
          <rect x={0} y={0} width={W} height={H} className="fill-muted" />
          {circles.map((c) => {
            const on = highlight === c.id;
            return (
              <g key={c.id} className="motion-safe:transition-opacity" opacity={highlight && !on ? 0.45 : 1} data-testid="map-circle">
                <circle cx={x(c.lng)} cy={y(c.lat)} r={Math.max(2, r(c.radiusKm))} className={cn("fill-none", c.muted ? "stroke-muted-foreground" : "stroke-foreground")} strokeWidth={on ? 2 : 1} strokeDasharray={c.muted ? "4 4" : undefined} vectorEffect="non-scaling-stroke" />
                <circle cx={x(c.lng)} cy={y(c.lat)} r={2} className="fill-foreground" />
                <text x={x(c.lng) + 6} y={y(c.lat) - 6} className="fill-muted-foreground font-mono" fontSize={H / 32}>
                  {c.label}
                </text>
              </g>
            );
          })}
          {polygons.map((p) => (
            <g key={p.id} data-testid="map-polygon" opacity={highlight && highlight !== p.id ? 0.45 : 1}>
              <polygon points={p.points.map(([la, ln]) => `${x(ln)},${y(la)}`).join(" ")} className={cn("fill-destructive/10", p.muted ? "stroke-muted-foreground" : "stroke-destructive")} strokeWidth={highlight === p.id ? 2 : 1} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          {points.map((p) => (
            <g key={p.id} data-testid="map-point">
              <circle cx={x(p.lng)} cy={y(p.lat)} r={highlight === p.id ? 7 : 4.5} className="fill-warning stroke-background" strokeWidth={1} vectorEffect="non-scaling-stroke">
                <title>{p.label}</title>
              </circle>
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {circles.length ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full border border-primary" /> منطقة شروة شيب (نصف القطر)
          </span>
        ) : null}
        {polygons.length ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 border border-dashed border-destructive" /> نطاق محظور
          </span>
        ) : null}
        {points.length ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-warning" /> طلب بانتظار المراجعة
          </span>
        ) : null}
        <span>مخطط تقريبي بلا خريطة أساس — للمقارنة لا للملاحة.</span>
      </figcaption>
    </figure>
  );
}
