"use client";

import type { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * A flag as a switch with a one-line description — never an icon in a coloured circle
 * (M04 §11 I). The whole row is the label, so the touch target is the row (≥ 44px).
 */
export function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  children,
  testId,
}: {
  id: string;
  label: string;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  /** Conditional fields revealed under the row when it is on (FR-04.04: hidden, not disabled). */
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex flex-col gap-3 py-3">
      <label htmlFor={id} className={cn("flex min-h-11 cursor-pointer items-start gap-3", disabled && "cursor-not-allowed opacity-60")}>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium">{label}</span>
          {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
        </span>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="mt-0.5" data-testid={testId} />
      </label>
      {checked && children ? <div className="flex flex-col gap-3 ps-0 md:ps-4">{children}</div> : null}
    </div>
  );
}
