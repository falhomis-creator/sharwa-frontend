import { TenantNotice } from "@/features/tenant/components/tenant-notice";
import { platformOrigin } from "@/features/tenant/origin";

/** 404 boundary for the store origin — `notFound()` from the group root lands here. */
export default function StorefrontNotFound() {
  return (
    <TenantNotice
      status={404}
      title="لم نجد متجراً بهذا العنوان"
      body="تحقّق من العنوان الذي كتبته، أو أنشئ متجرك الآن."
    >
      <a
        href={`${platformOrigin()}/register`}
        className="inline-flex h-11 w-fit items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        أنشئ متجرك على شروة
      </a>
    </TenantNotice>
  );
}
