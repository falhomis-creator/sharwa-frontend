import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { StoreConfig } from "@/features/storefront/schemas/config";
import { storeFontStack } from "@/features/storefront/theme/fonts";
import { buildStoreTheme } from "@/features/storefront/theme/tokens";

/**
 * The storefront group root (T088). Writes the merchant's tokens ONCE, as inline custom
 * properties on this element (constitution VII, M09 FR-09.03). `(dashboard)` and
 * `(marketing)` never render it, so they stay zinc (US-09.2 Independent Test).
 *
 * `data-preset` / `data-style` / `data-density` let `globals.css` tune spacing per design
 * style without a single colour literal. `data-store-theme` also opts the subtree out of the
 * `dark:` variant: the storefront is painted in the merchant's colours whatever the visitor's
 * system theme is (research R-09), and a dark preset is a dark *palette*, not `.dark`.
 */
export function StoreThemeRoot({
  config,
  store,
  className,
  children,
}: {
  config: StoreConfig;
  store: string;
  className?: string;
  children: ReactNode;
}) {
  const theme = buildStoreTheme(config);
  const style = {
    ...theme.vars,
    "--store-font-heading": storeFontStack(theme.headingFont),
    "--store-font-body": storeFontStack(theme.bodyFont),
    fontFamily: "var(--store-font-body)",
    // Form controls and scrollbars follow the merchant's ground, not the visitor's OS theme.
    colorScheme: theme.scheme,
  } as CSSProperties;

  // Dialogs, sheets, drawers and menus are PORTALED to <body>, outside this element. The same
  // tokens are therefore also declared on <body> for this document, so the cart sheet and the
  // OTP dialog wear the merchant's palette and fonts too (and `globals.css` keeps `dark:` off
  // everything inside a body that holds a store root).
  const bodyRule = `body{${Object.entries(theme.vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(
      ";",
    )};--store-font-heading:${storeFontStack(theme.headingFont)};--store-font-body:${storeFontStack(theme.bodyFont)};font-family:var(--store-font-body);color-scheme:${theme.scheme};background-color:var(--background);color:var(--foreground)}`;

  return (
    <>
      <style href={`store-theme-${store}`} precedence="high">
        {bodyRule}
      </style>
      <div
        data-store-theme
        data-store={store}
        data-preset={theme.preset}
        data-style={theme.style}
        data-density={theme.density}
        data-scheme={theme.scheme}
        style={style}
        className={cn(
          "flex min-h-dvh flex-1 flex-col bg-background text-foreground",
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
