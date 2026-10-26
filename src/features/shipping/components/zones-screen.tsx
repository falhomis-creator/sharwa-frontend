"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AccessGate } from "@/components/shared/access-gate";
import { DataTable, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { useZones } from "@/features/shipping/api";
import type { Zone } from "@/features/shipping/schemas";
import { ActiveDot, OwnerGate, ShippingSubnav } from "@/features/shipping/components/bits";
import { SchematicMap } from "@/features/shipping/components/schematic-map";

/**
 * `/dashboard/shipping/zones` (US-15.5.1, FR-15.04): the platform's Sharwa Ship zones,
 * READ-ONLY — code, name, the merchant's cost per waybill in the zone's own currency,
 * volumetric divisor, radius, active — plus the abstract schematic map (FR-15.08).
 */
export function ZonesScreen() {
  return (
    <AccessGate feature="sharwa_ship">
      <OwnerGate>
        <ZonesBody />
      </OwnerGate>
    </AccessGate>
  );
}

export function zoneCircles(zones: Zone[]) {
  // A zone without a centre/radius (Django keeps them nullable → "") has no circle to draw.
  return zones
    .filter((z) => z.center_latitude !== "" && z.center_longitude !== "" && z.radius_km !== "")
    .map((z) => ({ id: z.code, label: z.code, lat: Number(z.center_latitude), lng: Number(z.center_longitude), radiusKm: Number(z.radius_km), muted: !z.is_active }));
}

function ZonesBody() {
  const table = useTableUrlState();
  const query = useZones({ page: table.page, page_size: table.pageSize });
  const [highlighted, setHover] = useState<string | null>(null);
  const rows = query.data?.results;

  const columns = useMemo<ColumnDef<Zone, unknown>[]>(
    () => [
      { id: "code", header: headerLabel("الكود"), meta: { className: "whitespace-nowrap" }, cell: ({ row }) => <Mono>{row.original.code}</Mono> },
      { id: "name", header: headerLabel("المنطقة"), cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      {
        id: "price",
        meta: { numeric: true },
        header: headerLabel("تكلفتك لكل بوليصة"),
        cell: ({ row }) => (
          <span className="inline-flex items-baseline gap-1.5">
            <Money value={row.original.display_price} />
            <Mono className="text-[11px] text-muted-foreground">{row.original.currency}</Mono>
          </span>
        ),
      },
      { id: "divisor", meta: { numeric: true }, header: headerLabel("المقسوم الحجمي"), cell: ({ row }) => <Mono>{row.original.volumetric_divisor}</Mono> },
      { id: "radius", meta: { numeric: true }, header: headerLabel("نصف القطر (كم)"), cell: ({ row }) => <Mono>{row.original.radius_km}</Mono> },
      { id: "center", meta: { numeric: true, className: "whitespace-nowrap" }, header: headerLabel("المركز"), cell: ({ row }) => <Mono className="text-xs text-muted-foreground">{`${row.original.center_latitude}, ${row.original.center_longitude}`}</Mono> },
      {
        id: "active",
        header: headerLabel("الحالة"),
        cell: ({ row }) => <ActiveDot active={row.original.is_active} />,
      },
    ],
    [],
  );

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="zones-screen">
      <PageHeader title="مناطق شروة شيب" description="المناطق التي يغطيها توصيل شروة شيب وتكلفة كل بوليصة فيها، للقراءة فقط." />
      <ShippingSubnav />
      <p className="text-sm text-muted-foreground">
        <a href="#zones-managed" className="inline-flex min-h-11 items-center text-foreground underline underline-offset-4 lg:min-h-0" data-testid="managed-by-platform">
          تُدار من المنصة
        </a>{" "}
        — لا يمكن تعديلها من متجرك.
      </p>
      {rows && rows.length > 0 ? <SchematicMap circles={zoneCircles(rows)} highlight={highlighted} label="مخطط مناطق شروة شيب: دوائر بنصف قطر كل منطقة" /> : null}
      <DataTable<Zone>
        testId="zones-table"
        caption="مناطق شروة شيب"
        columns={columns}
        data={rows}
        getRowId={(r) => r.code}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        onRowOpen={(z) => setHover((h) => (h === z.code ? null : z.code))}
        emptyState={<EmptyState title="لا مناطق شروة شيب مفعّلة لمتجرك بعد" description="تُضاف المناطق من المنصة؛ عند تفعيل منطقة تظهر هنا بسعرها ونطاقها." />}
        renderMobileCard={(z) => (
          <div className="flex flex-col gap-1 p-3">
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium">{z.name}</span>
              <Mono className="text-xs text-muted-foreground">{z.code}</Mono>
            </span>
            <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-baseline gap-1">
                <Money value={z.display_price} className="text-foreground" /> <Mono>{z.currency}</Mono>
              </span>
              <span>
                <Mono>{z.radius_km}</Mono> كم · <ActiveDot active={z.is_active} />
              </span>
            </span>
          </div>
        )}
      />
      <p id="zones-managed" className="max-w-prose text-xs text-muted-foreground">
        تضيف منصة شروة المناطق وتحدد أسعارها ونطاقاتها؛ لطلب تغطية منطقة جديدة تواصل مع دعم شروة. الطلبات التي تقع خارج كل المناطق تظهر في «مراجعة المناطق».
      </p>
    </div>
  );
}
