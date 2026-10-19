"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { AccessGate } from "@/components/shared/access-gate";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { applyFieldErrors } from "@/features/settings/hooks/use-section-save";
import { roleFormSchema, type Permission, type Role, type RoleForm } from "@/features/staff/schemas";
import { usePermissions, useRole, useStaffWrites } from "@/features/staff/api";
import { dangerButton, outlineButton, primaryButton } from "@/features/staff/components/bits";

/**
 * `/dashboard/staff/roles/new` and `/roles/[id]` (M18 US-18.3, FR-18.03/04): the permission
 * matrix grouped by category from `GET /permissions`, «تحديد الكل» per group, the Mono
 * counter «n من 35», a `reports.view` suggestion when a report is ticked, a warning above
 * 20% discount. System roles are read-only with the clone link (`?from=<id>` prefills).
 */
export function RoleFormScreen({ id }: { id: number | null }) {
  return (
    <AccessGate feature="staff_rbac" permission="staff.view">
      <RoleFormLoader id={id} />
    </AccessGate>
  );
}

function RoleFormLoader({ id }: { id: number | null }) {
  const search = useSearchParams();
  const from = id === null && search.get("from") ? Number(search.get("from")) : null;
  const permissions = usePermissions();
  const role = useRole(id ?? from);

  if (permissions.isPending || (role.isPending && (id !== null || from !== null))) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (permissions.error || (role.error && id !== null)) {
    const err = permissions.error ?? role.error;
    return <ErrorState error={err} onRetry={() => void (permissions.refetch(), role.refetch())} title={isApiError(err) && err.status === 404 ? "الدور غير موجود" : undefined} />;
  }
  const base = role.data ?? null;
  return <RoleFormView key={`${id}-${from}`} id={id} permissions={permissions.data} role={id !== null ? base : null} clone={id === null ? base : null} />;
}

function RoleFormView({ id, permissions, role, clone }: { id: number | null; permissions: Permission[]; role: Role | null; clone: Role | null }) {
  const router = useRouter();
  const writes = useStaffWrites();
  const { canPermission } = useAccess();
  const canManage = canPermission("staff.manage_roles");
  const readOnly = Boolean(role?.is_system_role) || !canManage;
  const seed = role ?? clone;
  const form = useForm<RoleForm>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: role ? role.name : clone ? `${clone.name} (مخصص)` : "", max_discount_percent: seed?.max_discount_percent ? String(Number(seed.max_discount_percent)) : "", permission_codes: seed?.permission_codes ?? [] },
  });
  const { control, register, handleSubmit, setValue, formState } = form;
  const codes = useWatch({ control, name: "permission_codes" });
  const discount = useWatch({ control, name: "max_discount_percent" });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [inUse, setInUse] = useState<Array<{ id: number; full_name: string }> | null>(null);
  const [suggested, setSuggested] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) map.set(p.category, [...(map.get(p.category) ?? []), p]);
    return [...map.entries()];
  }, [permissions]);
  const selected = new Set(codes);
  const total = permissions.length;

  // FR-18.04: a report permission without `reports.view` cannot be used — suggest it once.
  const needsReportsView = codes.some((c) => c.startsWith("reports.") && c !== "reports.view") && !selected.has("reports.view");
  // Render-time reset (no effect): the dismissal lasts until the condition clears and returns.
  const [prevNeeds, setPrevNeeds] = useState(needsReportsView);
  if (prevNeeds !== needsReportsView) {
    setPrevNeeds(needsReportsView);
    setSuggested(false);
  }

  const toggle = (code: string, on: boolean) => {
    const next = on ? [...new Set([...codes, code])] : codes.filter((c) => c !== code);
    setValue("permission_codes", next, { shouldDirty: true, shouldValidate: formState.isSubmitted });
  };
  const toggleGroup = (list: Permission[], on: boolean) => {
    const ids = list.map((p) => p.code);
    const next = on ? [...new Set([...codes, ...ids])] : codes.filter((c) => !ids.includes(c));
    setValue("permission_codes", next, { shouldDirty: true, shouldValidate: formState.isSubmitted });
  };

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await writes.saveRole.mutateAsync({ id, body: { name: values.name, max_discount_percent: values.max_discount_percent === "" ? null : values.max_discount_percent, permission_codes: values.permission_codes } });
      toast.success(id === null ? `أُنشئ الدور «${saved.name}».` : "حُفظ الدور.");
      router.push("/dashboard/staff/roles");
    } catch (e) {
      if (!applyFieldErrors(form, e)) toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  });

  const remove = async () => {
    if (id === null) return;
    try {
      await writes.deleteRole.mutateAsync(id);
      toast.success("حُذف الدور.");
      router.push("/dashboard/staff/roles");
    } catch (e) {
      const staff = isApiError(e) && typeof e.body === "object" && e.body && "staff" in e.body ? (e.body as { staff: Array<{ id: number; full_name: string }> }).staff : null;
      if (staff) setInUse(staff);
      else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف.");
      setDeleteOpen(false);
    }
  };

  const title = role ? role.name : clone ? `نسخة من «${clone.name}»` : "دور مخصص جديد";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/staff/roles" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> كل الأدوار
      </Link>
      <PageHeader
        eyebrow={role ? `#${role.id}` : undefined}
        title={title}
        description={role?.is_system_role ? "دور نظامي — للقراءة فقط. انسخه لتعديل الصلاحيات." : "اختر الصلاحيات التي يحصل عليها كل من يُعيَّن بهذا الدور."}
        actions={
          role?.is_system_role ? (
            <Link href={`/dashboard/staff/roles/new?from=${role.id}`} className={primaryButton} data-testid="clone-role">
              نسخ كدور مخصص
            </Link>
          ) : null
        }
      />
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6" noValidate data-testid="role-form">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم الدور" htmlFor="role-name" required error={formState.errors.name?.message}>
            <input id="role-name" className={inputClass} readOnly={readOnly} aria-invalid={Boolean(formState.errors.name)} {...register("name")} />
          </Field>
          <Field
            label="أقصى نسبة خصم"
            htmlFor="role-discount"
            error={formState.errors.max_discount_percent?.message}
            hint={
              discount !== "" && Number(discount) > 20 ? (
                <span className="text-warning">نسبة مرتفعة — أكثر من 20% تتجاوز حد مدير الفرع.</span>
              ) : (
                "فارغ = بلا حد؛ الخصم فوقه يحتاج موافقة."
              )
            }
          >
            <div className="relative">
              <input id="role-discount" inputMode="decimal" dir="ltr" placeholder="20" className={`${numericInputClass} pe-7`} readOnly={readOnly} aria-invalid={Boolean(formState.errors.max_discount_percent)} {...register("max_discount_percent")} data-testid="role-discount" />
              <span aria-hidden className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center font-mono text-sm text-muted-foreground">
                %
              </span>
            </div>
          </Field>
        </div>

        <Controller
          control={control}
          name="permission_codes"
          render={() => (
            <fieldset className="flex flex-col gap-4">
              <legend className="flex w-full items-baseline justify-between gap-2 pb-2 text-sm">
                <span className="font-medium">الصلاحيات</span>
                <span className="text-muted-foreground">
                  <Mono data-testid="perm-counter">{codes.length}</Mono> من <Mono>{total}</Mono>
                </span>
              </legend>
              {formState.errors.permission_codes ? (
                <p role="alert" className="text-xs text-destructive">
                  {formState.errors.permission_codes.message}
                </p>
              ) : null}
              {needsReportsView && !suggested ? (
                <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm" data-testid="reports-suggestion">
                  <span>تقارير بلا «عرض التقارير» لا تظهر — أضفها؟</span>
                  <div className="flex gap-1">
                    <button type="button" className="h-11 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground lg:h-8" onClick={() => setSuggested(true)}>
                      لاحقاً
                    </button>
                    <button type="button" className={outlineButton} disabled={readOnly} onClick={() => toggle("reports.view", true)} data-testid="add-reports-view">
                      إضافة «عرض التقارير»
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {groups.map(([category, list]) => {
                  const on = list.filter((p) => selected.has(p.code)).length;
                  const all = on === list.length;
                  return (
                    <div key={category} className="rounded-lg border border-border" data-testid={`perm-group-${category}`}>
                      <label className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-2 border-b border-border px-3 text-sm", readOnly && "cursor-default")}>
                        <span className="font-medium">
                          {category} <Mono className="text-xs text-muted-foreground">{on}/{list.length}</Mono>
                        </span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          تحديد الكل
                          <Checkbox checked={all} indeterminate={on > 0 && !all} disabled={readOnly} onCheckedChange={(c) => toggleGroup(list, c === true)} aria-label={`تحديد كل صلاحيات ${category}`} />
                        </span>
                      </label>
                      <ul>
                        {list.map((p) => (
                          <li key={p.code}>
                            <label className={cn("flex min-h-11 cursor-pointer items-center gap-3 px-3 py-1.5 text-sm hover:bg-muted/40", readOnly && "cursor-default hover:bg-transparent")}>
                              <Checkbox checked={selected.has(p.code)} disabled={readOnly} onCheckedChange={(c) => toggle(p.code, c === true)} data-testid={`perm-${p.code}`} />
                              <span className="flex min-w-0 flex-col">
                                <span>{p.name}</span>
                                <Mono className="text-[11px] text-muted-foreground">{p.code}</Mono>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          )}
        />

        {!readOnly ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            {role && !role.is_system_role ? (
              <button type="button" className={`${dangerButton} me-auto`} onClick={() => setDeleteOpen(true)} data-testid="delete-role">
                حذف الدور
              </button>
            ) : null}
            <Link href="/dashboard/staff/roles" className={outlineButton}>
              إلغاء
            </Link>
            <button type="submit" className={primaryButton} disabled={formState.isSubmitting} data-testid="save-role">
              {id === null ? "إنشاء الدور" : "حفظ"}
            </button>
          </div>
        ) : !canManage && !role?.is_system_role ? (
          <p className="text-xs text-muted-foreground">عرض فقط — تعديل الأدوار يحتاج صلاحية «إدارة الأدوار».</p>
        ) : null}
      </form>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>حذف الدور «{role?.name}»؟</DialogTitle>
          <DialogDescription>لا يمكن حذف دور معيَّن لموظفين — أعد تعيينهم أولاً.</DialogDescription>
          <DialogFooter>
            <button type="button" className={outlineButton} onClick={() => setDeleteOpen(false)}>
              إلغاء
            </button>
            <button type="button" className={dangerButton} onClick={() => void remove()} disabled={writes.deleteRole.isPending} data-testid="confirm-delete-role">
              حذف
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inUse !== null} onOpenChange={(o) => !o && setInUse(null)}>
        <DialogContent className="sm:max-w-sm" data-testid="role-in-use">
          <DialogTitle>الدور قيد الاستخدام</DialogTitle>
          <DialogDescription>هؤلاء الموظفون معيَّنون بهذا الدور. غيّر دورهم من صفحة كل موظف ثم أعد المحاولة.</DialogDescription>
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {(inUse ?? []).map((s) => (
              <li key={s.id} className="flex min-h-11 items-center justify-between gap-2 px-3">
                <span>{s.full_name}</span>
                <Link href={`/dashboard/staff/${s.id}?tab=assignments`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                  التعيينات
                </Link>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <button type="button" className={primaryButton} onClick={() => setInUse(null)}>
              فهمت
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
