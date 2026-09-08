import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { brand } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: brand.fullName,
  description: brand.description,
  applicationName: brand.fullName,
  icons: {
    icon: brand.favicon,
  },
  openGraph: {
    title: brand.fullName,
    description: brand.description,
    siteName: brand.fullName,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: brand.fullName,
    description: brand.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brand.colors.light },
    { media: "(prefers-color-scheme: dark)", color: brand.colors.dark },
  ],
};

// The six brand colors are handed to CSS here, once. globals.css derives every
// other shade from them with color-mix(), so no component holds a literal color.
const brandVariables = `:root{
  --brand-primary:${brand.colors.primary};
  --brand-accent:${brand.colors.accent};
  --brand-positive:${brand.colors.positive};
  --brand-negative:${brand.colors.negative};
  --brand-dark:${brand.colors.dark};
  --brand-light:${brand.colors.light};
}`;

// Runs before first paint so the page never flashes the wrong theme. It has to be
// inline and blocking for that: anything deferred paints first and corrects after.
const themeBootstrap = `(function(){try{
  var t=localStorage.getItem('theme');
  if(!t)t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  document.documentElement.setAttribute('data-theme',t);
}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandVariables }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
