"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon, MinusIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Checkbox (Base UI) — 16px box; the hit area is widened by the caller's label/cell. */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "group/checkbox peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-foreground data-checked:bg-foreground data-checked:text-background data-indeterminate:border-foreground data-indeterminate:bg-foreground data-indeterminate:text-background data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <CheckIcon className="size-3 group-data-indeterminate/checkbox:hidden" strokeWidth={2.5} aria-hidden />
        <MinusIcon className="hidden size-3 group-data-indeterminate/checkbox:block" strokeWidth={2.5} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
