"use client";

import { parseAsInteger, useQueryState } from "nuqs";
import { ForbiddenState } from "@/components/shared/access-gate";
import { PageHeader } from "@/components/shared/page-header";
import { useProcurementAccess } from "@/features/procurement/components/bits";
import { PoEditor } from "@/features/procurement/components/po-editor";

/** `/dashboard/purchase-orders/new[?supplier=<id>]` (US-23.2) — `suppliers.manage` only. */
export function NewPoScreen() {
  const { canManage } = useProcurementAccess();
  const [supplier] = useQueryState("supplier", parseAsInteger);
  if (!canManage) return <ForbiddenState description="إنشاء أوامر الشراء لمن يحمل صلاحية إدارة الموردين." />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="أمر شراء جديد" description="احفظه مسودة أو أرسله للموافقة مباشرة." />
      <PoEditor initial={null} presetSupplier={supplier} />
    </div>
  );
}
