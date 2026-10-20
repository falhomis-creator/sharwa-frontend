"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FeatureOffState, ForbiddenState } from "@/components/shared/access-gate";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";

/**
 * The M27 settings area under the nav path `/dashboard/channels/social` (spec §6 lists
 * `/dashboard/channels/*`; the sidebar's path wins — see the Phase 7 notes). Owner only
 * (FR-27.01), hidden with the `social_channels` feature.
 */
export const CHANNEL_TABS = [
  { href: "/dashboard/channels/social", label: "القنوات" },
  { href: "/dashboard/channels/social/catalog", label: "مزامنة الكتالوج" },
  { href: "/dashboard/channels/social/tiktok-categories", label: "فئات تيك توك" },
  { href: "/dashboard/channels/social/keywords", label: "المحفّزات" },
  { href: "/dashboard/channels/social/templates", label: "قوالب الردود" },
  { href: "/dashboard/channels/social/staff-access", label: "وصول الموظفين" },
] as const;

export function ChannelsShell({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  const { canFeature, canOwnerOnly } = useAccess();
  const pathname = usePathname();
  if (!canFeature("social_channels")) return <FeatureOffState />;
  if (!canOwnerOnly(true)) return <ForbiddenState description="إعدادات قنوات التواصل لمالك المتجر فقط." />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} actions={actions} />
      <nav aria-label="أقسام قنوات التواصل" className="-mt-2 flex gap-1 overflow-x-auto border-b border-border" data-testid="channels-tabs">
        {CHANNEL_TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn("-mb-px inline-flex h-11 shrink-0 items-center border-b-2 px-3 text-sm lg:h-9", active ? "border-cta font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
