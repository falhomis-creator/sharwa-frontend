import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TOKENS } from "@/lib/tokens";
import "./globals.css";

// Self-hosted (see src/assets/fonts/README.md). UI text: IBM Plex Sans Arabic; numbers: Geist Mono.
const ibmPlexArabic = localFont({
  variable: "--font-ibm-plex-arabic",
  display: "swap",
  src: [
    { path: "../assets/fonts/ibm-plex-sans-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/ibm-plex-sans-arabic-500.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/ibm-plex-sans-arabic-600.woff2", weight: "600", style: "normal" },
  ],
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});

// Mono IS critical again: the hero now carries the dashboard mockup, whose KPI
// numeral is the page's LCP element. With `preload: false` that numeral painted
// in the fallback and only settled when Mono arrived, so LCP was recorded at the
// swap (5.1s). Preloaded, the first paint of the LCP element is the final one.
const geistMono = localFont({
  variable: "--font-geist-mono",
  display: "swap",
  src: [
    { path: "../assets/fonts/geist-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/geist-mono-500.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/geist-mono-600.woff2", weight: "600", style: "normal" },
  ],
  fallback: ["Cascadia Mono", "Consolas", "ui-monospace", "monospace"],
});

const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "localhost";
const protocol = baseDomain === "localhost" ? "http" : "https";
const port = baseDomain === "localhost" ? ":3000" : "";

export const metadata: Metadata = {
  metadataBase: new URL(`${protocol}://${baseDomain}${port}`),
  title: {
    default: "شروة",
    template: "%s",
  },
  description: "منصة شروة للتجارة الإلكترونية — أنشئ متجرك وابدأ البيع في أقل من دقيقة.",
  applicationName: "شروة",
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: "شروة",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: TOKENS.background.light },
    { media: "(prefers-color-scheme: dark)", color: TOKENS.background.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      // globals.css sets `scroll-behavior: smooth`; this tells Next to switch it off during
      // route transitions so a new page starts at the top instantly (Next.js «missing-data-scroll-behavior»).
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${ibmPlexArabic.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
