"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";
import { useSaveStoreFeatures, useStoreFeatures } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ConfirmDialog, ReadOnlyNote, StatusText, toastError } from "@/features/platform-admin/components/bits";
import { groupByModule } from "@/features/platform-admin/components/stores/store-bits";
import { DECIDED_BY_STEP, RESOLUTION_STEPS, type DecidedBy, type StoreFeature } from "@/features/platform-admin/schemas";
import { toast } from "sonner";

/**
 * «إدارة الميزات» for one store (M20 US-20.2 a4, FR-20.05): the 39 keys grouped by module,
 * each with the server's effective state and the FR-46.04 step that decided it. Three
 * states per key — inherited · override on · override off — edited locally, then saved
 * together through a confirmation that lists every change.
 */
type State = "inherit" | "on" | "off";
interface Draft {
  state: State;
  notes: string;
}

export const SOURCE_LABELS: Record<DecidedBy, string> = {
  override: "استثناء المتجر",
  global_kill: "إيقاف عالمي",
  no_plan_required: "لا تتطلب باقة",
  subscriptions_disabled: "الباقات غير مفعّلة",
  plan_feature: "خلية الباقة",
  plan_feature_missing: "غائبة عن الباقة",
};

const STATE_LABELS: Record<State, string> = { inherit: "موروثة", on: "تجاوز تفعيل", off: "تجاوز تعطيل" };

function serverDraft(f: StoreFeature): Draft {
  return { state: f.override ? (f.override.is_enabled ? "on" : "off") : "inherit", notes: f.override?.notes ?? "" };
}

export function FeaturesTab({ schema, storeName }: { schema: string; storeName: string }) {
  const q = useStoreFeatures(schema);
  const save = useSaveStoreFeatures(schema);
  const canWrite = useCanWrite("billing");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [confirming, setConfirming] = useState(false);

  const rows = q.data;
  const groups = useMemo(() => groupByModule(rows ?? []), [rows]);
  const changes = (rows ?? []).filter((f) => {
    const d = drafts[f.code];
    if (!d) return false;
    const s = serverDraft(f);
    return d.state !== s.state || (d.state !== "inherit" && d.notes !== s.notes);
  });

  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!rows) return <Skeleton className="h-96 w-full" />;

  const draftOf = (f: StoreFeature) => drafts[f.code] ?? serverDraft(f);
  const setDraft = (code: string, patch: Partial<Draft>, base: Draft) => setDrafts((all) => ({ ...all, [code]: { ...base, ...all[code], ...patch } }));

  async function submit() {
    try {
      await save.mutateAsync(changes.map((f) => ({ code: f.code, is_enabled: draftOf(f).state === "inherit" ? null : draftOf(f).state === "on", notes: draftOf(f).notes })));
      toast.success(`حُفظت ${changes.length} تغييرات على ميزات «${storeName}».`);
      setDrafts({});
      setConfirming(false);
    } catch (err) {
      toastError(err);
    }
  }

  const overridden = rows.filter((f) => f.override).length;

  return (
    <div className="flex flex-col gap-5" data-testid="features-tab">
      <div className="flex flex-col gap-1 text-sm">
        <p>
          <Mono>{rows.filter((f) => f.effective).length}</Mono> من <Mono>{rows.length}</Mono> متاحة · <Mono>{overridden}</Mono> باستثناء
        </p>
        <p className="text-xs text-muted-foreground">الحالة الفعلية كما يحسبها الخادم بترتيب الحسم؛ الاستثناء يفوز على الإيقاف العالمي والباقة.</p>
        {!canWrite ? <ReadOnlyNote /> : null}
      </div>

      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`fg-${g.key}`} className="flex flex-col gap-2">
          <h2 id={`fg-${g.key}`} className="text-xs text-muted-foreground">
            {g.label}
          </h2>
          <ul className="divide-y divide-border/60 surface-card overflow-hidden">
            {g.rows.map((f) => {
              const d = draftOf(f);
              const dirty = changes.includes(f);
              return (
                <li key={f.code} data-testid="feature-row" data-code={f.code} data-source={f.source} className={cn("flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-4", f.override && "bg-muted/40", dirty && "bg-warning/5")}>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{f.name}</span>
                      <Code className="text-muted-foreground">{f.code}</Code>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      <StatusText tone={f.effective ? "success" : "muted"} testId="feature-effective">
                        {f.effective ? "متاحة" : "غير متاحة"}
                      </StatusText>
                      <span className="text-muted-foreground" title={RESOLUTION_STEPS[DECIDED_BY_STEP[f.source] - 1]} data-testid="feature-source">
                        الخطوة <Mono>{DECIDED_BY_STEP[f.source]}</Mono>: {SOURCE_LABELS[f.source]}
                      </span>
                      {f.override?.notes ? <span className="text-muted-foreground">«{f.override.notes}»</span> : null}
                    </span>
                  </div>
                  <fieldset className="flex shrink-0 flex-col gap-2 md:items-end" disabled={!canWrite}>
                    <legend className="sr-only">حالة {f.name}</legend>
                    <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup">
                      {(["inherit", "on", "off"] as const).map((s) => (
                        <label
                          key={s}
                          className={cn(
                            "flex h-11 cursor-pointer items-center rounded-md px-2.5 text-xs transition-colors has-disabled:cursor-not-allowed lg:h-7",
                            d.state === s ? (s === "off" ? "bg-destructive/10 text-destructive" : "bg-accent font-medium text-accent-foreground") : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <input type="radio" className="sr-only" name={`ov-${f.code}`} value={s} checked={d.state === s} onChange={() => setDraft(f.code, { state: s }, serverDraft(f))} data-testid={`ov-${f.code}-${s}`} />
                          {STATE_LABELS[s]}
                        </label>
                      ))}
                    </div>
                    {d.state !== "inherit" ? (
                      <Input
                        value={d.notes}
                        onChange={(e) => setDraft(f.code, { notes: e.target.value }, serverDraft(f))}
                        maxLength={300}
                        placeholder="ملاحظة الاستثناء"
                        aria-label={`ملاحظة استثناء ${f.name}`}
                        className="h-11 w-full md:w-64 lg:h-8"
                        data-testid={`ov-${f.code}-notes`}
                      />
                    ) : null}
                  </fieldset>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {canWrite ? (
        <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 lg:-mx-6 lg:px-6">
          <span className="text-sm text-muted-foreground">{changes.length ? <><Mono className="text-foreground">{changes.length}</Mono> تغييرات غير محفوظة</> : "لا تغييرات"}</span>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 lg:h-8" disabled={!changes.length} onClick={() => setDrafts({})}>
              تراجع
            </Button>
            <Button className="h-11 lg:h-8" disabled={!changes.length} onClick={() => setConfirming(true)} data-testid="save-overrides">
              حفظ الاستثناءات
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`استثناءات ميزات «${storeName}»`}
        impact="تسري فوراً على لوحة التاجر وتفوز على الإيقاف العالمي والباقة."
        confirmLabel="احفظ"
        pending={save.isPending}
        onConfirm={() => void submit()}
      >
        <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-md border border-border text-sm" data-testid="override-changes">
          {changes.map((f) => (
            <li key={f.code} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate">{f.name}</span>
              <span className="shrink-0 text-xs">
                <span className="text-muted-foreground">{STATE_LABELS[serverDraft(f).state]}</span> ← {STATE_LABELS[draftOf(f).state]}
              </span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </div>
  );
}
