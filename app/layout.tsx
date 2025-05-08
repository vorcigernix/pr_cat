import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "next-auth/react";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// We're using Noto Sans as a fallback since Playwrite CA isn't included in next/font/google
// In production, you would use the actual Playwrite CA font
const logoFont = Noto_Sans({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "PR Cat - Team Collaboration Metrics",
  description: "Boost your team's collaboration and shipping velocity with metrics that matter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${logoFont.variable} antialiased`}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
