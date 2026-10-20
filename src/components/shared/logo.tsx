import { brand } from "@/features/landing/original.content";
import { cn } from "@/lib/utils";

/**
 * The platform's own wordmark, ported from `.brand` in
 * `tenants/templates/tenants/home.html`:
 *
 *     <a href="/" class="brand">🛍️ شروة <span>.</span></a>
 *
 * That is the real logo — there is no logo image file in either repository.
 *
 * The name inherits its color so one lockup can sit on the light ground and
 * on the hero video; the header owns that choice. The full stop keeps the
 * accent green, one step lighter over footage, via `dotClassName`.
 */
export function Logo({
  className,
  dotClassName = "text-emerald-600",
}: {
  className?: string;
  dotClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2 text-2xl font-black", className)}>
      <span aria-hidden>{brand.glyph}</span>
      <span>
        {brand.name} <span className={dotClassName}>{brand.dot}</span>
      </span>
    </span>
  );
}
