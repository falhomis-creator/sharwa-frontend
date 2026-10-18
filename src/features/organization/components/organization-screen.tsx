"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { useCatalogAccess } from "@/features/products/hooks/use-catalog-access";
import { BadgesTab } from "@/features/organization/components/badges-tab";
import { BrandsTab } from "@/features/organization/components/brands-tab";
import { CategoryTree } from "@/features/organization/components/category-tree";
import { CollectionsTab } from "@/features/organization/components/collections-tab";
import { TagsTab } from "@/features/organization/components/tags-tab";

export const ORG_TABS = ["categories", "brands", "tags", "collections", "badges"] as const;
export type OrgTab = (typeof ORG_TABS)[number];

const LABELS: Record<OrgTab, string> = {
  categories: "التصنيفات",
  brands: "الماركات",
  tags: "الوسوم",
  collections: "المجموعات",
  badges: "الشارات",
};

/**
 * «التنظيم والاكتشاف» (M05, FR-05.11): one page, tab in the URL (`?tab=`). The three routes
 * `/products/organization`, `/products/categories` and `/products/brands` render this screen
 * with a different default tab. Users without catalog rights see everything read-only
 * (dragging disabled, actions hidden — M05 §6).
 */
export function OrganizationScreen({ defaultTab }: { defaultTab: OrgTab }) {
  const { canManage } = useCatalogAccess();
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(ORG_TABS).withDefault(defaultTab).withOptions({ history: "replace" }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="التنظيم والاكتشاف"
        description="التصنيفات والماركات والوسوم والمجموعات والشارات التي يتصفّح بها عملاؤك متجرك."
      />
      {!canManage ? <p className="text-sm text-muted-foreground">عرض فقط — التعديل لمالك المتجر ومديريه.</p> : null}
      <Tabs value={tab} onValueChange={(v) => void setTab(v as OrgTab)}>
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <TabsList variant="line" className="h-11 border-b border-border lg:h-9" aria-label="أقسام التنظيم">
            {ORG_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="min-h-11 px-3 lg:min-h-8" data-testid={`org-tab-${t}`}>
                {LABELS[t]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="categories" className="pt-4">
          <CategoryTree canManage={canManage} />
        </TabsContent>
        <TabsContent value="brands" className="pt-4">
          <BrandsTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="tags" className="pt-4">
          <TagsTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="collections" className="pt-4">
          <CollectionsTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="badges" className="pt-4">
          <BadgesTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
