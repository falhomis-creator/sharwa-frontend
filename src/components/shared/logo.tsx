import { brand } from "@/features/landing/original.content";
import { cn } from "@/lib/utils";

/**
 * The platform's own wordmark, ported from `.brand` in
 * `tenants/templates/tenants/home.html`:
 *
 *     <a href="/" class="brand">🛍️ شروة <span>.</span></a>
 *
 * That is the real logo — there is no logo image file in either repository.
 * The full stop that closes it takes the one accent green; the name is body
 * ink like every other heading.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("sharwa-ink flex items-center gap-2 text-2xl font-black", className)}>
      <span aria-hidden>{brand.glyph}</span>
      <span>
        {brand.name} <span className="text-emerald-600">{brand.dot}</span>
      </span>
    </span>
  );
}
