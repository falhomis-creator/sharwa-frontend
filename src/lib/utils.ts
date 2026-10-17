import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Canonical class merger (components.json → aliases.utils).
 *
 * `twMerge` matters beyond cosmetics here: variant classes baked into
 * `src/components/ui/*` (e.g. `rounded-lg`, `h-8`) must lose to a caller's
 * `className` override (`rounded-md`, `h-12`) deterministically rather than
 * by stylesheet order.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
