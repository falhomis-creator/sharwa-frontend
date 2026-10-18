"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * `next-themes` with one change: when React renders the tree on the CLIENT instead of
 * hydrating it — the error document Next sends for a `notFound()` thrown before the shell
 * (an unknown product or tracking link: `<html id="__next_error__">`) — the anti-flash
 * script is created as a data block, so React does not warn «Encountered a script tag».
 * The server-rendered script is untouched (it already ran); `suppressHydrationWarning` on
 * the element covers the differing `type` during normal hydration.
 */
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} scriptProps={typeof window === "undefined" ? undefined : { type: "application/json" }} />;
}
