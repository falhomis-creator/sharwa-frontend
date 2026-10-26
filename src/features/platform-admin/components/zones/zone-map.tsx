import type { Zone } from "@/features/platform-admin/schemas";

/**
 * Schematic map of the Sharwa Ship zones (M20 US-20.6 a1): circles placed by
 * `center_latitude/longitude` inside a fixed Yemen bounding box, radius to scale. No
 * tiles and no network request (constitution: no external assets); muted for inactive.
 */
const BOX = { minLat: 12, maxLat: 19, minLng: 42, maxLng: 54 };
const W = 600;
const H = 350;
const KM_PER_DEG = 111;

export function ZoneMap({ zones, highlight }: { zones: Zone[]; highlight?: string | null }) {
  const x = (lng: number) => ((lng - BOX.minLng) / (BOX.maxLng - BOX.minLng)) * W;
  const y = (lat: number) => ((BOX.maxLat - lat) / (BOX.maxLat - BOX.minLat)) * H;
  const r = (km: number) => Math.max(4, (km / KM_PER_DEG / (BOX.maxLng - BOX.minLng)) * W);
  const active = zones.filter((z) => z.is_active).length;
  return (
    <figure className="flex flex-col gap-2" dir="ltr">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`خريطة تخطيطية لمناطق شروة شيب: ${active} نشطة من ${zones.length}`}
        className="h-auto w-full rounded-lg border border-border bg-muted/30"
        data-testid="zone-map"
      >
        {Array.from({ length: BOX.maxLng - BOX.minLng + 1 }, (_, i) => (
          <line key={`v${i}`} x1={x(BOX.minLng + i)} x2={x(BOX.minLng + i)} y1={0} y2={H} className="stroke-border" strokeWidth={0.5} />
        ))}
        {Array.from({ length: BOX.maxLat - BOX.minLat + 1 }, (_, i) => (
          <line key={`h${i}`} y1={y(BOX.minLat + i)} y2={y(BOX.minLat + i)} x1={0} x2={W} className="stroke-border" strokeWidth={0.5} />
        ))}
        {zones.map((z) => {
          // A zone without geo bounds (allowed by Django, INT-031) has nothing to draw.
          if (z.center_latitude === null || z.center_longitude === null || z.radius_km === null) return null;
          const cx = x(Number(z.center_longitude));
          const cy = y(Number(z.center_latitude));
          const on = z.is_active;
          const hi = highlight === z.code;
          return (
            <g key={z.id} data-testid="zone-circle" data-code={z.code} data-active={on}>
              <circle cx={cx} cy={cy} r={r(Number(z.radius_km))} className={on ? "fill-info/20 stroke-info" : "fill-muted-foreground/10 stroke-muted-foreground"} strokeWidth={hi ? 2.5 : 1} strokeDasharray={on ? undefined : "4 3"} />
              <circle cx={cx} cy={cy} r={2} className={on ? "fill-info" : "fill-muted-foreground"} />
              <text x={cx + 6} y={cy - 6} className={on ? "fill-foreground" : "fill-muted-foreground"} fontSize={11} fontFamily="var(--font-geist-mono), monospace">
                {z.code}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption dir="rtl" className="text-xs text-muted-foreground">تخطيط بلا خرائط خارجية — المركز ونصف القطر كما في الجدول؛ المتقطّع غير نشط.</figcaption>
    </figure>
  );
}
