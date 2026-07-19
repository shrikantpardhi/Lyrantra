import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Lyrantra — Lyrics, translations and song stories",
    template: "%s | Lyrantra",
  },
  description:
    "Discover accurate song lyrics, translations, transliterations, credits, stories, and official listening links.",
  applicationName: "Lyrantra",
  keywords: ["lyrics", "song lyrics", "song meaning", "translations", "artists", "music"],
  authors: [{ name: "Lyrantra Editorial" }],
  creator: "Lyrantra",
  openGraph: {
    type: "website",
    url: "/en",
    siteName: "Lyrantra",
    title: "Lyrantra — Every song tells a story",
    description: "Reviewed multilingual lyrics, translations, credits, and official listening links.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Lyrantra" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lyrantra",
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
