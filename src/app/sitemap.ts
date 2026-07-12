import type { MetadataRoute } from "next";
import { listArtists, listMovies, listSongs } from "@/lib/repository";
import { locales } from "@/lib/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const [{ items: songs }, artists, movies] = await Promise.all([
    listSongs({ limit: 50 }),
    listArtists(),
    listMovies(),
  ]);
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    entries.push(
      { url: `${base}/${locale}`, changeFrequency: "daily", priority: 1 },
      { url: `${base}/${locale}/about`, changeFrequency: "monthly", priority: 0.5 },
      { url: `${base}/${locale}/contact`, changeFrequency: "yearly", priority: 0.3 },
      ...songs.map((song) => ({
        url: `${base}/${locale}/lyrics/${song.slug}`,
        lastModified: new Date(song.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...artists.map((artist) => ({
        url: `${base}/${locale}/artist/${artist.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      })),
      ...movies.map((movie) => ({
        url: `${base}/${locale}/movie/${movie.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    );
  }
  return entries;
}
