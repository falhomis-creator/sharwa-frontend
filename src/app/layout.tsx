import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
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
    default: "شروه",
    template: "%s · شروه",
  },
  description: "منصة شروه للتجارة الإلكترونية — أنشئ متجرك وابدأ البيع في أقل من دقيقة.",
  applicationName: "شروه",
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: "شروه",
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
