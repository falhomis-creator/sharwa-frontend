import Link from "next/link";
import { cacheLife } from "next/cache";
import { Mono } from "@/components/shared/mono";
import { footer } from "@/features/landing/landing.content";

/**
 * `cacheComponents` treats a bare `new Date()` as a blocking read of current
 * time during prerender. The copyright year is cached for a day instead, which
 * is both correct and accurate to the hour it matters.
 */
async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/**
 * T040 — three link columns and a rights line, separated by a single 1px top
 * rule. No colored social badges, no newsletter box.
 */
export async function SiteFooter() {
  const year = await currentYear();

  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-5">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold tracking-tight">شروه</span>
              <Mono className="text-[0.7rem] text-muted-foreground">sharwa</Mono>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              منصة تجارة إلكترونية عربية: متجر، لوحة تحكم، نقطة بيع، محفظة، وشحن.
            </p>
          </div>

          {footer.columns.map((column) => (
            <nav key={column.title} aria-label={column.title} className="lg:col-span-2">
              <h2 className="text-sm font-medium text-foreground">{column.title}</h2>
              <ul className="mt-4 flex flex-col gap-1">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith("#") ? (
                      <a
                        href={link.href}
                        className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <Mono>{year}</Mono> · {footer.legal}
        </div>
      </div>
    </footer>
  );
}
