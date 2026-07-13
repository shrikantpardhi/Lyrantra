import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
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
    url: "/en",
    siteName: "LyricsPro",
    title: "LyricsPro — Every song tells a story",
    description: "Reviewed multilingual lyrics, translations, credits, and official listening links.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "LyricsPro" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LyricsPro",
    description: "Lyrics, translations, and the stories behind songs.",
    images: ["/opengraph-image"],
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
