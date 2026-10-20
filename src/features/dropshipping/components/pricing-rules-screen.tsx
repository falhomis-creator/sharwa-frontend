"use client";

import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { ScrollX } from "@/components/shared/scroll-x";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { toWesternDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApplyRule, useConnection, useDeleteRule, useRules, useSaveRule, useSimulateRule } from "@/features/dropshipping/api";
import { ROUNDINGS, ROUNDING_LABELS, SUPPLIER_CODES, SUPPLIER_LABELS, ruleFormSchema, type PricingRule, type RuleForm, type Simulation } from "@/features/dropshipping/schemas";
import { DropshippingGate, DropshippingNav, StatusText } from "@/features/dropshipping/components/bits";

/**
 * `/dashboard/channels/dropshipping/pricing-rules` (US-29.2, FR-29.04): rules in the
 * server's priority order; editing happens in a sheet whose «محاكاة» shows before/after
 * from the server; «تطبيق» previews the affected count, then reports what changed.
 */
export function PricingRulesScreen() {
  return (
    <DropshippingGate>
      <Inner />
    </DropshippingGate>
  );
}

const scopeLabel = (r: PricingRule) => (r.scope_type === "all" ? "كل المنتجات" : r.scope_type === "supplier" ? `المورد: ${SUPPLIER_LABELS[r.scope_value as keyof typeof SUPPLIER_LABELS] ?? r.scope_value}` : `الفئة: ${r.scope_value}`);

function Inner() {
  const q = useRules();
  const [sheet, setSheet] = useState<{ open: boolean; rule: PricingRule | null }>({ open: false, rule: null });
  const [applying, setApplying] = useState<{ rule: PricingRule; affected: number | null } | null>(null);
  const simulate = useSimulateRule();
  const apply = useApplyRule();
  const del = useDeleteRule();

  const startApply = async (rule: PricingRule) => {
    setApplying({ rule, affected: null });
    try {
      const sim = await simulate.mutateAsync({ ...rule });
      setApplying({ rule, affected: sim.affected_count });
    } catch (e) {
      setApplying(null);
      toast.error(isApiError(e) ? e.userMessage : "تعذّرت المعاينة");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="قواعد التسعير"
        description="الهامش والتقريب وسعر الصرف لمنتجات الموردين. الأصغر أولوية يُطبَّق أولاً."
        actions={
          <Button className="h-11 gap-1.5 lg:h-9" onClick={() => setSheet({ open: true, rule: null })} data-testid="new-rule">
            <Plus className="size-4" aria-hidden /> قاعدة جديدة
          </Button>
        }
      />
      <DropshippingNav active="rules" />
      {q.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : q.error || !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data.length ? (
        <EmptyState title="لا قواعد تسعير — ستُستورد المنتجات بتكلفة المورد" action={<Button className="h-11 lg:h-9" onClick={() => setSheet({ open: true, rule: null })}>قاعدة جديدة</Button>} />
      ) : (
        <ol className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="rules-list">
          {q.data.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 p-3 lg:flex-row lg:items-center lg:gap-6" data-testid="rule-row">
              <Mono className="w-10 text-muted-foreground" title="الأولوية">
                {r.priority}
              </Mono>
              <span className="flex min-w-48 flex-1 flex-col">
                <span className="font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground">{scopeLabel(r)}</span>
              </span>
              <span className="flex flex-wrap gap-x-4 text-sm">
                <span>
                  هامش <Mono>{r.markup_percent}%</Mono>
                </span>
                <span className="text-muted-foreground">{ROUNDING_LABELS[r.rounding]}</span>
                <span className="text-muted-foreground">
                  صرف {r.fx_source === "daily" ? "يومي" : <Mono>{r.fx_rate}</Mono>}
                </span>
              </span>
              <StatusText tone={r.is_active ? "success" : "muted"} label={r.is_active ? "مفعّلة" : "معطّلة"} />
              <span className="flex gap-1">
                <Button variant="outline" size="sm" className="h-11 lg:h-8" onClick={() => setSheet({ open: true, rule: r })}>
                  تعديل ومحاكاة
                </Button>
                <Button variant="outline" size="sm" className="h-11 lg:h-8" disabled={!r.is_active} onClick={() => void startApply(r)} data-testid="rule-apply">
                  تطبيق
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 lg:h-8"
                  onClick={async () => {
                    try {
                      await del.mutateAsync(r.id);
                      toast.success(`حُذفت «${r.name}»`);
                    } catch (e) {
                      toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف");
                    }
                  }}
                >
                  حذف
                </Button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <RuleSheet open={sheet.open} rule={sheet.rule} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))} />
      <Dialog open={applying !== null} onOpenChange={(v) => !v && setApplying(null)}>
        <DialogContent>
          <DialogTitle>تطبيق «{applying?.rule.name}»</DialogTitle>
          <DialogDescription>
            {applying?.affected === null ? "جارٍ حساب المنتجات المتأثرة…" : <>ستُحدَّث أسعار <Mono>{applying?.affected}</Mono> منتجاً في نطاق القاعدة (حسب الأولوية).</>}
          </DialogDescription>
          <DialogFooter>
            <Button variant="ghost" className="h-11 lg:h-9" onClick={() => setApplying(null)}>
              تراجع
            </Button>
            <Button
              className="h-11 lg:h-9"
              disabled={applying?.affected === null || apply.isPending}
              data-testid="rule-apply-confirm"
              onClick={async () => {
                if (!applying) return;
                try {
                  const r = await apply.mutateAsync(applying.rule.id);
                  toast.success(`حُدِّثت أسعار ${r.updated} منتجاً`);
                } catch (e) {
                  toast.error(isApiError(e) ? e.userMessage : "تعذّر التطبيق");
                }
                setApplying(null);
              }}
            >
              تطبيق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RuleSheet({ open, rule, onOpenChange }: { open: boolean; rule: PricingRule | null; onOpenChange: (v: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="overflow-y-auto data-[side=left]:w-full data-[side=left]:sm:max-w-xl" data-testid="rule-sheet">
        <div className="flex flex-col gap-1 border-b border-border p-4">
          <SheetTitle>{rule ? `تعديل «${rule.name}»` : "قاعدة تسعير جديدة"}</SheetTitle>
          <SheetDescription>حاكِ القاعدة على عيّنة قبل الحفظ — الأسعار من الخادم.</SheetDescription>
        </div>
        {open ? <RuleFormBody key={rule?.id ?? "new"} rule={rule} onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function RuleFormBody({ rule, onDone }: { rule: PricingRule | null; onDone: () => void }) {
  const id = useId();
  const save = useSaveRule(rule?.id ?? null);
  const simulate = useSimulateRule();
  const [sim, setSim] = useState<Simulation | null>(null);
  const cats = useConnection("cj");
  const form = useForm<RuleForm>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: rule
      ? { name: rule.name, scope_type: rule.scope_type, scope_value: rule.scope_value, markup_percent: rule.markup_percent, rounding: rule.rounding, fx_source: rule.fx_source, fx_rate: rule.fx_rate, priority: String(rule.priority), is_active: rule.is_active }
      : { name: "", scope_type: "all", scope_value: "", markup_percent: "30", rounding: "end_99", fx_source: "fixed", fx_rate: "3.75", priority: "50", is_active: true },
  });
  const { register, control, handleSubmit, formState, setError } = form;
  const scope = useWatch({ control, name: "scope_type" });
  const fx = useWatch({ control, name: "fx_source" });
  const err = (k: keyof RuleForm) => formState.errors[k]?.message;
  const digits = { setValueAs: (v: string) => toWesternDigits(String(v)) };
  const payload = (v: RuleForm) => ({ ...v, priority: Number(v.priority), scope_value: v.scope_type === "all" ? "" : v.scope_value, id: rule?.id });
  const fieldErrors = (e: unknown) => {
    if (isApiError(e) && e.fields) for (const [k, m] of Object.entries(e.fields)) setError(k as FieldPath<RuleForm>, { message: m[0] });
    else toast.error(isApiError(e) ? e.userMessage : "تعذّر الطلب");
  };

  const runSim = handleSubmit(async (v) => {
    try {
      setSim(await simulate.mutateAsync(payload(v)));
    } catch (e) {
      fieldErrors(e);
    }
  });
  const runSave = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(payload(v));
      toast.success(rule ? "حُفظت القاعدة" : "أُنشئت القاعدة");
      onDone();
    } catch (e) {
      fieldErrors(e);
    }
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void runSave();
      }}
      className="flex flex-col gap-4 p-4"
      data-testid="rule-form"
    >
      <Field label="الاسم" htmlFor={`${id}-n`} required error={err("name")}>
        <input id={`${id}-n`} {...register("name")} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="النطاق" htmlFor={`${id}-s`} error={err("scope_type")}>
          <NativeSelect id={`${id}-s`} {...register("scope_type")} className="h-11 md:h-8">
            <option value="all">كل المنتجات</option>
            <option value="supplier">مورد</option>
            <option value="category">فئة</option>
          </NativeSelect>
        </Field>
        {scope !== "all" ? (
          <Field label={scope === "supplier" ? "المورد" : "الفئة"} htmlFor={`${id}-sv`} error={err("scope_value")}>
            <NativeSelect id={`${id}-sv`} {...register("scope_value")} className="h-11 md:h-8">
              <option value="">اختر…</option>
              {scope === "supplier"
                ? SUPPLIER_CODES.map((c) => (
                    <option key={c} value={c}>
                      {SUPPLIER_LABELS[c]}
                    </option>
                  ))
                : ["عطور", "إلكترونيات", "أزياء", "منزل", "تجميل", ...(cats.data?.categories ?? [])]
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
            </NativeSelect>
          </Field>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="الهامش %" htmlFor={`${id}-m`} error={err("markup_percent")}>
          <input id={`${id}-m`} inputMode="decimal" dir="ltr" {...register("markup_percent", digits)} className={numericInputClass} data-testid="rule-markup" />
        </Field>
        <Field label="التقريب" htmlFor={`${id}-r`} error={err("rounding")}>
          <NativeSelect id={`${id}-r`} {...register("rounding")} className="h-11 md:h-8" data-testid="rule-rounding">
            {ROUNDINGS.map((r) => (
              <option key={r} value={r}>
                {ROUNDING_LABELS[r]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="الأولوية" htmlFor={`${id}-p`} error={err("priority")} hint="الأصغر أولاً.">
          <input id={`${id}-p`} inputMode="numeric" dir="ltr" {...register("priority", digits)} className={numericInputClass} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="مصدر سعر الصرف" htmlFor={`${id}-fx`} error={err("fx_source")}>
          <NativeSelect id={`${id}-fx`} {...register("fx_source")} className="h-11 md:h-8">
            <option value="fixed">ثابت</option>
            <option value="daily">يومي (من الخادم)</option>
          </NativeSelect>
        </Field>
        {fx === "fixed" ? (
          <Field label="سعر الصرف (USD→SAR)" htmlFor={`${id}-fr`} error={err("fx_rate")}>
            <input id={`${id}-fr`} inputMode="decimal" dir="ltr" {...register("fx_rate", digits)} className={numericInputClass} />
          </Field>
        ) : null}
      </div>
      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>مفعّلة</span>
            <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="القاعدة مفعّلة" />
          </label>
        )}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-11 lg:h-9" disabled={simulate.isPending} onClick={() => void runSim()} data-testid="rule-simulate">
          {simulate.isPending ? "جارٍ المحاكاة…" : "محاكاة"}
        </Button>
        <Button type="submit" className="h-11 lg:h-9" disabled={save.isPending} data-testid="rule-save">
          حفظ
        </Button>
      </div>
      {sim ? <SimulationView sim={sim} /> : null}
    </form>
  );
}

function SimulationView({ sim }: { sim: Simulation }) {
  return (
    <section className="flex flex-col gap-2 border-t border-border pt-4" data-testid="simulation">
      <p className="text-sm">
        يؤثر على <Mono>{sim.affected_count}</Mono> منتجاً.
        {sim.below_cost_count ? (
          <span className="ms-2 text-destructive" data-testid="below-cost">
            <Mono>{sim.below_cost_count}</Mono> سعر تحت التكلفة في العيّنة.
          </span>
        ) : null}
      </p>
      {sim.overlaps.length ? (
        <p className="text-xs text-muted-foreground" data-testid="overlaps">
          تتداخل مع: {sim.overlaps.map((o) => `${o.name} (أولوية ${o.priority})`).join("، ")} — يُطبَّق الأصغر أولوية.
        </p>
      ) : null}
      <ScrollX className="surface-card">
        <table className="w-full min-w-[480px] text-sm">
          <caption className="sr-only">عيّنة المحاكاة</caption>
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start font-normal">المنتج</th>
              <th className="px-3 py-2 text-end font-normal">تكلفة المورد</th>
              <th className="px-3 py-2 text-end font-normal">الحالي</th>
              <th className="px-3 py-2 text-end font-normal">بعد القاعدة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sim.sample.map((s) => (
              <tr key={s.product.id} className="h-11">
                <td className="px-3 py-2">
                  <span className="flex flex-col">
                    <span className="truncate">{s.product.name}</span>
                    <span className="text-xs text-muted-foreground">{SUPPLIER_LABELS[s.product.supplier_code]}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-end">
                  <Money value={s.display_cost} muted />
                </td>
                <td className="px-3 py-2 text-end">
                  <Money value={s.display_current} muted />
                </td>
                <td className={cn("px-3 py-2 text-end", s.below_cost && "text-destructive")}>
                  <Money value={s.display_after} className="font-medium" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
    </section>
  );
}
