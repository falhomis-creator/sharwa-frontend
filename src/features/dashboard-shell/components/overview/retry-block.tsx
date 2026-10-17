"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Per-block error state with a retry that re-runs the server read (M03 §6). */
export function RetryBlock({ title, description }: { title: string; description?: string }) {
  const router = useRouter();
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-border p-6">
      <p className="text-base font-medium">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      <Button variant="outline" size="lg" className="h-11" onClick={() => router.refresh()}>
        إعادة المحاولة
      </Button>
    </div>
  );
}
