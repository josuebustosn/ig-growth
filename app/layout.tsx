import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The brand palette reaches CSS from lib/brand.ts through these three custom
// properties; globals.css derives --primary/--accent from them, because a stylesheet
// cannot read process.env and the values have to be handed to it from somewhere.
// They go inline on the <html> element rather than into a <style> tag on purpose:
// an inline style wins over any stylesheet rule no matter what order Next emits its
// CSS in, so there is no chance of the palette losing to globals.css on some builds.
const brandTokens = {
  "--brand-primary": brand.colors.primary,
  "--brand-accent": brand.colors.accent,
  "--brand-primary-rgb": brand.colors.primaryRgb,
} as React.CSSProperties;

export const metadata: Metadata = {
  title: brand.name,
  description: brand.description,
  icons: {
    icon: brand.favicon,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning style={brandTokens}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var theme = localStorage.getItem('theme');
            if (!theme) theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
          })();
        `}} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
