import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "LyricsPro — Lyrics, translations and song stories",
    template: "%s | LyricsPro",
  },
  description:
    "Discover accurate song lyrics, translations, transliterations, credits, stories, and official listening links.",
  applicationName: "LyricsPro",
  keywords: ["lyrics", "song lyrics", "translations", "artists", "music"],
  authors: [{ name: "LyricsPro Editorial" }],
  creator: "LyricsPro",
  openGraph: {
    type: "website",
    siteName: "LyricsPro",
    title: "LyricsPro — Every song tells a story",
    description: "Reviewed multilingual lyrics, translations, credits, and official listening links.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LyricsPro",
    description: "Lyrics, translations, and the stories behind songs.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
