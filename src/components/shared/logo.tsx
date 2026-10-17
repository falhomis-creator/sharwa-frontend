import { brand } from "@/features/landing/original.content";
import { cn } from "@/lib/utils";

/**
 * The platform's own wordmark, ported from `.brand` in
 * `tenants/templates/tenants/home.html`:
 *
 *     <a href="/" class="brand">🛍️ شروة <span>.</span></a>
 *
 * That is the real logo — an emoji bag, the name, and a teal full stop. There
 * is no logo image file anywhere in either repository, so this is not a
 * placeholder standing in for one; it IS the mark as the product ships it.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("sharwa-ink flex items-center gap-2 text-2xl font-black", className)}>
      <span aria-hidden>{brand.glyph}</span>
      <span>
        {brand.name} <span className="sharwa-primary">{brand.dot}</span>
      </span>
    </span>
  );
}
