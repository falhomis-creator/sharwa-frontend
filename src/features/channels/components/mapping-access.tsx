"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { useCategoryMapping, useSaveAccess, useSaveMapping, useStaffAccess, useTiktokCategories } from "@/features/channels/api";
import { ACCESS_CHANNELS, ACCESS_SHORT, type AccessRow, type MappingRow } from "@/features/channels/schemas";
import { ChannelsShell } from "@/features/channels/components/channels-shell";

/** `/dashboard/channels/social/tiktok-categories` (US-27.5): store category → TikTok category. */
export function TiktokCategoriesScreen() {
  const mapping = useCategoryMapping();
  const external = useTiktokCategories();
  return (
    <ChannelsShell title="ربط فئات تيك توك" description="تشترط TikTok Shop فئة من شجرتها لكل منتج؛ اربط كل فئة في متجرك بما يقابلها.">
      {mapping.isLoading || external.isLoading ? (
        <Skeleton className="h-64" />
      ) : !mapping.data || !external.data ? (
        <ErrorState
          error={mapping.error ?? external.error}
          onRetry={() => {
            void mapping.refetch();
            void external.refetch();
          }}
        />
      ) : mapping.data.length === 0 ? (
        <EmptyState title="لا فئات في متجرك بعد" description="أنشئ فئات المنتجات أولاً ثم اربطها هنا." />
      ) : (
        <MappingForm key={mapping.data.map((m) => `${m.category_id}:${m.external_category_id ?? ""}`).join("|")} mapping={mapping.data} external={external.data} />
      )}
    </ChannelsShell>
  );
}

function MappingForm({ mapping, external }: { mapping: MappingRow[]; external: Array<{ id: string; name: string }> }) {
  const save = useSaveMapping();
  const [draft, setDraft] = useState<Record<number, string>>(() => Object.fromEntries(mapping.map((m) => [m.category_id, m.external_category_id ?? ""])));
  const dirty = mapping.some((m) => (m.external_category_id ?? "") !== (draft[m.category_id] ?? ""));
  const unmapped = Object.values(draft).filter((v) => !v).length;
  return (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            غير مربوطة: <Mono className="text-foreground">{unmapped}</Mono> من <Mono>{mapping.length}</Mono> — منتجاتها لا تُرسَل إلى تيك توك.
          </p>
          <ul className="flex flex-col divide-y divide-border border-y border-border" data-testid="mapping-rows">
            {mapping.map((m) => (
              <li key={m.category_id} className="flex flex-col gap-2 py-2.5 md:flex-row md:items-center md:gap-4">
                <span className="text-sm md:w-56 md:shrink-0">{m.category_name}</span>
                <NativeSelect aria-label={`فئة تيك توك لـ ${m.category_name}`} value={draft[m.category_id] ?? ""} onChange={(e) => setDraft({ ...draft, [m.category_id]: e.target.value })} className="h-11 md:max-w-sm lg:h-8" data-testid="mapping-select">
                  <option value="">— غير مربوطة —</option>
                  {external.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </NativeSelect>
              </li>
            ))}
          </ul>
          <Button
            className="h-11 self-start lg:h-9"
            disabled={!dirty || save.isPending}
            data-testid="mapping-save"
            onClick={() =>
              save.mutate(
                mapping.map((m) => ({ category_id: m.category_id, external_category_id: draft[m.category_id] || null })),
                { onSuccess: () => toast.success("حُفظ ربط الفئات."), onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.") },
              )
            }
          >
            {save.isPending ? "جارٍ الحفظ…" : "حفظ الربط"}
          </Button>
        </div>
  );
}

/** `/dashboard/channels/social/staff-access` (US-27.6): staff × channels, view / reply, autosave. */
export function StaffAccessScreen() {
  const q = useStaffAccess();
  const save = useSaveAccess();
  const cell = (staffId: number, code: (typeof ACCESS_CHANNELS)[number]) => q.data?.rows.find((r) => r.staff_id === staffId && r.channel_code === code);
  const toggle = (row: AccessRow, field: "can_view" | "can_reply", value: boolean) => {
    const next: AccessRow = { ...row, [field]: value };
    if (field === "can_view" && !value) next.can_reply = false;
    if (field === "can_reply" && value) next.can_view = true;
    save.mutate([next], { onSuccess: () => toast.success("حُفظ وصول الموظف."), onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ — أُعيدت القيمة السابقة.") });
  };
  return (
    <ChannelsShell title="وصول الموظفين للقنوات" description="لكل موظف وقناة: العرض في صندوق المحادثات، والردّ. يُحفظ كل تغيير فوراً.">
      {q.isLoading ? (
        <Skeleton className="h-64" />
      ) : !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.staff.length === 0 ? (
        <EmptyState title="لا موظفين نشطين" description="أضف موظفين من قسم الموظفين أولاً." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm" data-testid="access-matrix">
            <caption className="sr-only">مصفوفة وصول الموظفين للقنوات</caption>
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="py-2 text-start font-normal">الموظف</th>
                {ACCESS_CHANNELS.map((c) => (
                  <th key={c} className="py-2 text-start font-normal">
                    {ACCESS_SHORT[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.data.staff.map((s) => (
                <tr key={s.id} className="border-b border-border" data-testid="access-row" data-staff={s.id}>
                  <td className="py-2 pe-3 font-medium">{s.name}</td>
                  {ACCESS_CHANNELS.map((c) => {
                    const row = cell(s.id, c);
                    if (!row) return <td key={c} className="text-muted-foreground">—</td>;
                    return (
                      <td key={c} className="py-1 pe-3">
                        <div className="flex gap-3">
                          <label className="flex min-h-11 cursor-pointer items-center gap-1.5 lg:min-h-8">
                            <input type="checkbox" className="size-4 accent-foreground" checked={row.can_view} onChange={(e) => toggle(row, "can_view", e.target.checked)} data-testid={`view-${c}`} />
                            عرض
                          </label>
                          <label className="flex min-h-11 cursor-pointer items-center gap-1.5 lg:min-h-8">
                            <input type="checkbox" className="size-4 accent-foreground" checked={row.can_reply} onChange={(e) => toggle(row, "can_reply", e.target.checked)} data-testid={`reply-${c}`} />
                            ردّ
                          </label>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChannelsShell>
  );
}
