"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api-error";
import { formatRelative } from "@/lib/format";
import { useDeleteKeyword, useDeleteTemplate, useKeywords, useSaveKeyword, useSaveTemplate, useTemplates } from "@/features/channels/api";
import {
  MATCH_LABELS,
  MATCH_TYPES,
  REPLY_LABELS,
  REPLY_TYPES,
  keywordFormSchema,
  templateFormSchema,
  type Keyword,
  type KeywordForm,
  type ReplyTemplate,
} from "@/features/channels/schemas";
import { ChannelsShell } from "@/features/channels/components/channels-shell";
import { ConfirmDialog } from "@/features/inbox/components/confirm-dialog";
import { ProductPicker } from "@/features/inbox/components/reply-box";

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  const e: Record<string, string> = {};
  for (const i of issues) e[String(i.path[0])] ??= i.message;
  return e;
}

// ── keyword triggers (US-27.4) ───────────────────────────────────────────────────────

export function KeywordsScreen() {
  const [editing, setEditing] = useState<Keyword | "new" | null>(null);
  return (
    <ChannelsShell
      title="المحفّزات بالكلمات المفتاحية"
      description="ردّ آلي حين تحتوي رسالة العميل كلمة أو تطابقها تماماً."
      actions={
        <Button className="h-11 lg:h-9" onClick={() => setEditing("new")} data-testid="keyword-new">
          محفّز جديد
        </Button>
      }
    >
      <KeywordsTable onEdit={setEditing} />
      <KeywordSheet value={editing} onClose={() => setEditing(null)} />
    </ChannelsShell>
  );
}

function KeywordsTable({ onEdit }: { onEdit: (k: Keyword) => void }) {
  const q = useKeywords();
  const save = useSaveKeyword();
  const del = useDeleteKeyword();
  const [confirm, setConfirm] = useState<Keyword | null>(null);
  if (q.isLoading) return <Skeleton className="h-48" />;
  if (!q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.length === 0) return <EmptyState title="لا محفّزات بعد" description="مثال: «الأسعار» مطابق ← رابط الكتالوج." />;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="keywords-table">
          <caption className="sr-only">المحفّزات</caption>
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="py-2 text-start font-normal">الكلمة</th>
              <th className="py-2 text-start font-normal">المطابقة</th>
              <th className="py-2 text-start font-normal">الردّ</th>
              <th className="py-2 text-start font-normal">مفعّل</th>
              <th className="py-2">
                <span className="sr-only">إجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {q.data.map((k) => (
              <tr key={k.id} className="h-11 border-b border-border" data-testid="keyword-row">
                <td className="pe-3 font-medium">{k.keyword}</td>
                <td className="pe-3 text-muted-foreground">{MATCH_LABELS[k.match_type]}</td>
                <td className="pe-3">
                  <span className="text-muted-foreground">{REPLY_LABELS[k.reply_type]}</span>
                  {k.reply_type === "text" ? <span className="ms-2 line-clamp-1 inline text-xs">{k.reply_text}</span> : k.product_name ? <span className="ms-2 text-xs">{k.product_name}</span> : null}
                </td>
                <td className="pe-3">
                  <Switch
                    checked={k.is_active}
                    aria-label={`تفعيل «${k.keyword}»`}
                    onCheckedChange={(v) => save.mutate({ id: k.id, body: { is_active: v } }, { onSuccess: () => toast.success(v ? "فُعّل المحفّز." : "عُطّل المحفّز."), onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر.") })}
                  />
                </td>
                <td className="whitespace-nowrap text-end">
                  <button type="button" onClick={() => onEdit(k)} className="h-11 rounded-md px-2 text-sm hover:bg-muted lg:h-8">
                    تعديل
                  </button>
                  <button type="button" onClick={() => setConfirm(k)} className="h-11 rounded-md px-2 text-sm text-destructive hover:bg-muted lg:h-8">
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="حذف المحفّز؟"
        description={`لن يُرسَل الردّ الآلي عند كلمة «${confirm?.keyword ?? ""}» بعد الآن.`}
        confirmLabel="حذف"
        destructive
        pending={del.isPending}
        onConfirm={() => confirm && del.mutate(confirm.id, { onSuccess: () => (setConfirm(null), toast.success("حُذف المحفّز.")), onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف.") })}
      />
    </>
  );
}

function KeywordSheet({ value, onClose }: { value: Keyword | "new" | null; onClose: () => void }) {
  return (
    <Sheet open={value !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full sm:max-w-md" data-testid="keyword-sheet">
        {value !== null ? <KeywordFormBody key={value === "new" ? "new" : value.id} value={value} onClose={onClose} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function KeywordFormBody({ value, onClose }: { value: Keyword | "new"; onClose: () => void }) {
  const save = useSaveKeyword();
  const init = value === "new" ? null : value;
  const [form, setForm] = useState<KeywordForm>({ keyword: init?.keyword ?? "", match_type: init?.match_type ?? "contains", reply_type: init?.reply_type ?? "text", reply_text: init?.reply_text ?? "", product_id: init?.product_id ?? null });
  const [productName, setProductName] = useState(init?.product_name ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState(false);
  const set = (patch: Partial<KeywordForm>) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    const parsed = keywordFormSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    try {
      await save.mutateAsync({ id: init?.id ?? null, body: parsed.data });
      toast.success(init ? "حُفظ المحفّز." : "أُضيف المحفّز.");
      onClose();
    } catch (e) {
      if (isApiError(e) && e.fields) setErrors(Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, v[0] ?? ""])));
      else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{init ? "تعديل المحفّز" : "محفّز جديد"}</SheetTitle>
        <SheetDescription>يطبّقه الخادم على الرسائل الواردة من كل القنوات المربوطة.</SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 overflow-y-auto px-4">
        <Field label="الكلمة المفتاحية" htmlFor="kw-word" error={errors.keyword} required>
          <input id="kw-word" className={inputClass} value={form.keyword} onChange={(e) => set({ keyword: e.target.value })} aria-invalid={Boolean(errors.keyword)} />
        </Field>
        <Field label="نوع المطابقة" htmlFor="kw-match">
          <NativeSelect id="kw-match" value={form.match_type} onChange={(e) => set({ match_type: e.target.value as KeywordForm["match_type"] })} className="h-11 lg:h-8">
            {MATCH_TYPES.map((m) => (
              <option key={m} value={m}>
                {MATCH_LABELS[m]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="نوع الردّ" htmlFor="kw-reply">
          <NativeSelect id="kw-reply" value={form.reply_type} onChange={(e) => set({ reply_type: e.target.value as KeywordForm["reply_type"] })} className="h-11 lg:h-8">
            {REPLY_TYPES.map((r) => (
              <option key={r} value={r}>
                {REPLY_LABELS[r]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {form.reply_type === "text" ? (
          <Field label="نص الردّ" htmlFor="kw-text" error={errors.reply_text} counter={{ value: form.reply_text.length, max: 1000 }}>
            <Textarea id="kw-text" rows={4} dir="auto" value={form.reply_text} onChange={(e) => set({ reply_text: e.target.value })} aria-invalid={Boolean(errors.reply_text)} />
          </Field>
        ) : form.reply_type === "product_card" ? (
          <Field label="المنتج" error={errors.product_id}>
            <button type="button" onClick={() => setPicker(true)} className="h-11 rounded-lg border border-border px-3 text-start text-sm hover:bg-muted lg:h-8">
              {form.product_id ? productName || `منتج #${form.product_id}` : "اختر منتجاً…"}
            </button>
          </Field>
        ) : (
          <p className="text-xs text-muted-foreground">يُرسَل رابط كتالوج المتجر كما يولّده الخادم.</p>
        )}
      </div>
      <SheetFooter className="flex-row">
        <Button variant="outline" className="h-11 flex-1 lg:h-9" onClick={onClose}>
          إلغاء
        </Button>
        <Button className="h-11 flex-1 lg:h-9" onClick={() => void submit()} disabled={save.isPending} data-testid="keyword-save">
          {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
        </Button>
      </SheetFooter>
      <ProductPicker
        open={picker}
        onOpenChange={setPicker}
        title="منتج الردّ"
        onPick={(p) => {
          setPicker(false);
          set({ product_id: p.id });
          setProductName(p.name);
        }}
      />
    </>
  );
}

// ── reply templates ──────────────────────────────────────────────────────────────────

export function TemplatesScreen() {
  const q = useTemplates();
  const save = useSaveTemplate();
  const del = useDeleteTemplate();
  const [editing, setEditing] = useState<ReplyTemplate | "new" | null>(null);
  const [form, setForm] = useState({ title: "", body: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<ReplyTemplate | null>(null);
  const [now] = useState(() => new Date());
  const open = (t: ReplyTemplate | "new") => {
    setEditing(t);
    setForm(t === "new" ? { title: "", body: "" } : { title: t.title, body: t.body });
    setErrors({});
  };
  async function submit() {
    const parsed = templateFormSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    try {
      await save.mutateAsync({ id: editing && editing !== "new" ? editing.id : null, body: parsed.data });
      toast.success("حُفظ القالب.");
      setEditing(null);
    } catch (e) {
      if (isApiError(e) && e.fields) setErrors(Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, v[0] ?? ""])));
      else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  }
  return (
    <ChannelsShell
      title="قوالب الردود"
      description="ردود جاهزة يدرجها الموظفون بكتابة / في حقل الردّ."
      actions={
        <Button className="h-11 lg:h-9" onClick={() => open("new")} data-testid="template-new">
          قالب جديد
        </Button>
      }
    >
      {q.isLoading ? (
        <Skeleton className="h-48" />
      ) : !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title="لا قوالب بعد" description="أنشئ قوالب للأسئلة المتكررة: مدة التوصيل، طرق الدفع، الاستبدال." />
      ) : (
        <ul className="flex flex-col divide-y divide-border border-y border-border" data-testid="templates-list">
          {q.data.map((t) => (
            <li key={t.id} className="flex flex-col gap-1 py-3 md:flex-row md:items-start md:gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm font-medium">{t.title}</span>
                <p dir="auto" className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {t.body}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  عُدّل <Mono>{formatRelative(t.updated_at, now)}</Mono>
                </span>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => open(t)} className="h-11 rounded-md px-2 text-sm hover:bg-muted lg:h-8">
                  تعديل
                </button>
                <button type="button" onClick={() => setConfirm(t)} className="h-11 rounded-md px-2 text-sm text-destructive hover:bg-muted lg:h-8">
                  حذف
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="left" className="w-full sm:max-w-md" data-testid="template-sheet">
          <SheetHeader>
            <SheetTitle>{editing === "new" ? "قالب جديد" : "تعديل القالب"}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4">
            <Field label="العنوان" htmlFor="tp-title" error={errors.title} required>
              <input id="tp-title" className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-invalid={Boolean(errors.title)} />
            </Field>
            <Field label="النص" htmlFor="tp-body" error={errors.body} counter={{ value: form.body.length, max: 1000 }} required>
              <Textarea id="tp-body" rows={6} dir="auto" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} aria-invalid={Boolean(errors.body)} />
            </Field>
          </div>
          <SheetFooter className="flex-row">
            <Button variant="outline" className="h-11 flex-1 lg:h-9" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
            <Button className="h-11 flex-1 lg:h-9" onClick={() => void submit()} disabled={save.isPending} data-testid="template-save">
              حفظ
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="حذف القالب؟"
        description={`لن يظهر «${confirm?.title ?? ""}» في قائمة / بعد الآن.`}
        confirmLabel="حذف"
        destructive
        pending={del.isPending}
        onConfirm={() => confirm && del.mutate(confirm.id, { onSuccess: () => (setConfirm(null), toast.success("حُذف القالب.")), onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف.") })}
      />
    </ChannelsShell>
  );
}
