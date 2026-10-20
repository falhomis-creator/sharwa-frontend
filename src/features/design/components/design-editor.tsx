"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import { Monitor, SlidersHorizontal, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureOffState, ForbiddenState } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useStore, useStoreOrigin } from "@/features/dashboard-shell/components/store-context";
import { useAdminSections, useAnnouncement, useDesignCategories, usePublish, useTheme } from "@/features/design/api";
import { AnnouncementPanel } from "@/features/design/components/announcement-panel";
import { useEditorParams } from "@/features/design/components/editor-links";
import { IdentityPanel } from "@/features/design/components/identity-panel";
import { PreviewFrame } from "@/features/design/components/preview-frame";
import { SectionEditor } from "@/features/design/components/section-editor";
import { SectionsPanel } from "@/features/design/components/sections-panel";
import { COLOR_TOKENS, HEX_RE, PANEL_TABS, PANEL_TAB_LABELS, isDeletedCategory, sectionErrors, type PanelTab } from "@/features/design/schemas";
import { draftStatus, useDesignStore } from "@/features/design/store";

/**
 * `/dashboard/design` (+ `/sections/[id]`) — the theme customizer shell (M08 T100): start
 * panel 320px (tabs «الهوية / الأقسام / شريط الإعلانات», or the section editor sliding over
 * it), the live preview in the centre, and a top bar with the device switch, the «غير منشور»
 * state and «تجاهل» / «نشر». Mounted by the `design/layout.tsx`, so moving between the list
 * and a section editor keeps the iframe and the draft.
 *
 * Owner only (no permission key among the 35 — M08 §2) and gated on `storefront_design`.
 * Phones: the preview fills the screen, the panel is a bottom drawer (60%), and the two
 * buttons stay fixed at the bottom.
 */
const MD = "(min-width: 768px)";
const subscribeMq = (cb: () => void) => {
  const mq = window.matchMedia(MD);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useIsWide = () => useSyncExternalStore(subscribeMq, () => window.matchMedia(MD).matches, () => true);

export function DesignEditor() {
  const { session, canFeature } = useAccess();
  if (session.kind !== "merchant") return <ForbiddenState description="تصميم المتجر مقصور على مالك المتجر." />;
  if (!canFeature("storefront_design")) return <FeatureOffState />;
  return <Editor />;
}

function sectionIdFrom(pathname: string): number | null {
  const m = /\/design\/sections\/(-?\d+)/.exec(pathname);
  return m ? Number(m[1]) : null;
}

function Editor() {
  const store = useStore();
  const origin = useStoreOrigin();
  const router = useRouter();
  const pathname = usePathname();
  const sectionId = sectionIdFrom(pathname);
  const [{ tab, device }, setParams] = useEditorParams();
  const wide = useIsWide();
  const [drawer, setDrawer] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const theme = useTheme();
  const sections = useAdminSections();
  const announcement = useAnnouncement();
  const categories = useDesignCategories();
  const hydrate = useDesignStore((s) => s.hydrate);
  const ready = useDesignStore((s) => s.store === store && s.base !== null);
  const status = useDesignStore(draftStatus);
  const discard = useDesignStore((s) => s.discard);
  const failed = useDesignStore((s) => s.failed);
  const conflictMessage = useDesignStore((s) => s.conflictMessage);
  const draftTheme = useDesignStore((s) => s.theme);
  const draftSections = useDesignStore((s) => s.sections);
  const draftAnnouncement = useDesignStore((s) => s.announcement);
  const { publish, refetchBase } = usePublish();

  useEffect(() => {
    if (theme.data && sections.data && announcement.data) {
      hydrate(store, { theme: theme.data, sections: sections.data, announcement: announcement.data });
    }
  }, [announcement.data, hydrate, sections.data, store, theme.data]);

  const categoryIds = useMemo(() => (categories.data ? new Set(categories.data.map((c) => c.id)) : null), [categories.data]);

  // Publish is blocked by local errors (FR-08.06) and a deleted category (M08 §8).
  const blocker = useMemo(() => {
    if (COLOR_TOKENS.some((k) => !HEX_RE.test(draftTheme[k]))) return "صحّح الألوان بصيغة #RRGGBB قبل النشر.";
    const a = draftAnnouncement;
    if (!HEX_RE.test(a.announcement_bg_color) || !HEX_RE.test(a.announcement_text_color)) return "صحّح ألوان شريط الإعلانات قبل النشر.";
    if (a.enable_announcement_bar && !a.announcement_text.trim()) return "اكتب نص شريط الإعلانات أو أوقفه.";
    if (draftSections.some((s) => isDeletedCategory(s, categoryIds))) return "قسم يشير إلى تصنيف محذوف — اختر تصنيفاً آخر.";
    const bad = draftSections.find((s) => Object.keys(sectionErrors(s, categoryIds)).length > 0);
    if (bad) return `أكمل حقول «${bad.label || "قسم"}» قبل النشر.`;
    return null;
  }, [categoryIds, draftAnnouncement, draftSections, draftTheme]);

  const dirty = status === "dirty";
  const canPublish = dirty && !blocker;

  const doPublish = async () => {
    if (!canPublish) return;
    const result = await publish({ simulateConflict: new URLSearchParams(window.location.search).get("simulateConflict") === "1" });
    if (result.ok) {
      setReloadKey((n) => n + 1);
      toast.success("نُشر الثيم", {
        description: "المتجر يعرض التصميم الجديد الآن.",
        action: { label: "عرض المتجر", onClick: () => window.open(origin, "_blank", "noopener") },
      });
    } else if (result.step !== "conflict" && result.message) {
      toast.error(result.message);
    }
  };

  const reloadAfterConflict = async () => {
    try {
      const fresh = await refetchBase();
      hydrate(store, fresh, true);
      setReloadKey((n) => n + 1);
    } catch {
      toast.error("تعذّر إعادة التحميل. أعد المحاولة.");
    }
  };

  // ⌘S publishes; Esc closes the section editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void doPublishRef();
      } else if (e.key === "Escape" && sectionId !== null && !document.querySelector("[role=dialog][data-open]")) {
        router.push(`/dashboard/design?tab=sections${device === "mobile" ? "&device=mobile" : ""}`);
      }
    };
    const doPublishRef = () => document.querySelector<HTMLButtonElement>("[data-testid=publish]:not(:disabled)")?.click();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [device, router, sectionId]);

  // Leaving with unpublished changes asks first (US-08.5.2).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "لديك تغييرات غير منشورة";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const loadError = theme.error ?? sections.error ?? announcement.error;
  const retryLoad = () => {
    void theme.refetch();
    void sections.refetch();
    void announcement.refetch();
  };

  const panel = loadError ? (
    <ErrorState error={loadError} onRetry={retryLoad} title="تعذّر تحميل التصميم" />
  ) : !ready ? (
    <PanelSkeleton />
  ) : sectionId !== null ? (
    <SectionEditor sectionId={sectionId} categories={categories.data ?? null} />
  ) : (
    <Tabs value={tab} onValueChange={(v) => void setParams({ tab: v as PanelTab })} className="gap-4">
      <TabsList className="w-full">
        {PANEL_TABS.map((t) => (
          <TabsTrigger key={t} value={t} data-testid={`tab-${t}`} className="h-11 md:h-auto">
            {PANEL_TAB_LABELS[t]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="identity">
        <IdentityPanel />
      </TabsContent>
      <TabsContent value="sections">
        <SectionsPanel categoryIds={categoryIds} compact={!wide} />
      </TabsContent>
      <TabsContent value="announcement">
        <AnnouncementPanel />
      </TabsContent>
    </Tabs>
  );

  const statusText =
    status === "publishing" ? "يُنشر…" : status === "conflict" ? "تعارض" : dirty ? "غير منشور" : "منشور";

  const actions = (
    <>
      <Button type="button" variant="outline" className="h-11 md:h-8" disabled={!dirty} onClick={discard} data-testid="discard">
        تجاهل
      </Button>
      <Button
        type="button"
        className="h-11 md:h-8"
        disabled={!canPublish}
        title={blocker ?? (dirty ? "⌘S" : "لا تغييرات للنشر")}
        onClick={() => void doPublish()}
        data-testid="publish"
      >
        {status === "publishing" ? "يُنشر…" : "نشر"}
      </Button>
    </>
  );

  return (
    <div
      className="-mx-4 -my-6 flex h-[calc(100dvh-3rem-4rem)] min-h-0 flex-col md:h-[calc(100dvh-3rem-4rem)] lg:-mx-6 lg:h-[calc(100dvh-3rem)]"
      data-testid="design-editor"
      data-status={status}
    >
      <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-1.5">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-base font-semibold">تصميم المتجر</h1>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="draft-status" aria-live="polite">
            <span aria-hidden className={cn("size-1.5 rounded-full", dirty ? "bg-warning" : status === "conflict" ? "bg-destructive" : "bg-success")} />
            {statusText}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {wide ? (
            <div role="radiogroup" aria-label="جهاز المعاينة" className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
              <DeviceButton active={device === "desktop"} onClick={() => void setParams({ device: "desktop" })} label="سطح المكتب" testId="device-desktop">
                <Monitor className="size-4" aria-hidden />
              </DeviceButton>
              <DeviceButton active={device === "mobile"} onClick={() => void setParams({ device: "mobile" })} label="جوال" testId="device-mobile">
                <Smartphone className="size-4" aria-hidden />
              </DeviceButton>
            </div>
          ) : null}
          {wide ? actions : null}
        </div>
      </div>
      {status === "conflict" ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 text-sm" data-testid="conflict">
          <span className="flex items-center gap-2">
            <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
            <span>
              <span className="font-medium">حُدِّث الثيم من جلسة أخرى.</span>{" "}
              <span className="text-muted-foreground">{conflictMessage && conflictMessage !== "حُدِّث الثيم من جلسة أخرى" ? conflictMessage : "أعد التحميل لترى آخر نسخة منشورة؛ تعديلاتك غير المنشورة ستُتجاهل."}</span>
            </span>
          </span>
          <Button type="button" variant="outline" className="h-11 md:h-8" onClick={() => void reloadAfterConflict()} data-testid="conflict-reload">
            إعادة التحميل
          </Button>
        </div>
      ) : failed ? (
        <div role="status" className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs text-warning" data-testid="publish-failed">
          لم يُنشر كل شيء ({failed.step === "reorder" ? "لم يُحفظ الترتيب" : failed.message}). ما لم يُنشر باقٍ في المسودة.
        </div>
      ) : blocker && dirty ? (
        <p className="border-b border-border px-4 py-1.5 text-xs text-destructive" data-testid="publish-blocker">
          {blocker}
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1">
        {wide ? (
          <aside className="relative flex w-80 shrink-0 flex-col overflow-y-auto border-e border-border p-4" aria-label="لوحة التصميم" data-testid="design-panel">
            {panel}
          </aside>
        ) : null}
        <PreviewFrame reloadKey={reloadKey} />
      </div>
      {wide ? null : (
        <>
          <div className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-4 py-2" data-testid="mobile-actions">
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setDrawer(true)} data-testid="open-panel">
              <SlidersHorizontal aria-hidden />
              تعديل
            </Button>
            {actions}
          </div>
          <Drawer
            open={drawer || sectionId !== null}
            onOpenChange={(open) => {
              setDrawer(open);
              if (!open && sectionId !== null) router.push("/dashboard/design?tab=sections");
            }}
          >
            <DrawerContent className="[--drawer-height:60dvh]" data-testid="panel-drawer">
              <DrawerTitle className="sr-only">لوحة التصميم</DrawerTitle>
              <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto p-4">{panel}</div>
            </DrawerContent>
          </Drawer>
        </>
      )}
    </div>
  );
}

function DeviceButton({ active, onClick, label, testId, children }: { active: boolean; onClick: () => void; label: string; testId: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      data-testid={testId}
      className={cn("flex size-8 items-center justify-center rounded-md transition-colors", active ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted")}
    >
      {children}
    </button>
  );
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden data-testid="panel-skeleton">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 7 }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}
