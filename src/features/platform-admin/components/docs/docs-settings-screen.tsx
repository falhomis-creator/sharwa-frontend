"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDocsSettings, usePatchDocsSettings } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ConfirmDialog, ReadOnlyNote, StatusText, toastError, toastResult } from "@/features/platform-admin/components/bits";
import { DOCS_FLAG_ROWS, type DocsFlag, type DocsSettings } from "@/features/platform-admin/schemas";

/**
 * `/docs-settings` — the five documentation portal switches (`core.PlatformDocsSettings`).
 * A switch saves on toggle (PATCH, optimistic, rolled back on error). Turning the whole portal
 * off hides every section at once, so that one change asks for confirmation first.
 * The portal caches these switches for about a minute, which the toast says.
 */
const PROPAGATION = "يظهر الأثر في بوابة التوثيق خلال دقيقة تقريباً.";

type Row = (typeof DOCS_FLAG_ROWS)[number];

export function DocsSettingsScreen() {
  const settings = useDocsSettings();
  const patch = usePatchDocsSettings();
  const canWrite = useCanWrite("docs");
  const [confirmOff, setConfirmOff] = useState(false);
  const s = settings.data;

  const [portalRow, ...sectionRows] = DOCS_FLAG_ROWS;

  async function save(key: DocsFlag, value: boolean) {
    const row = DOCS_FLAG_ROWS.find((r) => r.key === key)!;
    try {
      await patch.mutateAsync({ [key]: value });
      toastResult({ detail: `${row.title}: ${value ? "ظاهر" : "مخفي"}. ${PROPAGATION}` });
    } catch (err) {
      toastError(err);
    }
  }

  function toggle(key: DocsFlag, value: boolean) {
    if (key === "enable_docs_portal" && !value) {
      setConfirmOff(true);
      return;
    }
    void save(key, value);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="إظهار بوابة التوثيق"
        description={`ما يراه الزوار في /docs على أصل المنصة — كل المفاتيح مفعّلة افتراضياً.${s ? ` آخر تغيير: ${formatDateTime(s.updated_at)}.` : ""}`}
      />
      {!canWrite ? <ReadOnlyNote /> : null}
      {settings.error ? <ErrorState error={settings.error} onRetry={() => void settings.refetch()} /> : null}

      <section aria-label="البوابة" className="surface-card overflow-hidden" data-testid="docs-portal-switch">
        {settings.isLoading ? <Skeleton className="m-4 h-16" /> : null}
        {s && portalRow ? <FlagRow row={portalRow} settings={s} disabled={!canWrite || patch.isPending} onToggle={toggle} /> : null}
      </section>

      <section aria-labelledby="docs-sections-h" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="docs-sections-h" className="text-sm font-medium">
            الأقسام
          </h2>
          <p className="text-xs text-muted-foreground">
            كل مفتاح يُخفي بطاقة القسم في صفحة /docs ورابطه في شريط البوابة، ويحوّل من يفتح صفحاته إلى /docs.
          </p>
        </div>
        <div className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden" data-testid="docs-section-switches">
          {settings.isLoading ? <Skeleton className="m-4 h-40" /> : null}
          {s
            ? sectionRows.map((row) => (
                <FlagRow key={row.key} row={row} settings={s} disabled={!canWrite || patch.isPending} onToggle={toggle} />
              ))
            : null}
        </div>
      </section>

      <ConfirmDialog
        open={confirmOff}
        onOpenChange={(o) => !o && setConfirmOff(false)}
        title="إيقاف بوابة التوثيق"
        destructive
        impact={
          <span className="flex flex-col gap-1">
            <span>سيُحوَّل كل من يفتح /docs أو أي صفحة تحتها إلى الصفحة الرئيسية.</span>
            <span>تختفي الأقسام الأربعة مهما كانت مفاتيحها، وتعود كما هي عند إعادة التفعيل.</span>
            <span>{PROPAGATION}</span>
          </span>
        }
        confirmLabel="إيقاف"
        pending={patch.isPending}
        onConfirm={() => {
          void save("enable_docs_portal", false).then(() => setConfirmOff(false));
        }}
        testId="docs-portal-off-dialog"
      />
    </div>
  );
}

function FlagRow({
  row,
  settings,
  disabled,
  onToggle,
}: {
  row: Row;
  settings: DocsSettings;
  disabled: boolean;
  onToggle: (key: DocsFlag, value: boolean) => void;
}) {
  const on = settings[row.key];
  const isPortal = row.key === "enable_docs_portal";
  // A section is visible only when the portal itself is on (same rule as the portal's isSectionEnabled).
  const hiddenByPortal = !isPortal && on && !settings.enable_docs_portal;
  const id = `docs-flag-${row.key}`;

  return (
    <div className={cn("flex min-h-16 items-center justify-between gap-4 px-4 py-3", hiddenByPortal && "opacity-70")} data-testid={`row-${row.key}`}>
      <label htmlFor={id} className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{row.title}</span>
        <span className="text-xs text-muted-foreground">{row.description}</span>
        <span className="flex flex-wrap items-center gap-2">
          <Code className="text-muted-foreground">{row.key}</Code>
          <Code className="text-muted-foreground">{row.path}</Code>
        </span>
      </label>
      <span className="flex items-center gap-3">
        {hiddenByPortal ? (
          <StatusText tone="muted">مخفي لأن البوابة متوقفة</StatusText>
        ) : on ? (
          <StatusText tone="success">ظاهر</StatusText>
        ) : (
          <StatusText tone="muted">مخفي</StatusText>
        )}
        <Switch
          id={id}
          checked={on}
          disabled={disabled}
          onCheckedChange={(v) => onToggle(row.key, v)}
          data-testid={`switch-${row.key}`}
          aria-label={row.title}
        />
      </span>
    </div>
  );
}
