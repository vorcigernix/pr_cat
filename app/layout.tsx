import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider"
import { TeamFilterProvider } from "@/hooks/use-team-filter";
import { SessionProvider } from "next-auth/react";
import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
import "./globals.css";

// Optimized font loading with display swap
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// We're using Noto Sans as a fallback since Playwrite CA isn't included in next/font/google
// In production, you would use the actual Playwrite CA font
const logoFont = Noto_Sans({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "PR Cat - Open Source Engineering Analytics",
    template: "%s | PR Cat"
  },
  description: "Self-hosted GitHub PR analytics for engineering teams. Transform development metrics into actionable insights with complete transparency and control.",
  keywords: ["engineering analytics", "github", "pull requests", "team metrics", "open source", "self-hosted"],
  authors: [{ name: "PR Cat Team" }],
  creator: "PR Cat",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://prcat.dev",
    siteName: "PR Cat",
    title: "PR Cat - Open Source Engineering Analytics",
    description: "Self-hosted GitHub PR analytics for engineering teams",
  },
  twitter: {
    card: "summary_large_image",
    title: "PR Cat - Open Source Engineering Analytics", 
    description: "Self-hosted GitHub PR analytics for engineering teams",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${logoFont.variable} antialiased`}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="pr-cat-theme"
            enableColorScheme
          >
            <TeamFilterProvider>
              {children}
            </TeamFilterProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
