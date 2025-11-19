import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lexstash - Modular Prompt Builder",
  description: "A local-first, visual prompt builder for the agentic age. Create, organize, and compile complex prompts with ease.",
  keywords: ["prompt engineering", "LLM", "AI", "visual builder", "local-first", "agentic"],
  authors: [{ name: "Lexstash Team" }],
  openGraph: {
    title: "Lexstash - Modular Prompt Builder",
    description: "Structure your prompts visually with nested containers and reusable blocks.",
    url: "https://benjipeng.github.io/lexstash",
    siteName: "Lexstash",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lexstash - The Modular Prompt Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lexstash - Modular Prompt Builder",
    description: "Structure your prompts visually with nested containers and reusable blocks.",
    images: ["/og-image.png"],
  },
};

import { AuthProvider } from '@/components/auth-provider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
