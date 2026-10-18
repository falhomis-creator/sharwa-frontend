"use client";

import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessGate, ForbiddenState } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useLocation } from "@/features/locations/api";
import { LocationEditor } from "@/features/locations/components/location-editor";
import { LocationInventoryTab } from "@/features/locations/components/location-inventory-tab";
import { LocationStaffTab } from "@/features/locations/components/location-staff-tab";
import { ActiveDot } from "@/features/locations/components/locations-screen";
import { OWNERSHIP_LABELS } from "@/features/locations/schemas";

export const LOCATION_TABS = ["details", "inventory", "staff"] as const;
type LocationTab = (typeof LOCATION_TABS)[number];
const TAB_LABELS: Record<LocationTab, string> = { details: "البيانات", inventory: "المخزون", staff: "الموظفون" };

/** `/dashboard/locations/new` — the editor with nothing in it. */
export function NewLocationScreen() {
  return (
    <AccessGate feature="multi_location">
      <OwnerOnly>
        <div className="flex flex-col gap-6">
          <Back />
          <PageHeader title="موقع جديد" description="اسم وكود، ثم ما يستطيع الموقع فعله — يحسب الخادم نوع العرض من القدرات." />
          <LocationEditor initial={null} />
        </div>
      </OwnerOnly>
    </AccessGate>
  );
}

/** `/dashboard/locations/[id]` — header + three tabs in the URL (`?tab=`): البيانات · المخزون · الموظفون. */
export function LocationScreen({ id }: { id: number }) {
  return (
    <AccessGate feature="multi_location">
      <LocationBody id={id} />
    </AccessGate>
  );
}

function LocationBody({ id }: { id: number }) {
  const { canPermission } = useAccess();
  const query = useLocation(id);
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(LOCATION_TABS).withDefault("details").withOptions({ history: "replace" }));
  const d = query.data;

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Back />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!d) {
    return (
      <div className="flex flex-col gap-6">
        <Back />
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  const tabs = LOCATION_TABS.filter((t) => (t === "inventory" ? d.flags.stores_inventory && canPermission("inventory.view") : true));

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="location-page">
      <Back />
      <PageHeader
        eyebrow={d.code}
        title={d.name}
        description={`${d.display_type} · ${OWNERSHIP_LABELS[d.ownership]}${d.city ? ` · ${d.city}` : ""}`}
        actions={<ActiveDot active={d.is_active} />}
      />
      <Tabs value={tab} onValueChange={(v) => void setTab(v as LocationTab)} className="min-w-0">
        <TabsList variant="line" className="h-11 border-b border-border lg:h-9" aria-label="أقسام الموقع">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t} className="min-h-11 px-3 lg:min-h-8" data-testid={`location-tab-${t}`}>
              {TAB_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="details" className="pt-4">
          <LocationEditor key={d.updated_at} initial={d} />
        </TabsContent>
        {tabs.includes("inventory") ? (
          <TabsContent value="inventory" className="min-w-0 pt-4">
            <LocationInventoryTab locationId={d.id} active={tab === "inventory"} />
          </TabsContent>
        ) : null}
        <TabsContent value="staff" className="pt-4">
          <LocationStaffTab locationId={d.id} active={tab === "staff"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** M22 §2: defining locations is the owner's — no `locations.*` permission key exists among the 35. */
function OwnerOnly({ children }: { children: React.ReactNode }) {
  const { session } = useAccess();
  if (session.kind !== "merchant") return <ForbiddenState description="إدارة المواقع مقصورة على مالك المتجر." />;
  return <>{children}</>;
}

function Back() {
  return (
    <Link href="/dashboard/locations" className="inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:min-h-8">
      <ArrowRight className="size-4" aria-hidden /> كل المواقع
    </Link>
  );
}
