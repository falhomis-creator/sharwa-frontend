"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { translateToString } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { paymentKeys, paymentsApi, useDeleteAccount, usePayoutAccounts, useSaveAccount } from "@/features/payments/api";
import {
  ACCOUNT_TAB_LABELS,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  payoutAccountInputSchema,
  type AccountType,
  type PayoutAccount,
  type PayoutAccountInput,
  type PayoutAccountsResponse,
} from "@/features/payments/schemas";
import { BackLink, PaymentsGate } from "@/features/payments/components/shared";

/**
 * `/dashboard/payments/payout-accounts?tab=bank|wallet` (M14 US-14.3): the accounts a
 * customer sees for a manual transfer. `bank` is the `bank_transfers` feature, `wallet`
 * the `local_wallets` one (§10). Drag to reorder (`POST …/reorder`), and beside the list a
 * «كما يراها العميل» preview of the ACTIVE accounts only; inactive rows read «مخفي».
 */
const parsers = { tab: parseAsStringLiteral(ACCOUNT_TYPES) };

export function PayoutAccountsScreen() {
  return (
    <PaymentsGate anyOf={["bank_transfers", "local_wallets"]}>
      <AccountsInner />
    </PaymentsGate>
  );
}

function AccountsInner() {
  const { canFeature } = useAccess();
  const allowed = ACCOUNT_TYPES.filter((t) => canFeature(t === "bank" ? "bank_transfers" : "local_wallets"));
  const [{ tab: rawTab }, setParams] = useQueryStates(parsers, { history: "replace" });
  const tab: AccountType = rawTab && allowed.includes(rawTab) ? rawTab : allowed[0]!;
  const query = usePayoutAccounts(tab);
  const [editing, setEditing] = useState<PayoutAccount | "new" | null>(null);
  const [deleting, setDeleting] = useState<PayoutAccount | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/payments">المدفوعات</BackLink>
      <PageHeader
        title="حسابات الاستلام"
        description="الحسابات البنكية والمحافظ المحلية التي تظهر للعميل عند اختيار التحويل اليدوي. اسحب لترتيبها كما يراها."
        actions={
          <Button className="h-11 gap-1.5 lg:h-9" onClick={() => setEditing("new")} data-testid="account-new">
            <Plus className="size-4" aria-hidden /> {tab === "bank" ? "حساب بنكي جديد" : "محفظة جديدة"}
          </Button>
        }
      />
      <div role="tablist" aria-label="نوع الحساب" className="flex gap-1 border-b border-border">
        {allowed.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => void setParams({ tab: t })}
            data-testid={`accounts-tab-${t}`}
            className={cn("-mb-px min-h-11 border-b-2 px-3 text-sm lg:min-h-9", tab === t ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {ACCOUNT_TAB_LABELS[t]}
            {query.data ? <Mono className="px-1.5 text-xs text-muted-foreground">{query.data.counts[t]}</Mono> : null}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : query.error || !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.results.length === 0 ? (
        <EmptyState
          title={tab === "bank" ? "لا حسابات — أضف حساباً" : "لا محافظ — أضف محفظة"}
          description="أضف حساباً واحداً على الأقل ليرى العميل أين يحوّل عند اختيار التحويل اليدوي."
          action={
            <Button variant="outline" className="h-11 lg:h-9" onClick={() => setEditing("new")}>
              إضافة {tab === "bank" ? "حساب" : "محفظة"}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <AccountsList data={query.data} type={tab} onEdit={setEditing} onDelete={setDeleting} />
          <CustomerPreview accounts={query.data.results} type={tab} />
        </div>
      )}

      {editing ? <AccountDialog key={editing === "new" ? "new" : editing.id} account={editing === "new" ? null : editing} type={tab} onClose={() => setEditing(null)} /> : null}
      {deleting ? <DeleteDialog account={deleting} onClose={() => setDeleting(null)} /> : null}
    </div>
  );
}

function AccountsList({ data, type, onEdit, onDelete }: { data: PayoutAccountsResponse; type: AccountType; onEdit: (a: PayoutAccount) => void; onDelete: (a: PayoutAccount) => void }) {
  const store = useStore();
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const key = paymentKeys(store).accountsOf(type);
  const save = useSaveAccount();

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = data.results.map((a) => a.id);
    const next = arrayMove(ids, ids.indexOf(Number(e.active.id)), ids.indexOf(Number(e.over.id)));
    const previous = qc.getQueryData<PayoutAccountsResponse>(key);
    const reordered = next.map((id, i) => ({ ...data.results.find((a) => a.id === id)!, sort_order: i }));
    qc.setQueryData<PayoutAccountsResponse>(key, { ...data, results: reordered });
    try {
      const saved = await paymentsApi.reorderAccounts(next);
      qc.setQueryData<PayoutAccountsResponse>(key, (prev) => (prev ? { ...prev, results: saved } : prev));
      toast.success("حُفظ الترتيب");
    } catch (err) {
      qc.setQueryData(key, previous);
      toast.error(isApiError(err) ? err.userMessage : "تعذّر حفظ الترتيب؛ أُعيد كما كان.");
    }
  }

  function toggleActive(a: PayoutAccount, next: boolean) {
    save.mutate(
      { id: a.id, values: { is_active: next } },
      {
        onSuccess: () => toast.success(next ? `«${a.provider_name}» ظاهر للعميل` : `«${a.provider_name}» مخفي عن العميل`),
        onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ."),
      },
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
      <SortableContext items={data.results.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <ul className="min-w-0 rounded-lg border border-border" aria-label={ACCOUNT_TAB_LABELS[type]} data-testid="accounts-list">
          {data.results.map((a) => (
            <AccountRow key={a.id} account={a} onEdit={() => onEdit(a)} onDelete={() => onDelete(a)} onToggle={(v) => toggleActive(a, v)} busy={save.isPending} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function AccountRow({ account, onEdit, onDelete, onToggle, busy }: { account: PayoutAccount; onEdit: () => void; onDelete: () => void; onToggle: (v: boolean) => void; busy: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: account.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: translateToString(transform), transition }}
      className={cn("flex flex-wrap items-center gap-2 border-b border-border bg-background px-2 py-2 last:border-0", isDragging && "relative z-10 border border-foreground")}
      data-testid="account-row"
      data-id={account.id}
      data-active={account.is_active}
    >
      <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`اسحب «${account.provider_name}»`} className="flex size-11 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8" data-testid="account-drag">
        <GripVertical className="size-4" aria-hidden />
      </button>
      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{account.provider_name}</span>
          {!account.is_active ? (
            <span className="text-xs text-muted-foreground" data-testid="account-hidden">
              · مخفي
            </span>
          ) : null}
        </span>
        <span className="truncate text-xs text-muted-foreground">{account.account_name}</span>
        <Mono className="self-start text-sm">{account.account_number}</Mono>
      </div>
      <span className="flex items-center gap-1">
        <Switch checked={account.is_active} onCheckedChange={onToggle} disabled={busy} aria-label={`إظهار «${account.provider_name}» للعميل`} className="me-2" data-testid="account-active" />
        <button type="button" onClick={onEdit} aria-label={`تعديل «${account.provider_name}»`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8" data-testid="account-edit">
          <Pencil className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={onDelete} aria-label={`حذف «${account.provider_name}»`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive lg:size-8" data-testid="account-delete">
          <Trash2 className="size-4" aria-hidden />
        </button>
      </span>
    </li>
  );
}

function CustomerPreview({ accounts, type }: { accounts: PayoutAccount[]; type: AccountType }) {
  const visible = accounts.filter((a) => a.is_active);
  return (
    <aside className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4" aria-label="كما يراها العميل" data-testid="customer-preview">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold">كما يراها العميل</h2>
        <p className="text-xs text-muted-foreground">صفحة الدفع › التحويل اليدوي › {ACCOUNT_TAB_LABELS[type]}</p>
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="preview-empty">
          لا حساب نشط — لن يرى العميل أي {type === "bank" ? "حساب بنكي" : "محفظة"}.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {visible.map((a) => (
            <li key={a.id} className="flex flex-col gap-1 rounded-md bg-muted/50 p-3" data-testid="preview-row" data-id={a.id}>
              <span className="text-sm font-medium">{a.provider_name}</span>
              <span className="text-xs text-muted-foreground">باسم {a.account_name}</span>
              <Mono className="self-start break-all text-sm">{a.account_number}</Mono>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-muted-foreground">بعد التحويل يرفع العميل صورة الإيصال، ويبقى الطلب «بانتظار الدفع» حتى تؤكّده.</p>
    </aside>
  );
}

function AccountDialog({ account, type, onClose }: { account: PayoutAccount | null; type: AccountType; onClose: () => void }) {
  const save = useSaveAccount();
  const form = useForm<PayoutAccountInput>({
    resolver: zodResolver(payoutAccountInputSchema),
    defaultValues: {
      account_type: account?.account_type ?? type,
      provider_name: account?.provider_name ?? "",
      account_number: account?.account_number ?? "",
      account_name: account?.account_name ?? "",
      is_active: account?.is_active ?? true,
    },
  });
  const errors = form.formState.errors;
  const active = useWatch({ control: form.control, name: "is_active" });

  const submit = form.handleSubmit(async (values) => {
    try {
      const payload = account ? { provider_name: values.provider_name, account_number: values.account_number, account_name: values.account_name, is_active: values.is_active } : values;
      await save.mutateAsync({ id: account?.id ?? null, values: payload });
      toast.success(account ? "حُفظ الحساب" : "أُضيف الحساب");
      onClose();
    } catch (e) {
      if (isApiError(e) && e.fields) {
        let first: keyof PayoutAccountInput | null = null;
        for (const [k, msg] of Object.entries(e.fields)) {
          form.setError(k as keyof PayoutAccountInput, { message: msg[0] });
          first ??= k as keyof PayoutAccountInput;
        }
        if (first) form.setFocus(first);
      } else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="account-dialog">
        <DialogTitle>{account ? `تعديل «${account.provider_name}»` : "حساب استلام جديد"}</DialogTitle>
        <DialogDescription>يظهر للعميل كما تكتبه هنا عند اختيار التحويل اليدوي.</DialogDescription>
        <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
          <Field label="النوع" htmlFor="acc-type" error={errors.account_type?.message}>
            <NativeSelect id="acc-type" {...form.register("account_type")} disabled={Boolean(account)} className="h-11 md:h-8">
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="اسم البنك أو المحفظة" htmlFor="acc-provider" required error={errors.provider_name?.message}>
            <input id="acc-provider" {...form.register("provider_name")} className={inputClass} aria-invalid={Boolean(errors.provider_name)} data-testid="acc-provider" />
          </Field>
          <Field label="رقم الحساب / الآيبان / رقم المحفظة" htmlFor="acc-number" required error={errors.account_number?.message}>
            <input id="acc-number" dir="ltr" inputMode="text" autoComplete="off" {...form.register("account_number")} className={cn(inputClass, "font-mono")} aria-invalid={Boolean(errors.account_number)} data-testid="acc-number" />
          </Field>
          <Field label="اسم صاحب الحساب" htmlFor="acc-name" required error={errors.account_name?.message}>
            <input id="acc-name" {...form.register("account_name")} className={inputClass} aria-invalid={Boolean(errors.account_name)} data-testid="acc-name" />
          </Field>
          <label htmlFor="acc-active" className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span className="flex flex-col">
              <span className="font-medium">ظاهر للعميل</span>
              <span className="text-xs text-muted-foreground">الحساب المخفي يبقى في القائمة ولا يظهر في صفحة الدفع.</span>
            </span>
            <Switch id="acc-active" checked={active} onCheckedChange={(v) => form.setValue("is_active", v, { shouldDirty: true })} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" className="h-11 lg:h-9" disabled={save.isPending} data-testid="account-save">
              {save.isPending ? "يُحفظ…" : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ account, onClose }: { account: PayoutAccount; onClose: () => void }) {
  const del = useDeleteAccount();
  const save = useSaveAccount();
  const [blocked, setBlocked] = useState<string | null>(null);

  async function confirm() {
    try {
      await del.mutateAsync(account.id);
      toast.success(`حُذف «${account.provider_name}»`);
      onClose();
    } catch (e) {
      setBlocked(isApiError(e) ? e.userMessage : "تعذّر الحذف.");
    }
  }

  async function deactivate() {
    try {
      await save.mutateAsync({ id: account.id, values: { is_active: false } });
      toast.success(`«${account.provider_name}» مخفي عن العميل`);
      onClose();
    } catch (e) {
      toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm" data-testid="account-delete-dialog">
        <DialogTitle>حذف «{account.provider_name}»؟</DialogTitle>
        <DialogDescription>
          <Mono>{account.account_number}</Mono> — لن يظهر للعملاء بعد الحذف.
        </DialogDescription>
        {blocked ? (
          <p role="alert" className="rounded-lg border border-border p-3 text-sm text-destructive" data-testid="account-delete-blocked">
            {blocked}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" className="h-11 lg:h-9" onClick={onClose}>
            إلغاء
          </Button>
          {blocked ? (
            account.is_active ? (
              <Button className="h-11 lg:h-9" onClick={() => void deactivate()} disabled={save.isPending} data-testid="account-deactivate">
                تعطيل بدلاً من الحذف
              </Button>
            ) : null
          ) : (
            <Button variant="destructive" className="h-11 lg:h-9" onClick={() => void confirm()} disabled={del.isPending} data-testid="account-delete-ok">
              حذف
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
