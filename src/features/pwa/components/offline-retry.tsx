"use client";

import { Button } from "@/components/ui/button";

export function OfflineRetry() {
  return (
    <Button className="h-11 w-fit px-5" onClick={() => window.location.reload()}>
      إعادة المحاولة
    </Button>
  );
}
