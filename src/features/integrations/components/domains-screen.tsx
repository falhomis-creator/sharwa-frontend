"use client";

import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";
import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { useAddDomain, useDeleteDomain, useDomains, useSetPrimaryDomain, useVerifyDomain } from "@/features/integrations/api";
import { applyServerErrors, ConfirmDialog, CopyValue, errorMessage, OwnerGate, SectionHeading, StatusText } from "@/features/integrations/components/shared";
import { DOMAIN_TONE, domainFormatError, domainStatusText, type DnsRecord, type Domain } from "@/features/integrations/schemas";
import { formatDateTime } from "@/lib/format";

/**
 * `/dashboard/settings/domains` — M19 US-19.1. The subdomain row (read-only, «أساسي» until a
 * custom domain is primary), the custom domains with a readable status and next step, and a
 * Sheet that adds a domain and then shows the DNS records the server asks for (FR-19.03).
 * The list polls every 30 s only while something is pending (FR-19.02).
 */
const sheetParsers = { add: parseAsBoolean, domain: parseAsInteger };
const sheetClass = "w-full gap-0 overflow-y-auto p-5 shadow-none data-[side=left]:w-full data-[side=left]:sm:max-w-xl";

export function DomainsScreen() {
  return (
    <OwnerGate what="إدارة النطاقات">
      <DomainsInner />
    </OwnerGate>
  );
}

function DomainsInner() {
  const q = useDomains();
  const [sheet, setSheet] = useQueryStates(sheetParsers, { history: "replace" });
  const rows = q.data?.results ?? [];
  const custom = rows.filter((d) => d.kind === "custom");
  const open = sheet.domain !== null ? rows.find((d) => d.id === sheet.domain) ?? null : null;
  const polling = custom.some((d) => d.status === "pending_dns" || d.status === "verifying");

  return (
    <div className="flex flex-col gap-6" data-testid="domains-screen">
      <SectionHeading
        title="النطاقات"
        description="اربط نطاقك الخاص بمتجرك. نعطيك سجلات DNS لتضيفها عند مزوّد النطاق ونتحقق منها ونصدر شهادة HTTPS."
        actions={
          <Button className="h-11 lg:h-9" onClick={() => void setSheet({ add: true, domain: null })} data-testid="add-domain">
            ربط نطاق
          </Button>
        }
      />

      {q.isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : q.isError || !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border" aria-label="نطاقات المتجر" data-testid="domain-list">
            {rows
              .filter((d) => d.kind === "subdomain")
              .map((d) => (
                <DomainRow key={d.id} d={d} onOpen={null} />
              ))}
            {custom.map((d) => (
              <DomainRow key={d.id} d={d} onOpen={() => void setSheet({ domain: d.id, add: null })} />
            ))}
          </ul>
          {custom.length === 0 ? (
            <EmptyState
              title="لا نطاق مخصص — متجرك يعمل على النطاق الفرعي"
              description="اربط نطاقاً تملكه (مثل example.com أو shop.example.com) ليظهر متجرك عليه."
              action={
                <Button variant="outline" className="h-11 lg:h-9" onClick={() => void setSheet({ add: true, domain: null })}>
                  ربط نطاق
                </Button>
              }
            />
          ) : null}
          {polling ? (
            <p className="text-xs text-muted-foreground" role="status" data-testid="domains-polling">
              نتحقق من النطاقات قيد الانتظار تلقائياً كل <Mono>30</Mono> ثانية.
            </p>
          ) : null}
        </>
      )}

      <Sheet open={!!sheet.add} onOpenChange={(o) => !o && void setSheet({ add: null })}>
        <SheetContent side="left" className={sheetClass} data-testid="add-domain-sheet">
          <SheetTitle className="text-lg">ربط نطاق</SheetTitle>
          <SheetDescription className="pb-4">أدخل النطاق الذي تملكه. ستظهر بعدها سجلات DNS المطلوبة.</SheetDescription>
          {q.data ? <AddDomainForm baseDomain={q.data.base_domain} onAdded={(d) => void setSheet({ add: null, domain: d.id })} /> : null}
        </SheetContent>
      </Sheet>

      <Sheet open={open !== null} onOpenChange={(o) => !o && void setSheet({ domain: null })}>
        <SheetContent side="left" className={sheetClass} data-testid="domain-sheet">
          <SheetTitle className="sr-only">النطاق {open?.domain ?? ""}</SheetTitle>
          <SheetDescription className="sr-only">الحالة وسجلات DNS والإجراءات</SheetDescription>
          {open ? <DomainPanel d={open} onDeleted={() => void setSheet({ domain: null })} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PrimaryTag() {
  return <span className="rounded-md border border-border px-1.5 py-0.5 text-xs font-medium" data-testid="primary-tag">أساسي</span>;
}

function DomainRow({ d, onOpen }: { d: Domain; onOpen: (() => void) | null }) {
  const inner = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <Mono className="truncate text-sm font-medium">{d.domain}</Mono>
          {d.is_primary ? <PrimaryTag /> : null}
        </span>
        <span className="text-xs text-muted-foreground">
          {d.kind === "subdomain" ? "النطاق الفرعي من شروة — للقراءة فقط" : d.status === "failed" ? (d.failure_reason ?? "فشل التحقق") : d.status === "active" ? (d.is_primary ? "يُوجَّه إليه كل الزوار" : "نشط — يمكنك جعله أساسياً") : "أضف سجلات DNS ثم تحقّق"}
        </span>
      </span>
      <StatusText tone={DOMAIN_TONE[d.status]} testId={`domain-status-${d.id}`}>
        {domainStatusText(d)}
      </StatusText>
    </>
  );
  if (!onOpen)
    return (
      <li className="flex min-h-16 items-center gap-3 p-3" data-testid="domain-row-subdomain">
        {inner}
      </li>
    );
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex min-h-16 w-full items-center gap-3 p-3 text-start transition-colors hover:bg-muted/50" data-testid={`domain-row-${d.id}`} data-domain={d.domain}>
        {inner}
      </button>
    </li>
  );
}

function AddDomainForm({ baseDomain, onAdded }: { baseDomain: string; onAdded: (d: Domain) => void }) {
  const add = useAddDomain();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(
    () =>
      z.object({
        domain: z.string().superRefine((v, ctx) => {
          const e = domainFormatError(v, baseDomain);
          if (e) ctx.addIssue({ code: "custom", message: e });
        }),
      }),
    [baseDomain],
  );
  const form = useForm<{ domain: string }>({ resolver: zodResolver(schema), defaultValues: { domain: "" } });
  const { errors } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      const d = await add.mutateAsync(v.domain.trim().toLowerCase());
      toast.success("أُضيف النطاق — أضف سجلات DNS الآن");
      form.reset();
      onAdded(d);
    } catch (err) {
      if (!applyServerErrors(form, err)) setFormError(errorMessage(err));
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="add-domain-form">
      <Field label="النطاق" htmlFor="domain" required error={errors.domain?.message} hint={`مثل example.com أو shop.example.com — بلا https:// ولا مسار، وليس تحت ${baseDomain}.`}>
        <input id="domain" {...form.register("domain")} dir="ltr" inputMode="url" autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="shop.example.com" className={`${inputClass} font-mono`} aria-invalid={!!errors.domain} aria-describedby={errors.domain ? "domain-error" : undefined} data-testid="domain-input" />
      </Field>
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" className="h-11 lg:h-9" disabled={add.isPending} data-testid="add-domain-submit">
          {add.isPending ? "جارٍ الإضافة…" : "إضافة وعرض سجلات DNS"}
        </Button>
      </div>
    </form>
  );
}

/** SC-19.2: every status as readable text with the next step. */
function StatusExplainer({ d }: { d: Domain }) {
  let body: ReactNode;
  if (d.status === "pending_dns") body = "أضف السجلات أدناه عند مزوّد النطاق كما هي، ثم اضغط «تحقّق الآن». قد يستغرق انتشار DNS من دقائق حتى 48 ساعة.";
  else if (d.status === "verifying") body = d.dns_ok ? "سجلات DNS صحيحة — نُصدر شهادة HTTPS الآن، وعادةً يكتمل ذلك خلال دقائق." : "نفحص سجلات DNS لدى مزوّد النطاق…";
  else if (d.status === "active")
    body = (
      <>
        النطاق يعمل بشهادة HTTPS{d.verified_at ? <> منذ {formatDateTime(d.verified_at)}</> : null}.{d.is_primary ? " كل الزوار يُوجَّهون إليه." : " اجعله أساسياً ليُحوَّل الزوار إليه."}
      </>
    );
  else
    body = (
      <>
        <span className="block text-destructive" data-testid="failure-reason">
          {d.failure_reason ?? "فشل التحقق من النطاق."}
        </span>
        <span className="mt-1 block">{d.next_step ?? "راجع السجلات أعلاه ثم اضغط «تحقّق الآن»."}</span>
      </>
    );
  return (
    <div className="flex flex-col gap-1.5 border-b border-border pb-4" data-testid="status-explainer">
      <StatusText tone={DOMAIN_TONE[d.status]} className="text-base font-medium">
        {domainStatusText(d)}
      </StatusText>
      <p className="text-sm text-muted-foreground">{body}</p>
      {d.last_checked_at ? <p className="text-xs text-muted-foreground">آخر فحص: {formatDateTime(d.last_checked_at)}</p> : null}
    </div>
  );
}

function DnsRecords({ records }: { records: DnsRecord[] }) {
  return (
    <section className="flex flex-col gap-2" aria-label="سجلات DNS" data-testid="dns-records">
      <h3 className="text-sm font-medium">سجلات DNS المطلوبة</h3>
      <p className="text-xs text-muted-foreground">انسخ كل قيمة كما هي. ركّز على قيمة واضغط C لنسخها.</p>
      {/* Desktop: a clean Mono table. */}
      <table className="hidden w-full table-fixed border-collapse text-sm md:table">
        <caption className="sr-only">سجلات DNS</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="w-20 py-2 text-start font-medium">النوع</th>
            <th scope="col" className="w-44 py-2 text-start font-medium">الاسم</th>
            <th scope="col" className="py-2 text-start font-medium">القيمة</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i} className="border-b border-border align-middle last:border-b-0">
              <td className="py-2">
                <Mono className="text-xs font-medium">{r.type}</Mono>
              </td>
              <td className="py-2 pe-2">
                <CopyValue value={r.name} label="الاسم" />
              </td>
              <td className="py-2">
                <CopyValue value={r.value} label="القيمة" testId={`dns-value-${i}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Phones: a vertical list with large copy buttons (§6). */}
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border md:hidden">
        {records.map((r, i) => (
          <li key={i} className="flex flex-col gap-2 p-3">
            <Mono className="text-xs font-medium text-muted-foreground">{r.type}</Mono>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">الاسم</span>
              <CopyValue value={r.name} label="الاسم" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">القيمة</span>
              <CopyValue value={r.value} label="القيمة" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DomainPanel({ d, onDeleted }: { d: Domain; onDeleted: () => void }) {
  const verify = useVerifyDomain();
  const setPrimary = useSetPrimaryDomain();
  const remove = useDeleteDomain();
  const [confirm, setConfirm] = useState<"primary" | "delete" | null>(null);

  async function run(kind: "verify" | "primary" | "delete") {
    try {
      if (kind === "verify") {
        const next = await verify.mutateAsync(d.id);
        toast(next.status === "active" ? "النطاق نشط" : `الحالة: ${domainStatusText(next)}`);
      } else if (kind === "primary") {
        await setPrimary.mutateAsync(d.id);
        toast.success(`${d.domain} هو النطاق الأساسي الآن`);
        setConfirm(null);
      } else {
        await remove.mutateAsync(d.id);
        toast.success("حُذف النطاق");
        setConfirm(null);
        onDeleted();
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-5" data-testid="domain-panel" data-status={d.status}>
      <div className="flex flex-wrap items-center gap-2 pe-10">
        <Mono className="text-lg font-semibold">{d.domain}</Mono>
        {d.is_primary ? <PrimaryTag /> : null}
      </div>
      <StatusExplainer d={d} />
      {d.dns_records.length ? <DnsRecords records={d.dns_records} /> : null}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {d.status !== "active" ? (
          <Button className="h-11 lg:h-9" disabled={verify.isPending} onClick={() => void run("verify")} data-testid="verify-domain">
            {verify.isPending ? "جارٍ التحقق…" : "تحقّق الآن"}
          </Button>
        ) : null}
        {d.status === "active" && !d.is_primary ? (
          <Button className="h-11 lg:h-9" onClick={() => setConfirm("primary")} data-testid="make-primary">
            اجعله أساسياً
          </Button>
        ) : null}
        <Button
          variant="destructive"
          className="h-11 lg:h-9"
          disabled={d.is_primary}
          title={d.is_primary ? "لا يُحذف النطاق الأساسي — اجعل نطاقاً آخر أساسياً أولاً" : undefined}
          onClick={() => setConfirm("delete")}
          data-testid="delete-domain"
        >
          حذف النطاق
        </Button>
      </div>
      {d.is_primary ? <p className="text-xs text-muted-foreground">لحذف هذا النطاق اجعل نطاقاً آخر (أو النطاق الفرعي) أساسياً أولاً.</p> : null}

      <ConfirmDialog
        open={confirm === "primary"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="جعل النطاق أساسياً؟"
        description={
          <>
            سيُحوَّل العميل من النطاق الفرعي إلى النطاق الجديد <Mono>{d.domain}</Mono> تلقائياً، وتظهر الروابط والمشاركات به.
          </>
        }
        confirmLabel="اجعله أساسياً"
        pending={setPrimary.isPending}
        onConfirm={() => void run("primary")}
        testId="confirm-primary"
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="حذف النطاق؟"
        description={
          <>
            سيتوقف <Mono>{d.domain}</Mono> عن عرض متجرك. يمكنك ربطه مجدداً لاحقاً.
          </>
        }
        confirmLabel="حذف"
        destructive
        pending={remove.isPending}
        onConfirm={() => void run("delete")}
        testId="confirm-delete"
      />
    </div>
  );
}
