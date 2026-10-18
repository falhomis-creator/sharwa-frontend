import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleFormScreen } from "@/features/staff/components/role-form";

export const metadata: Metadata = { title: "دور مخصص جديد", robots: { index: false, follow: false } };

/** `/dashboard/staff/roles/new` — M18 US-18.3 (T112); `?from=<id>` clones a system role. */
export default function NewRolePage() {
  return (
    <Suspense>
      <RoleFormScreen id={null} />
    </Suspense>
  );
}
