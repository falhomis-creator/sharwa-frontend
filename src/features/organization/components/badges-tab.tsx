"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { BADGE_DEFAULT_COLOR, BADGE_NAME_MAX, DYNAMIC_BADGES, HEX_RE, contrastWithWhite, type Badge } from "@/features/organization/schemas";
import { orgApi, orgKeys, useBadges, useInvalidateOrganization } from "@/features/organization/api";
import { ConfirmDelete } from "@/features/organization/components/brands-tab";
import { deleteWithUndo } from "@/features/organization/components/undo-delete";

/** WCAG AA for normal text. Below it the badge still saves, with a textual warning (US-05.6.3). */
const MIN_CONTRAST = 4.5;

/** The badge's colour is merchant DATA, applied inline — never a design token. */
function BadgeChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium text-white" style={{ backgroundColor: color }}>
      {name}
    </span>
  );
}

function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="size-4 shrink-0 rounded-sm border border-border" style={{ backgroundColor: color }} />;
}

/** A miniature storefront product card carrying the badge (FR-05.08 preview). */
function CardPreview({ name, color, compact = false }: { name: string; color: string; compact?: boolean }) {
  return (
    <div className={compact ? "relative w-20 shrink-0 rounded-md border border-border p-1" : "relative w-28 shrink-0 rounded-md border border-border p-1.5"} aria-label={`معاينة الشارة «${name}» على بطاقة منتج`}>
      <div className="aspect-square rounded bg-muted" />
      <span className="absolute start-2.5 top-2.5">
        <BadgeChip name={name || "شارة"} color={color} />
      </span>
      <div className="mt-1.5 h-2 w-3/4 rounded bg-muted" />
      <div className="mt-1 h-2 w-1/3 rounded bg-muted" />
    </div>
  );
}

function BadgeDialog({ badge, onClose }: { badge: Badge | null; onClose: () => void }) {
  const invalidate = useInvalidateOrganization();
  const [name, setName] = useState(badge?.name ?? "");
  const [color, setColor] = useState(badge?.color ?? BADGE_DEFAULT_COLOR);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const valid = HEX_RE.test(color);
  const lowContrast = valid && contrastWithWhite(color) < MIN_CONTRAST;

  async function save() {
    setBusy(true);
    try {
      await orgApi.saveBadge(badge?.id ?? null, { name: name.trim(), color });
      toast.success(badge ? "حُفظت الشارة" : "أُضيفت الشارة");
      await invalidate();
      onClose();
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
      else toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="badge-dialog">
        <DialogTitle>{badge ? `تحرير «${badge.name}»` : "شارة جديدة"}</DialogTitle>
        <DialogDescription>تظهر على بطاقات المنتجات التي تختارها في المتجر.</DialogDescription>
        <form
          id="badge-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Field label="الاسم" htmlFor="badge-name" required counter={{ value: name.length, max: BADGE_NAME_MAX }} error={errors.name}>
            <input id="badge-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} aria-invalid={Boolean(errors.name)} />
          </Field>
          <Field
            label="اللون"
            htmlFor="badge-color"
            error={errors.color ?? (valid ? undefined : "لون hex بصيغة #RRGGBB")}
            hint={lowContrast ? undefined : "يُعرض النص أبيض فوقه."}
          >
            <div className="flex items-center gap-2">
              <input type="color" value={valid ? color : BADGE_DEFAULT_COLOR} onChange={(e) => setColor(e.target.value)} aria-label="منتقي اللون" className="h-11 w-14 shrink-0 cursor-pointer rounded-md border border-input bg-card p-1 md:h-8" />
              <input id="badge-color" value={color} dir="ltr" onChange={(e) => setColor(e.target.value.trim())} className={`${inputClass} font-mono`} aria-invalid={!valid} />
            </div>
          </Field>
          {lowContrast ? (
            <p role="status" className="-mt-2 text-xs text-warning" data-testid="contrast-warning">
              تباين ضعيف — قد يصعب قراءة النص الأبيض على هذا اللون (<Mono dir="ltr">{contrastWithWhite(color).toFixed(1)}:1</Mono>).
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <CardPreview name={name} color={valid ? color : BADGE_DEFAULT_COLOR} />
            <p className="text-xs text-muted-foreground">معاينة على بطاقة منتج كما تظهر في المتجر.</p>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" form="badge-form" size="lg" className="h-11 lg:h-9" disabled={busy || !valid || !name.trim()}>
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Badges (US-05.6, FR-05.08): merchant badges + the three computed ones, read-only. */
export function BadgesTab({ canManage }: { canManage: boolean }) {
  const store = useStore();
  const qc = useQueryClient();
  const query = useBadges();
  const invalidate = useInvalidateOrganization();
  const [editing, setEditing] = useState<Badge | "new" | null>(null);
  const [deleting, setDeleting] = useState<Badge | null>(null);

  function remove(b: Badge) {
    if (b.products_count === 0) {
      deleteWithUndo({ qc, queryKey: orgKeys(store).badges, item: b, label: b.name, request: () => orgApi.deleteBadge(b.id), onSettled: () => void invalidate() });
    } else setDeleting(b);
  }

  if (query.isLoading) return <div className="flex flex-col gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const badges = query.data ?? [];

  return (
    <div className="flex flex-col gap-6" data-testid="badges-tab">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">شارات المتجر</h2>
          {canManage ? (
            <Button size="lg" className="h-11 gap-1.5 lg:h-9" onClick={() => setEditing("new")} data-testid="new-badge">
              <Plus className="size-4" aria-hidden /> شارة جديدة
            </Button>
          ) : null}
        </div>
        {badges.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">لا شارات بعد — أنشئ «حصري» أو «الأكثر طلباً» لتمييز منتجات بعينها.</p>
        ) : (
          <ul className="surface-card">
            {badges.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 border-b border-border p-3 last:border-0" data-testid="badge-row">
                <CardPreview name={b.name} color={b.color} compact />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium">{b.name}</span>
                  <span className="flex items-center gap-1.5">
                    <Swatch color={b.color} />
                    <Mono className="text-xs text-muted-foreground">{b.color}</Mono>
                    {contrastWithWhite(b.color) < MIN_CONTRAST ? <span className="text-xs text-warning">تباين ضعيف</span> : null}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  <Mono className="text-foreground">{b.products_count}</Mono> منتجات
                </span>
                {canManage ? (
                  <span className="flex">
                    <button type="button" onClick={() => setEditing(b)} aria-label={`تحرير «${b.name}»`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8">
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => remove(b)} aria-label={`حذف «${b.name}»`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive lg:size-8">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="dynamic-badges">
        <h2 id="dynamic-badges" className="text-sm font-medium">
          شارات تلقائية <span className="font-normal text-muted-foreground">· للقراءة فقط</span>
        </h2>
        <ul className="surface-card">
          {DYNAMIC_BADGES.map((b) => (
            <li key={b.key} className="flex items-center gap-3 border-b border-border p-3 last:border-0" data-testid="dynamic-badge">
              <BadgeChip name={b.name} color={b.color} />
              <Mono className="text-xs text-muted-foreground">{b.color}</Mono>
              <span className="min-w-0 flex-1 text-sm text-muted-foreground">{b.rule}</span>
            </li>
          ))}
        </ul>
      </section>

      {editing ? <BadgeDialog key={editing === "new" ? "new" : editing.id} badge={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <ConfirmDelete
          title={`حذف «${deleting.name}»`}
          description={`مرتبطة بـ ${deleting.products_count} منتجاً؛ ستُزال منها.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const res = await orgApi.deleteBadge(deleting.id);
            toast.success(`حُذفت الشارة وأُزيلت من ${res.cleared} منتجاً`);
            await invalidate();
          }}
        />
      ) : null}
    </div>
  );
}
